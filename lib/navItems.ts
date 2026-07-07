import { Home, BookOpen, Video, Target, BarChart2, User } from 'lucide-react'
import type { Screen } from '@/data/mockData'

export interface NavItem {
  id:    Screen
  label: string
  Icon:  React.FC<{ size?: number; className?: string }>
}

export const navItems: NavItem[] = [
  { id: 'home',     label: 'Home',     Icon: Home },
  { id: 'courses',  label: 'Courses',  Icon: BookOpen },
  { id: 'videos',   label: 'Videos',   Icon: Video },
  { id: 'practice', label: 'Practice', Icon: Target },
  { id: 'feedback', label: 'Feedback', Icon: BarChart2 },
  { id: 'profile',  label: 'Profile',  Icon: User },
]
