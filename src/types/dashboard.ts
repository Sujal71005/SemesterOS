export type Goal = { label: string; done: boolean }
export type ScheduleItem = { time: string; title: string; detail: string; color: 'blue' | 'violet' | 'green' }
export type Deadline = { title: string; course: string; date: string; daysLeft: number }
export type StudyDay = { day: string; hours: number }
