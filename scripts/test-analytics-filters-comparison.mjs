import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const out = mkdtempSync(join(tmpdir(), 'semesteros-analytics-filters-'))
execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--skipLibCheck', '--outDir', out, '--rootDir', 'src', 'src/utils/analyticsFilters.ts', 'src/utils/periodComparison.ts', 'src/types/academics.ts', 'src/types/assignments.ts', 'src/types/dailyGoals.ts', 'src/types/studyPlanner.ts'], { stdio: 'inherit' })
const filters = await import(pathToFileURL(resolve(out, 'utils/analyticsFilters.js')))
const comparisons = await import(pathToFileURL(resolve(out, 'utils/periodComparison.js')))
const subject = (id) => ({ id, user_id: 'u', kind: 'subject', name: id, credits: 3, description: '', notes: '', created_at: '', updated_at: '' })
const moduleRow = (id, subject_id) => ({ id, user_id: 'u', subject_id, section: 'theory', title: id, description: '', position: 0, created_at: '', updated_at: '' })
const topic = (id, module_id) => ({ id, user_id: 'u', module_id, title: id, is_complete: false, position: 0, created_at: '', updated_at: '' })
const assignment = (id, subject_id) => ({ id, subject_id, user_id: 'u', title: id, description: '', due_at: null, status: 'todo', created_at: '', updated_at: '' })
const goal = (id, category) => ({ id, category, user_id: 'u', title: id, description: '', goal_date: '2026-11-24', priority: 'medium', status: 'pending', completed_at: null, created_at: '', updated_at: '' })
const session = (id, session_category, subject_id = null) => ({ id, user_id: 'u', subject_id, title: id, description: '', session_category, schedule_type: 'one_time', day_of_week: null, session_date: '2026-11-24', start_time: '09:00', end_time: '10:00', created_at: '', updated_at: '', subject: null })

test('academic subject filter keeps the chosen subject with related modules and topics', () => {
  const rows = { subjects: [subject('s1'), subject('s2')], modules: [moduleRow('m1', 's1'), moduleRow('m2', 's2')], topics: [topic('t1', 'm1'), topic('t2', 'm2')] }
  const result = filters.filterAcademicRows(rows, 's2')
  assert.deepEqual(result.subjects.map((item) => item.id), ['s2'])
  assert.deepEqual(result.modules.map((item) => item.id), ['m2'])
  assert.deepEqual(result.topics.map((item) => item.id), ['t2'])
  assert.equal(filters.filterAcademicRows(rows, '').subjects.length, 2)
})
test('assignment subject and Daily Goals category filters include an All option behavior', () => {
  const assignments = [assignment('a1', 's1'), assignment('a2', 's2')]
  assert.deepEqual(filters.filterAssignmentsBySubject(assignments, 's1').map((item) => item.id), ['a1'])
  assert.equal(filters.filterAssignmentsBySubject(assignments, '').length, 2)
  const goals = [goal('g1', 'academics'), goal('g2', 'coding')]
  assert.deepEqual(filters.filterDailyGoalsByCategory(goals, 'coding').map((item) => item.id), ['g2'])
  assert.equal(filters.filterDailyGoalsByCategory(goals, 'all').length, 2)
})
test('Study Planner category and activity-type filters combine without reclassifying lecture/practical', () => {
  const sessions = [session('lecture', 'lecture'), session('lab', 'practical'), session('study', 'self_study'), session('review', 'revision'), session('misc', 'other')]
  assert.deepEqual(filters.filterStudySessions(sessions, 'all', 'personal').map((item) => item.id), ['study', 'review', 'misc'])
  assert.deepEqual(filters.filterStudySessions(sessions, 'revision', 'personal').map((item) => item.id), ['review'])
  assert.deepEqual(filters.filterStudySessions(sessions, 'all', 'lecture').map((item) => item.id), ['lecture'])
  assert.deepEqual(filters.filterStudySessions(sessions, 'practical', 'all').map((item) => item.id), ['lab'])
})
test('reset returns every Analytics filter to its All/default state', () => {
  const selected = { academicSubjectId: 's1', assignmentSubjectId: 's2', dailyGoalCategory: 'coding', plannerCategory: 'revision', plannerType: 'personal' }
  assert.notDeepEqual(selected, filters.resetAnalyticsFilters())
  assert.deepEqual(filters.resetAnalyticsFilters(), { academicSubjectId: '', assignmentSubjectId: '', dailyGoalCategory: 'all', plannerCategory: 'all', plannerType: 'all' })
})
test('period comparison reports positive and negative changes and handles zero baseline', () => {
  assert.deepEqual(comparisons.calculatePeriodComparison(15, 10), { current: 15, previous: 10, absoluteChange: 5, percentageChange: 50 })
  assert.deepEqual(comparisons.calculatePeriodComparison(6, 10), { current: 6, previous: 10, absoluteChange: -4, percentageChange: -40 })
  assert.deepEqual(comparisons.calculatePeriodComparison(3, 0), { current: 3, previous: 0, absoluteChange: 3, percentageChange: null })
  assert.deepEqual(comparisons.calculatePeriodComparison(0, 0), { current: 0, previous: 0, absoluteChange: 0, percentageChange: null })
  assert.throws(() => comparisons.calculatePeriodComparison(Number.NaN, 1), /finite/i)
})

process.on('exit', () => rmSync(out, { recursive: true, force: true }))
