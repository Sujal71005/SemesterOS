import { CalendarDays, ChartNoAxesCombined, CheckSquare, Code2, FolderKanban, GraduationCap, LayoutDashboard, NotebookPen, Settings2, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavigationItem = { label: string; path: string; icon: LucideIcon }

export const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Academics', path: '/academics', icon: GraduationCap },
  { label: 'Timetable', path: '/timetable', icon: CalendarDays },
  { label: 'Daily Goals', path: '/daily-goals', icon: CheckSquare },
  { label: 'Placement', path: '/placement', icon: Code2 },
  { label: 'Skills', path: '/skills', icon: Wrench },
  { label: 'Projects', path: '/projects', icon: FolderKanban },
  { label: 'Analytics', path: '/analytics', icon: ChartNoAxesCombined },
  { label: 'Notes & Resources', path: '/notes', icon: NotebookPen },
  { label: 'Settings', path: '/settings', icon: Settings2 },
]
