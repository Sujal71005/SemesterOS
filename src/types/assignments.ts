import type { SubjectKind } from './academics'

export type AssignmentStatus = 'todo' | 'in_progress' | 'submitted' | 'done'

export type Assignment = {
  id: string
  user_id: string
  subject_id: string
  title: string
  description: string
  due_at: string | null
  status: AssignmentStatus
  created_at: string
  updated_at: string
}

export type AssignmentWithSubject = Assignment & {
  subject: { id: string; name: string; kind: SubjectKind }
}

export type CreateAssignmentInput = {
  subject_id: string
  title: string
  description?: string
  due_at?: string | null
  status?: AssignmentStatus
}

export type UpdateAssignmentInput = Partial<Omit<CreateAssignmentInput, 'subject_id'>> & {
  subject_id?: string
}

export type AssignmentFilters = {
  subject_id?: string
  status?: AssignmentStatus
}
