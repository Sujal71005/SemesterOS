export type SubjectKind = 'subject' | 'lab'

/** Mirrors the public.subjects table columns from the academics migration. */
export type Subject = {
  id: string
  user_id: string
  kind: SubjectKind
  name: string
  credits: number
  description: string
  notes: string
  created_at: string
  updated_at: string
}

export type SyllabusSection = 'theory' | 'practical'

/** Mirrors public.syllabus_modules. */
export type SyllabusModule = {
  id: string
  user_id: string
  subject_id: string
  section: SyllabusSection
  title: string
  description: string
  position: number
  created_at: string
  updated_at: string
}

export type CreateModuleInput = {
  subject_id: string
  section: SyllabusSection
  title: string
  description?: string
  position?: number
}

export type SyllabusTopic = {
  id: string
  user_id: string
  module_id: string
  title: string
  is_complete: boolean
  position: number
  created_at: string
  updated_at: string
}

export type CreateTopicInput = { module_id: string; title: string; position: number }
