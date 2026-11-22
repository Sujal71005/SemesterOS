import type { AssignmentStatus } from '../types/assignments'

export async function persistAssignmentStatus(
  savedStatus: AssignmentStatus,
  nextStatus: AssignmentStatus,
  update: (status: AssignmentStatus) => Promise<void>,
  onSaved: (status: AssignmentStatus) => void,
): Promise<boolean> {
  if (nextStatus === savedStatus) return true
  try {
    await update(nextStatus)
    onSaved(nextStatus)
    return true
  } catch {
    return false
  }
}
