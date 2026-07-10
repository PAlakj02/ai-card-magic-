// React context that streams Firebase auth state and Firestore user data to every screen
'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { fetchUserDocument, refreshStreak, type FirestoreUser } from '@/lib/authActions'

interface AuthContextValue {
  firebaseUser: User | null
  userData:     FirestoreUser | null
  loading:      boolean
  setUserData:  (data: FirestoreUser) => void
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userData:     null,
  loading:      true,
  setUserData:  () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [userData, setUserData]         = useState<FirestoreUser | null>(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        // On a brand-new sign-up, this fires as soon as the auth account exists — which
        // can be before signUp()'s Firestore user-doc write has actually committed. A
        // stray null read here would otherwise clobber the correct data that
        // AuthScreen's onAuth() call is about to set (or just did), flashing a fallback
        // display name. Retry briefly instead of trusting an immediate null.
        let data = await fetchUserDocument(user.uid)
        for (let attempt = 0; !data && attempt < 5; attempt++) {
          await new Promise(r => setTimeout(r, 300))
          data = await fetchUserDocument(user.uid)
        }
        if (data) {
          // Refresh streak on every session start (handles both fresh logins and page reloads)
          const withStreak = await refreshStreak(user.uid, data)
          setUserData(withStreak)
        } else {
          setUserData(null)
        }
      } else {
        setUserData(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ firebaseUser, userData, loading, setUserData }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
