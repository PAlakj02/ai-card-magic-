'use client'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import AuthScreen from '@/components/auth/AuthScreen'
import Sidebar from '@/components/layout/Sidebar'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import HomeScreen from '@/components/screens/HomeScreen'
import VideoLibraryScreen from '@/components/screens/VideoLibraryScreen'
import CoursePathScreen from '@/components/screens/CoursePathScreen'
import PracticeScreen from '@/components/screens/PracticeScreen'
import VideoLessonScreen from '@/components/screens/VideoLessonScreen'
import ProfileScreen from '@/components/screens/ProfileScreen'
import FeedbackScreen from '@/components/screens/FeedbackScreen'
import { getFirstIncompleteModule } from '@/data/mockData'
import type { Screen } from '@/data/mockData'
import type { FirestoreUser } from '@/lib/authActions'

export default function App() {
  const { firebaseUser, loading, userData, setUserData } = useAuth()
  const [screen, setScreen]                     = useState<Screen>('home')
  const [selectedYoutubeId, setSelectedYoutubeId] = useState('Gjd4EDm3EWU')
  const [autoPracticeModuleId, setAutoPracticeModuleId] = useState<string | null>(null)
  const [practiceKey, setPracticeKey] = useState(0)

  function handleVideoSelect(youtubeId: string) {
    setSelectedYoutubeId(youtubeId)
    setScreen('video-lesson')
  }

  function handleAuth(data: FirestoreUser) {
    setUserData(data)
  }

  function handleStartDailyPractice() {
    const nextModule = getFirstIncompleteModule(userData?.completedTasks ?? [])
    setAutoPracticeModuleId(nextModule?.id ?? null)
    setPracticeKey(k => k + 1) // force a fresh PracticeScreen mount even if already on it
    setScreen('practice')
  }

  const spinner = (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1014' }}>
      <div
        className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
        style={{ borderTopColor: '#18e5f0' }}
      />
    </div>
  )

  if (loading) return spinner

  if (!firebaseUser) {
    return <AuthScreen onAuth={handleAuth} />
  }

  // firebaseUser can become truthy (via Firebase's own onAuthStateChanged) slightly
  // before userData has loaded/been set — without this gate the shell would briefly
  // render with a null userData, showing fallback placeholders (e.g. "Welcome back,
  // Magician.") instead of the real signed-in user's data.
  if (!userData) return spinner

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0d1014' }}>
      <Sidebar active={screen} onNavigate={setScreen} onStartDailyPractice={handleStartDailyPractice} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0" style={{ background: '#0d1014' }}>
        {screen === 'home'         && <HomeScreen onNavigate={setScreen} />}
        {screen === 'courses'      && <CoursePathScreen />}
        {screen === 'videos'       && <VideoLibraryScreen onSelectVideo={handleVideoSelect} />}
        {screen === 'video-lesson' && <VideoLessonScreen youtubeId={selectedYoutubeId} onNavigate={setScreen} />}
        {screen === 'practice'     && <PracticeScreen key={practiceKey} initialModuleId={autoPracticeModuleId} />}
        {screen === 'feedback'     && <FeedbackScreen />}
        {screen === 'profile'      && <ProfileScreen />}
      </main>
      <MobileBottomNav active={screen} onNavigate={setScreen} />
    </div>
  )
}
