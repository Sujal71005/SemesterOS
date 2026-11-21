import { supabase } from '../lib/supabase'
import type { SubjectKind } from '../types/academics'
import type { CreateModuleInput, CreateTopicInput, Subject, SyllabusModule, SyllabusTopic } from '../types/academics'

export async function listSyllabusAnalytics(): Promise<{ subjects: Subject[]; modules: SyllabusModule[]; topics: SyllabusTopic[] }> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const [subjectResult, moduleResult, topicResult] = await Promise.all([
    supabase.from('subjects').select('id,user_id,kind,name,credits,description,notes,created_at,updated_at'),
    supabase.from('syllabus_modules').select('id,user_id,subject_id,section,title,description,position,created_at,updated_at').order('position'),
    supabase.from('syllabus_topics').select('id,user_id,module_id,title,is_complete,position,created_at,updated_at').order('position'),
  ])
  if (subjectResult.error) throw new Error(`Could not load subjects: ${subjectResult.error.message}`)
  if (moduleResult.error) throw new Error(`Could not load syllabus modules: ${moduleResult.error.message}`)
  if (topicResult.error) throw new Error(`Could not load syllabus topics: ${topicResult.error.message}`)
  return { subjects: (subjectResult.data ?? []) as Subject[], modules: (moduleResult.data ?? []) as SyllabusModule[], topics: (topicResult.data ?? []) as SyllabusTopic[] }
}

export async function listTopics(moduleId: string): Promise<SyllabusTopic[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('syllabus_topics').select('id,user_id,module_id,title,is_complete,position,created_at,updated_at').eq('module_id', moduleId).order('position').order('created_at')
  if (error) throw new Error(`Could not load topics: ${error.message}`)
  return (data ?? []) as SyllabusTopic[]
}

export async function listTopicsForModules(moduleIds: string[]): Promise<SyllabusTopic[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (moduleIds.length === 0) return []
  const { data, error } = await supabase.from('syllabus_topics').select('id,user_id,module_id,title,is_complete,position,created_at,updated_at').in('module_id', moduleIds).order('position').order('created_at')
  if (error) throw new Error(`Could not load syllabus topics: ${error.message}`)
  return (data ?? []) as SyllabusTopic[]
}

export async function createTopic(input: CreateTopicInput): Promise<SyllabusTopic> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('syllabus_topics').insert({ module_id: input.module_id, title: input.title.trim(), position: input.position, is_complete: false }).select('id,user_id,module_id,title,is_complete,position,created_at,updated_at').single()
  if (error) {
    if (error.code === '23505') throw new Error('A topic with this title already exists in this module.')
    throw new Error(`Could not create topic: ${error.message}`)
  }
  return data as SyllabusTopic
}

export async function updateTopic(id: string, changes: { title?: string; is_complete?: boolean }): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('syllabus_topics').update(changes).eq('id', id)
  if (error) {
    if (error.code === '23505') throw new Error('A topic with this title already exists in this module.')
    throw new Error(`Could not update topic: ${error.message}`)
  }
}

export async function deleteTopic(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('syllabus_topics').delete().eq('id', id)
  if (error) throw new Error(`Could not delete topic: ${error.message}`)
}

export async function listModules(subjectId: string): Promise<SyllabusModule[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('syllabus_modules')
    .select('id, user_id, subject_id, section, title, description, position, created_at, updated_at')
    .eq('subject_id', subjectId).order('position').order('created_at')
  if (error) throw new Error(`Could not load syllabus modules: ${error.message}`)
  return (data ?? []) as SyllabusModule[]
}

export async function createModule(input: CreateModuleInput): Promise<SyllabusModule> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('syllabus_modules').insert({
    subject_id: input.subject_id, section: input.section, title: input.title.trim(),
    description: input.description?.trim() ?? '', position: input.position ?? 0,
  }).select('id, user_id, subject_id, section, title, description, position, created_at, updated_at').single()
  if (error) {
    if (error.code === '23505') throw new Error('A module with this title already exists in this section.')
    throw new Error(`Could not create module: ${error.message}`)
  }
  return data as SyllabusModule
}

export async function addSubject(input: { name: string; credits: number; kind: SubjectKind }): Promise<Subject> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('subjects').insert({
    name: input.name.trim(), credits: input.credits, kind: input.kind,
  }).select('id, user_id, kind, name, credits, description, notes, created_at, updated_at').single()
  if (error) throw new Error(`Could not save subject: ${error.message}`)
  return data as Subject
}

export async function addSubjectsBatch(inputs: Array<{ name: string; credits: number; kind: SubjectKind }>): Promise<Subject[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (inputs.length === 0) return []
  const { data, error } = await supabase.from('subjects').insert(inputs.map(({ name, credits, kind }) => ({
    name: name.trim(), credits, kind,
  }))).select('id, user_id, kind, name, credits, description, notes, created_at, updated_at')
  if (error) throw error
  return (data ?? []) as Subject[]
}

export async function listSubjects(): Promise<Subject[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Configure the local Supabase URL and publishable key to load academics.')
  }

  const { data, error } = await supabase
    .from('subjects')
    .select('id, user_id, kind, name, credits, description, notes, created_at, updated_at')
    .order('kind', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(`Could not load subjects: ${error.message}`)
  return (data ?? []) as Subject[]
}
