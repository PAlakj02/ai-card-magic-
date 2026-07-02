// Sign-in and sign-up screen shown to unauthenticated users before they access the dashboard
'use client'
import { useState } from 'react'
import { signIn, signUp, type FirestoreUser } from '@/lib/authActions'

interface Props {
  onAuth: (userData: FirestoreUser) => void
}

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode]       = useState<'signin' | 'signup'>('signin')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const userData = mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password)
      onAuth(userData)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      const msg  = code
        ? code.replace('auth/', '').replace(/-/g, ' ')
        : 'Authentication failed. Please try again.'
      setError(msg.charAt(0).toUpperCase() + msg.slice(1) + '.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid #2a3038',
    background: '#0d1014',
    color: 'white',
    fontSize: 14,
    outline: 'none',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0d1014' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-8"
        style={{ background: '#171c24', border: '1px solid #2a3038' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-3xl"
            style={{ background: 'linear-gradient(135deg,#18e5f0,#b86cff)' }}
          >
            🃏
          </div>
          <h1 className="text-2xl font-bold text-white">AI Card Magic</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
            Master sleight-of-hand with AI coaching
          </p>
        </div>

        {/* Mode toggle */}
        <div
          className="flex rounded-xl p-1 mb-6"
          style={{ background: '#0d1014', border: '1px solid #2a3038' }}
        >
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                mode === m
                  ? { background: 'linear-gradient(135deg,#18e5f0,#b86cff)', color: 'white' }
                  : { color: '#6b7280' }
              }
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {mode === 'signup' && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              style={inputStyle}
            />
          )}

          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border:     '1px solid rgba(239,68,68,0.3)',
                color:      '#f87171',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#18e5f0,#b86cff)' }}
          >
            {loading
              ? 'Please wait…'
              : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
