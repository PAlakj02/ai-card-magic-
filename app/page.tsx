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
import type { Screen } from '@/data/mockData'
import type { FirestoreUser } from '@/lib/authActions'

export default function App() {
  const { firebaseUser, loading, setUserData } = useAuth()
  const [screen, setScreen]                     = useState<Screen>('home')
  const [selectedYoutubeId, setSelectedYoutubeId] = useState('Gjd4EDm3EWU')

  function handleVideoSelect(youtubeId: string) {
    setSelectedYoutubeId(youtubeId)
    setScreen('video-lesson')
  }

  function handleAuth(data: FirestoreUser) {
    setUserData(data)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1014' }}>
        <div
          className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: '#18e5f0' }}
        />
      </div>
    )
  }

  if (!firebaseUser) {
    return <AuthScreen onAuth={handleAuth} />
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0d1014' }}>
      <Sidebar active={screen} onNavigate={setScreen} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0" style={{ background: '#0d1014' }}>
        {screen === 'home'         && <HomeScreen onNavigate={setScreen} />}
        {screen === 'courses'      && <CoursePathScreen />}
        {screen === 'videos'       && <VideoLibraryScreen onSelectVideo={handleVideoSelect} />}
        {screen === 'video-lesson' && <VideoLessonScreen youtubeId={selectedYoutubeId} onNavigate={setScreen} />}
        {screen === 'practice'     && <PracticeScreen />}
        {screen === 'feedback'     && <FeedbackScreen />}
        {screen === 'profile'      && <ProfileScreen />}
      </main>
      <MobileBottomNav active={screen} onNavigate={setScreen} />
    </div>
  )
}
