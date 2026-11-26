import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const out = mkdtempSync(join(tmpdir(), 'semesteros-analytics-'))
execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--skipLibCheck', '--outDir', out, '--rootDir', 'src', 'src/utils/analytics.ts', 'src/utils/assignmentDates.ts', 'src/utils/dailyGoalProgress.ts', 'src/utils/dailyGoalDates.ts', 'src/utils/dailyGoalValidation.ts', 'src/utils/studyPlannerDates.ts', 'src/utils/studyPlannerValidation.ts', 'src/utils/syllabusProgress.ts', 'src/types/analytics.ts', 'src/types/academics.ts', 'src/types/assignments.ts', 'src/types/dailyGoals.ts', 'src/types/studyPlanner.ts'], { stdio: 'inherit' })
for (const file of ['analytics.js', 'dailyGoalProgress.js', 'dailyGoalDates.js', 'studyPlannerDates.js']) {
  const path = resolve(out, 'utils', file)
  let source = readFileSync(path, 'utf8')
  source = source.replaceAll("from './assignmentDates'", "from './assignmentDates.js'")
    .replaceAll("from './dailyGoalProgress'", "from './dailyGoalProgress.js'")
    .replaceAll("from './dailyGoalDates'", "from './dailyGoalDates.js'")
    .replaceAll("from './dailyGoalValidation'", "from './dailyGoalValidation.js'")
    .replaceAll("from './studyPlannerDates'", "from './studyPlannerDates.js'")
    .replaceAll("from './studyPlannerValidation'", "from './studyPlannerValidation.js'")
    .replaceAll("from './syllabusProgress'", "from './syllabusProgress.js'")
  writeFileSync(path, source)
}
const analytics = await import(pathToFileURL(resolve(out, 'utils/analytics.js')))
const subject = (id, name = id) => ({ id, user_id: 'u', kind: 'subject', name, credits: 3, description: '', notes: '', created_at: '', updated_at: '' })
const moduleRow = (id, subject_id, section = 'theory') => ({ id, user_id: 'u', subject_id, section, title: id, description: '', position: 0, created_at: '', updated_at: '' })
const topic = (id, module_id, is_complete) => ({ id, user_id: 'u', module_id, title: id, is_complete, position: 0, created_at: '', updated_at: '' })
const assignment = (status, due_at = null, created_at = '2026-11-23T12:00:00.000Z') => ({ id: `${status}-${created_at}-${due_at}`, user_id: 'u', subject_id: 's', title: status, description: '', due_at, status, created_at, updated_at: created_at })
const goal = (goal_date, status = 'pending', category = 'academics', priority = 'medium') => ({ id: `${goal_date}-${category}-${priority}-${status}`, user_id: 'u', title: 'goal', description: '', goal_date, status, category, priority, completed_at: status === 'completed' ? `${goal_date}T12:00:00.000Z` : null, created_at: '', updated_at: '' })
const recurring = (id, category, start_time = '09:00', end_time = '10:00', day_of_week = 1) => ({ id, user_id: 'u', subject_id: null, title: id, description: '', session_category: category, schedule_type: 'recurring', day_of_week, session_date: null, start_time, end_time, created_at: '', updated_at: '', subject: null })
const once = (id, category, date, start_time = '10:00', end_time = '11:30') => ({ id, user_id: 'u', subject_id: null, title: id, description: '', session_category: category, schedule_type: 'one_time', day_of_week: null, session_date: date, start_time, end_time, created_at: '', updated_at: '', subject: null })
const log = (session_id, occurrence_date, status) => ({ id: `${session_id}-${occurrence_date}`, user_id: 'u', session_id, occurrence_date, status, completed_at: status === 'completed' ? `${occurrence_date}T12:00:00.000Z` : null, created_at: '' })
const range = { startDate: '2026-11-23', endDate: '2026-11-29' }

