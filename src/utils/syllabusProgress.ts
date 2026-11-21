import type { Subject, SyllabusModule, SyllabusTopic } from '../types/academics'

export type TopicProgress = { total: number; completed: number; pending: number; percentage: number }
export type ModuleProgress = TopicProgress & { moduleId: string }
export type SectionProgress = TopicProgress
export type SubjectProgress = TopicProgress & { subjectId: string; theory: SectionProgress; practical: SectionProgress; modules: ModuleProgress[] }

function progress(total: number, completed: number): TopicProgress {
  return { total, completed, pending: total - completed, percentage: total === 0 ? 0 : Math.round(completed / total * 100) }
}

export function calculateSyllabusProgress(modules: SyllabusModule[], topics: SyllabusTopic[], subjects?: Subject[]): SubjectProgress[] {
  const topicsByModule = new Map<string, SyllabusTopic[]>()
  topics.forEach((topic) => topicsByModule.set(topic.module_id, [...(topicsByModule.get(topic.module_id) ?? []), topic]))
  const subjectIds = [...new Set([...(subjects?.map((subject) => subject.id) ?? []), ...modules.map((module) => module.subject_id)])]
  return subjectIds.map((subjectId) => {
    const subjectModules = modules.filter((module) => module.subject_id === subjectId)
    const moduleProgress = subjectModules.map((module) => {
      const items = topicsByModule.get(module.id) ?? []
      return { moduleId: module.id, ...progress(items.length, items.filter((item) => item.is_complete).length) }
    })
    const allTopics = subjectModules.flatMap((module) => topicsByModule.get(module.id) ?? [])
    const theoryTopics = subjectModules.filter((module) => module.section === 'theory').flatMap((module) => topicsByModule.get(module.id) ?? [])
    const practicalTopics = subjectModules.filter((module) => module.section === 'practical').flatMap((module) => topicsByModule.get(module.id) ?? [])
    return {
      subjectId, ...progress(allTopics.length, allTopics.filter((topic) => topic.is_complete).length),
      theory: progress(theoryTopics.length, theoryTopics.filter((topic) => topic.is_complete).length),
      practical: progress(practicalTopics.length, practicalTopics.filter((topic) => topic.is_complete).length),
      modules: moduleProgress,
    }
  })
}
