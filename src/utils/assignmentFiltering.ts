import type { AssignmentStatus, AssignmentWithSubject } from '../types/assignments'
import { isOverdue, isUpcoming } from './assignmentDates'

export type AssignmentFilterCriteria = {
  search: string
  subjectId: string
  status: AssignmentStatus | ''
}

export function filterAssignments(assignments: AssignmentWithSubject[], criteria: AssignmentFilterCriteria): AssignmentWithSubject[] {
  const query = criteria.search.trim().toLocaleLowerCase()
  return assignments.filter((assignment) =>
    (!query || assignment.title.toLocaleLowerCase().includes(query))
    && (!criteria.subjectId || assignment.subject_id === criteria.subjectId)
    && (!criteria.status || assignment.status === criteria.status),
  )
}

export function groupDeadlineAssignments(assignments: AssignmentWithSubject[], now: Date): { overdue: AssignmentWithSubject[]; upcoming: AssignmentWithSubject[] } {
  return {
    overdue: assignments.filter((assignment) => isOverdue(assignment, now)),
    upcoming: assignments.filter((assignment) => isUpcoming(assignment, now)),
  }
}