test('academics aggregate topic-weighted totals and theory/practical progress', () => {
  const result = analytics.calculateAcademicAnalytics([subject('s1', 'Algorithms'), subject('s2', 'Empty')], [moduleRow('m1', 's1'), moduleRow('m2', 's1', 'practical')], [topic('t1', 'm1', true), topic('t2', 'm1', false), topic('t3', 'm2', true)])
  assert.deepEqual([result.total, result.completed, result.remaining, result.percentage], [3, 2, 1, 67])
  assert.deepEqual([result.theory.total, result.theory.completed, result.practical.total, result.practical.completed], [2, 1, 1, 1])
  assert.deepEqual(result.subjectsWithoutSyllabus, [{ id: 's2', name: 'Empty' }])
  assert.equal(result.subjects.find((item) => item.subjectId === 's2').percentage, 0)
  assert.deepEqual(result.subjects.find((item) => item.subjectId === 's1').modules.map((item) => item.percentage), [50, 100])
})
test('academic zero topics and all completed are finite and accurate', () => {
  assert.deepEqual([analytics.calculateAcademicAnalytics([subject('s')], [], []).percentage, analytics.calculateAcademicAnalytics([subject('s')], [moduleRow('m', 's')], [topic('t', 'm', true)]).percentage], [0, 100])
})

test('assignments count every status, pending, done-only completion and overdue by shared rules', () => {
  const now = new Date('2026-11-25T12:00:00.000Z')
  const data = [assignment('todo', now.toISOString()), assignment('in_progress', null), assignment('submitted', '2026-11-20T00:00:00Z'), assignment('done', '2026-11-20T00:00:00Z')]
  const result = analytics.calculateAssignmentAnalytics(data, now, range)
  assert.deepEqual(result.statuses, { todo: 1, in_progress: 1, submitted: 1, done: 1 })
  assert.deepEqual([result.total, result.pending, result.submitted, result.done, result.overdue, result.completionPercentage], [4, 2, 1, 1, 1, 25])
})
test('assignment empty data, null deadlines, trends, and due/created empty dates', () => {
  const empty = analytics.calculateAssignmentAnalytics([], new Date('2026-11-25T12:00:00Z'), range)
  assert.equal(empty.completionPercentage, 0); assert.equal(empty.createdDateTrend.length, 7); assert.ok(empty.createdDateTrend.every((item) => item.count === 0))
  const one = analytics.calculateAssignmentAnalytics([assignment('todo', null)], new Date('2026-11-25T12:00:00Z'), range)
  assert.equal(one.overdue, 0); assert.equal(one.dueDateTrend.reduce((sum, item) => sum + item.count, 0), 0)
})

test('daily goals report current-state counts and category/priority breakdowns', () => {
  const result = analytics.calculateDailyGoalsAnalytics([goal('2026-11-23', 'completed', 'academics', 'high'), goal('2026-11-24'), goal('2026-11-30', 'completed')], range, '2026-11-25')
  assert.deepEqual([result.total, result.completed, result.pending, result.percentage, result.futureGoals], [2, 1, 1, 50, 0])
  assert.deepEqual([result.categories.academics.total, result.categories.academics.completed, result.priorities.high.completed], [2, 1, 1])
  assert.equal(result.dailyTrend.length, 7); assert.equal(result.dailyTrend[2].total, 0)
})
test('daily goals separate future dates and aggregate Monday weeks and local months over year boundaries', () => {
  const goals = [goal('2026-12-31', 'completed'), goal('2027-01-01'), goal('2027-01-03', 'completed')]
  const result = analytics.calculateDailyGoalsAnalytics(goals, { startDate: '2026-12-31', endDate: '2027-01-03' }, '2027-01-01')
  assert.equal(result.futureGoals, 1)
  assert.deepEqual(result.dailyTrend.map((item) => [item.date, item.total, item.future]), [['2026-12-31', 1, 0], ['2027-01-01', 1, 0], ['2027-01-02', 0, 0], ['2027-01-03', 0, 1]])
  assert.deepEqual(result.weeklyTrend.map((item) => [item.startDate, item.endDate]), [['2026-12-28', '2027-01-03']])
  assert.deepEqual(result.monthlyTrend.map((item) => [item.startDate, item.endDate]), [['2026-12-01', '2026-12-31'], ['2027-01-01', '2027-01-31']])
  assert.deepEqual(analytics.weeklyRanges({ startDate: '2026-11-29', endDate: '2026-11-30' }), [{ startDate: '2026-11-23', endDate: '2026-11-29' }, { startDate: '2026-11-30', endDate: '2026-12-06' }])
})
test('zero-goal percentages and empty future-inclusive buckets are zero', () => {
  const result = analytics.calculateDailyGoalsAnalytics([], range, '2026-11-25')
  assert.deepEqual([result.total, result.percentage, result.dailyTrend[0].total, result.dailyTrend[0].completed], [0, 0, 0, 0])
  assert.ok(result.weeklyTrend.every((item) => item.percentage === 0))
})

