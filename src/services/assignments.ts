import { supabase } from '../lib/supabase'
import type { Assignment, AssignmentFilters, AssignmentWithSubject, CreateAssignmentInput, UpdateAssignmentInput } from '../types/assignments'
import { validateAssignmentTitle, validateAssignmentSubjectId, validateAssignmentDueAt, validateAssignmentStatus } from '../utils/assignmentValidation'

export { validateAssignmentTitle, validateAssignmentSubjectId, validateAssignmentDueAt, validateAssignmentStatus } from '../utils/assignmentValidation'

const fields = 'id,user_id,subject_id,title,description,due_at,status,created_at,updated_at,subject:subjects(id,name,kind)'
function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function listAssignments(filters: AssignmentFilters = {}): Promise<AssignmentWithSubject[]> {
  let query = client().from('assignments').select(fields)
  if (filters.subject_id) query = query.eq('subject_id', filters.subject_id)
  if (filters.status) query = query.eq('status', filters.status)
  const { data, error } = await query.order('due_at', { ascending: true, nullsFirst: false })
  if (error) throw new Error(`Could not load assignments: ${error.message}`)
  return (data ?? []) as unknown as AssignmentWithSubject[]
}

export async function getAssignmentById(id: string): Promise<AssignmentWithSubject> {
  const { data, error } = await client().from('assignments').select(fields).eq('id', id).single()
  if (error) throw new Error(`Could not load assignment: ${error.message}`)
  return data as unknown as AssignmentWithSubject
}

export async function createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
  const title = validateAssignmentTitle(input.title)
  const subject_id = validateAssignmentSubjectId(input.subject_id)
  const due_at = validateAssignmentDueAt(input.due_at)
  validateAssignmentStatus(input.status)
  const { data, error } = await client().from('assignments').insert({
    subject_id, title, description: input.description?.trim() ?? '', due_at, status: input.status ?? 'todo',
  }).select('id,user_id,subject_id,title,description,due_at,status,created_at,updated_at').single()
  if (error) throw new Error(`Could not create assignment: ${error.message}`)
  return data as Assignment
}

export async function updateAssignment(id: string, changes: UpdateAssignmentInput): Promise<Assignment> {
  if (Object.hasOwn(changes, 'subject_id')) changes = { ...changes, subject_id: validateAssignmentSubjectId(changes.subject_id) }
  if (Object.hasOwn(changes, 'due_at')) changes = { ...changes, due_at: validateAssignmentDueAt(changes.due_at) }
  validateAssignmentStatus(changes.status)
  const update: Record<string, unknown> = { ...changes }
  if (changes.title !== undefined) update.title = validateAssignmentTitle(changes.title)
  if (changes.description !== undefined) update.description = changes.description.trim()
  if (changes.due_at === undefined && Object.hasOwn(changes, 'due_at')) update.due_at = null
  const { data, error } = await client().from('assignments').update(update).eq('id', id)
    .select('id,user_id,subject_id,title,description,due_at,status,created_at,updated_at').single()
  if (error) throw new Error(`Could not update assignment: ${error.message}`)
  return data as Assignment
}

export async function deleteAssignment(id: string): Promise<void> {
  const { data, error } = await client().from('assignments').delete().eq('id', id).select('id')
  if (error) throw new Error(`Could not delete assignment: ${error.message}`)
  if (!data?.length) throw new Error('Assignment was not found or you do not have permission to delete it.')
}
