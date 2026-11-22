import type { AssignmentStatus } from '../types/assignments'

type AssignmentDateFields = { due_at: string | null; status: AssignmentStatus }

function deadlineTime(value: string | null): number | null {
  if (value === null) return null
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw new Error('Assignment deadline is invalid.')
  return timestamp
}

export function isOverdue(assignment: AssignmentDateFields, now = new Date()): boolean {
  const due = deadlineTime(assignment.due_at)
  if (due === null || (assignment.status !== 'todo' && assignment.status !== 'in_progress')) return false
  return due <= now.getTime()
}

export function isUpcoming(assignment: AssignmentDateFields, now = new Date()): boolean {
  const due = deadlineTime(assignment.due_at)
  if (due === null || assignment.status === 'submitted' || assignment.status === 'done') return false
  return due > now.getTime()
}

export function formatAssignmentStatus(status: AssignmentStatus): string {
  const labels: Record<AssignmentStatus, string> = {
    todo: 'To-do', in_progress: 'In Progress', submitted: 'Submitted', done: 'Done',
  }
  return labels[status]
}
