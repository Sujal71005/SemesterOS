import type { Subject, SyllabusModule, SyllabusTopic } from '../types/academics'
import type { Assignment } from '../types/assignments'
import type { DailyGoal, DailyGoalCategory } from '../types/dailyGoals'
import type { SessionCategory, StudySessionWithSubject } from '../types/studyPlanner'

export type AcademicRows = { subjects: Subject[]; modules: SyllabusModule[]; topics: SyllabusTopic[] }
export type PlannerSessionType = 'all' | 'lecture' | 'practical' | 'personal'
export type AnalyticsFilterState = {
  academicSubjectId: string
  assignmentSubjectId: string
  dailyGoalCategory: DailyGoalCategory | 'all'
  plannerCategory: SessionCategory | 'all'
  plannerType: PlannerSessionType
}

export function resetAnalyticsFilters(): AnalyticsFilterState {
  return { academicSubjectId: '', assignmentSubjectId: '', dailyGoalCategory: 'all', plannerCategory: 'all', plannerType: 'all' }
}

export function filterAcademicRows(rows: AcademicRows, subjectId: string): AcademicRows {
  if (!subjectId) return rows
  const subjects = rows.subjects.filter((subject) => subject.id === subjectId)
  const modules = rows.modules.filter((module) => module.subject_id === subjectId)
  const moduleIds = new Set(modules.map((module) => module.id))
  return { subjects, modules, topics: rows.topics.filter((topic) => moduleIds.has(topic.module_id)) }
}

export function filterAssignmentsBySubject<T extends Pick<Assignment, 'subject_id'>>(assignments: T[], subjectId: string): T[] {
  return subjectId ? assignments.filter((assignment) => assignment.subject_id === subjectId) : assignments
}

export function filterDailyGoalsByCategory<T extends Pick<DailyGoal, 'category'>>(goals: T[], category: DailyGoalCategory | 'all'): T[] {
  return category === 'all' ? goals : goals.filter((goal) => goal.category === category)
}

export function filterStudySessions(
  sessions: StudySessionWithSubject[],
  category: SessionCategory | 'all',
  type: PlannerSessionType,
): StudySessionWithSubject[] {
  return sessions.filter((session) => {
    if (category !== 'all' && session.session_category !== category) return false
    if (type === 'lecture' && session.session_category !== 'lecture') return false
    if (type === 'practical' && session.session_category !== 'practical') return false
    if (type === 'personal' && (session.session_category === 'lecture' || session.session_category === 'practical')) return false
    return true
  })
}