test('planner separates completed, skipped, planned, unlogged and category durations', () => {
  const sessions = [recurring('study', 'self_study'), once('lecture', 'lecture', '2026-11-24', '10:00', '11:30'), once('lab', 'practical', '2026-11-25', '13:00', '14:00'), once('other', 'other', '2026-11-26')]
  const logs = [log('study', '2026-11-23', 'completed'), log('lecture', '2026-11-24', 'skipped'), log('lab', '2026-11-25', 'planned')]
  const result = analytics.calculateStudyPlannerAnalytics(sessions, logs, range)
  assert.deepEqual([result.total, result.completed, result.skipped, result.explicitlyPlanned, result.unlogged], [4, 1, 1, 1, 1])
  assert.deepEqual([result.scheduledMinutes, result.completedScheduledMinutes], [300, 60])
  assert.deepEqual([result.personalStudy.scheduledMinutes, result.personalStudy.completedScheduledMinutes], [150, 60])
  assert.deepEqual([result.lecture.scheduledMinutes, result.practical.scheduledMinutes], [90, 60])
  assert.equal(result.dailyTrend.length, 7)
})
test('planner recurring expansion counts each occurrence once and one-time occurrence once', () => {
  const result = analytics.calculateStudyPlannerAnalytics([recurring('r', 'revision'), once('o', 'other', '2026-11-25')], [], range)
  assert.deepEqual([result.total, result.unlogged, result.scheduledMinutes], [2, 2, 150])
  assert.equal(result.weeklyTrend.length, 1)
})
test('planner duplicate session occurrences and duplicate logs are rejected', () => {
  assert.throws(() => analytics.calculateStudyPlannerAnalytics([recurring('r', 'revision'), recurring('r', 'revision')], [], range), /duplicate scheduled occurrence/i)
  assert.throws(() => analytics.calculateStudyPlannerAnalytics([recurring('r', 'revision')], [log('r', '2026-11-23', 'completed'), log('r', '2026-11-23', 'completed')], range), /duplicate.*log/i)
})
test('planner accepts zero duration as zero and rejects invalid time intervals', () => {
  assert.equal(analytics.calculateStudyPlannerAnalytics([once('zero', 'self_study', '2026-11-25', '10:00', '10:00')], [], range).scheduledMinutes, 0)
  assert.throws(() => analytics.calculateStudyPlannerAnalytics([once('bad', 'self_study', '2026-11-25', '11:00', '10:00')], [], range), /end time/i)
  assert.throws(() => analytics.calculateStudyPlannerAnalytics([once('bad', 'self_study', '2026-11-25', '25:00', '26:00')], [], range), /time is invalid/i)
})
test('all empty metrics have finite zero percentages and invalid/reversed ranges fail', () => {
  const academics = analytics.calculateAcademicAnalytics([], [], [])
  const assignments = analytics.calculateAssignmentAnalytics([], new Date(), range)
  const goals = analytics.calculateDailyGoalsAnalytics([], range, '2026-11-25')
  const planner = analytics.calculateStudyPlannerAnalytics([], [], range)
  assert.ok([academics.percentage, assignments.completionPercentage, goals.percentage, planner.scheduledMinutes].every(Number.isFinite))
  assert.throws(() => analytics.monthlyRanges({ startDate: '2026-02-30', endDate: '2026-03-01' }), /valid/i)
  assert.throws(() => analytics.weeklyRanges({ startDate: '2026-11-30', endDate: '2026-11-01' }), /after/i)
})

process.on('exit', () => rmSync(out, { recursive: true, force: true }))
