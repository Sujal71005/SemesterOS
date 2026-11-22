const allowedStatuses = ['todo', 'in_progress', 'submitted', 'done'] as const

export function validateAssignmentTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed.length < 1 || trimmed.length > 180) throw new Error('Assignment title must contain 1–180 characters.')
  return trimmed
}

export function validateAssignmentSubjectId(subjectId: string | undefined): string {
  if (!subjectId?.trim()) throw new Error('Choose a subject or lab for this assignment.')
  return subjectId.trim()
}

export function validateAssignmentDueAt(dueAt: string | null | undefined): string | null {
  if (dueAt == null) return null
  if (!dueAt.trim() || !Number.isFinite(Date.parse(dueAt))) throw new Error('Enter a valid assignment deadline or leave it empty.')
  return dueAt
}

export function validateAssignmentStatus(status: unknown): void {
  if (status !== undefined && !allowedStatuses.includes(status as typeof allowedStatuses[number])) {
    throw new Error('Choose a valid assignment status.')
  }
}
