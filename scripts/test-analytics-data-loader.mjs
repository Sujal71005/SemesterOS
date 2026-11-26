import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const out = mkdtempSync(join(tmpdir(), 'semesteros-analytics-loader-'))
execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--skipLibCheck', '--outDir', out, '--rootDir', 'src', 'src/utils/analyticsDataLoader.ts', 'src/utils/analyticsDateRange.ts', 'src/utils/studySessionLogRange.ts', 'src/utils/dailyGoalDates.ts', 'src/utils/dailyGoalValidation.ts', 'src/types/analytics.ts', 'src/types/academics.ts', 'src/types/assignments.ts', 'src/types/dailyGoals.ts', 'src/types/studyPlanner.ts'], { stdio: 'inherit' })
for (const file of ['analyticsDateRange.js', 'studySessionLogRange.js', 'dailyGoalDates.js']) {
  const path = resolve(out, 'utils', file)
  writeFileSync(path, readFileSync(path, 'utf8').replaceAll("from './dailyGoalDates'", "from './dailyGoalDates.js'").replaceAll("from './dailyGoalValidation'", "from './dailyGoalValidation.js'"))
}
const { createAnalyticsDataLoader } = await import(pathToFileURL(resolve(out, 'utils/analyticsDataLoader.js')))
const { resolveAnalyticsDateRange, getPreviousAnalyticsDateRange } = await import(pathToFileURL(resolve(out, 'utils/analyticsDateRange.js')))
const { getStudySessionLogDateBounds } = await import(pathToFileURL(resolve(out, 'utils/studySessionLogRange.js')))
const makeDependencies = (overrides = {}) => ({
  loadAcademics: async () => ({ subjects: [], modules: [], topics: [] }),
  loadAssignments: async () => [],
  loadDailyGoals: async () => [],
  loadStudySessions: async () => [],
  loadStudySessionLogs: async () => [],
  ...overrides,
})

test('weekly ranges are Monday through Sunday and keep local date-only values', () => {
  assert.deepEqual(resolveAnalyticsDateRange({ kind: 'weekly', date: '2026-11-29' }), { startDate: '2026-11-23', endDate: '2026-11-29' })
  assert.deepEqual(resolveAnalyticsDateRange({ kind: 'weekly', date: '2027-01-01' }), { startDate: '2026-12-28', endDate: '2027-01-03' })
})
test('monthly ranges handle leap years and month/year boundaries', () => {
  assert.deepEqual(resolveAnalyticsDateRange({ kind: 'monthly', date: '2024-02-14' }), { startDate: '2024-02-01', endDate: '2024-02-29' })
  assert.deepEqual(resolveAnalyticsDateRange({ kind: 'monthly', date: '2026-12-31' }), { startDate: '2026-12-01', endDate: '2026-12-31' })
  assert.deepEqual(resolveAnalyticsDateRange({ kind: 'monthly', date: '2027-01-01' }), { startDate: '2027-01-01', endDate: '2027-01-31' })
})
test('custom ranges are preserved and invalid or reversed bounds fail', () => {
  assert.deepEqual(resolveAnalyticsDateRange({ kind: 'custom', startDate: '2026-12-31', endDate: '2027-01-02' }), { startDate: '2026-12-31', endDate: '2027-01-02' })
  assert.throws(() => resolveAnalyticsDateRange({ kind: 'custom', startDate: '2026-02-30', endDate: '2026-03-01' }), /date/i)
  assert.throws(() => resolveAnalyticsDateRange({ kind: 'custom', startDate: '2027-01-02', endDate: '2027-01-01' }), /after/i)
})
test('one-day and multi-month custom ranges have immediately preceding equal-length periods', () => {
  const oneDay = { kind: 'custom', startDate: '2024-02-29', endDate: '2024-02-29' }
  assert.deepEqual(resolveAnalyticsDateRange(oneDay), { startDate: '2024-02-29', endDate: '2024-02-29' })
  assert.deepEqual(getPreviousAnalyticsDateRange(oneDay), { startDate: '2024-02-28', endDate: '2024-02-28' })
  const acrossYear = { kind: 'custom', startDate: '2026-12-31', endDate: '2027-01-02' }
  assert.deepEqual(resolveAnalyticsDateRange(acrossYear), { startDate: '2026-12-31', endDate: '2027-01-02' })
  assert.deepEqual(getPreviousAnalyticsDateRange(acrossYear), { startDate: '2026-12-28', endDate: '2026-12-30' })
})
test('previous weekly, monthly and custom periods use the required inclusive boundaries', () => {
  assert.deepEqual(getPreviousAnalyticsDateRange({ kind: 'weekly', date: '2026-12-02' }), { startDate: '2026-11-23', endDate: '2026-11-29' })
  assert.deepEqual(getPreviousAnalyticsDateRange({ kind: 'monthly', date: '2026-03-14' }), { startDate: '2026-02-01', endDate: '2026-02-28' })
  assert.deepEqual(getPreviousAnalyticsDateRange({ kind: 'monthly', date: '2024-03-01' }), { startDate: '2024-02-01', endDate: '2024-02-29' })
  assert.deepEqual(getPreviousAnalyticsDateRange({ kind: 'custom', startDate: '2027-01-10', endDate: '2027-01-12' }), { startDate: '2027-01-07', endDate: '2027-01-09' })
})
test('planner log query bounds are inclusive local occurrence dates', () => {
  assert.deepEqual(getStudySessionLogDateBounds('2026-12-28', '2027-01-03'), { startDate: '2026-12-28', endDate: '2027-01-03' })
  assert.throws(() => getStudySessionLogDateBounds('2027-01-03', '2026-12-28'), /after/i)
})
test('successful empty datasets are distinguishable from rejected datasets', async () => {
  const load = createAnalyticsDataLoader(makeDependencies({ loadAssignments: async () => { throw new Error('assignment query failed') } }))
  const result = await load({ startDate: '2026-11-23', endDate: '2026-11-29' })
  assert.equal(result.status, 'partial')
  if (result.status === 'stale') assert.fail('expected current result')
  assert.deepEqual(result.datasets.dailyGoals, { status: 'available', data: [] })
  assert.deepEqual(result.datasets.assignments, { status: 'unavailable', error: 'assignment query failed' })
})
test('all failed datasets report unavailable rather than successful empty arrays', async () => {
  const fail = async () => { throw new Error('offline') }
  const result = await createAnalyticsDataLoader(makeDependencies({ loadAcademics: fail, loadAssignments: fail, loadDailyGoals: fail, loadStudySessions: fail, loadStudySessionLogs: fail }))({ startDate: '2026-11-23', endDate: '2026-11-29' })
  assert.equal(result.status, 'unavailable')
})
test('same-range concurrent requests share one in-flight load and retain the date bounds', async () => {
  let resolveAcademics
  const academicsPromise = new Promise((resolve) => { resolveAcademics = resolve })
  let academicCalls = 0
  let goalRange
  let logRange
  const load = createAnalyticsDataLoader(makeDependencies({
    loadAcademics: () => { academicCalls += 1; return academicsPromise },
    loadDailyGoals: async (range) => { goalRange = range; return [] },
    loadStudySessionLogs: async (range) => { logRange = range; return [] },
  }))
  const range = { startDate: '2026-12-28', endDate: '2027-01-03' }
  const first = load(range)
  const second = load(range)
  assert.equal(first, second)
  assert.equal(academicCalls, 1)
  resolveAcademics({ subjects: [], modules: [], topics: [] })
  const result = await first
  assert.equal(result.status, 'complete')
  assert.deepEqual(goalRange, range)
  assert.deepEqual(logRange, range)
})
test('comparison data is fetched in one inclusive union range while output keeps both bounds', async () => {
  let goalRange
  let logRange
  const load = createAnalyticsDataLoader(makeDependencies({
    loadDailyGoals: async (range) => { goalRange = range; return [] },
    loadStudySessionLogs: async (range) => { logRange = range; return [] },
  }))
  const current = { startDate: '2026-12-28', endDate: '2027-01-03' }
  const previous = { startDate: '2026-12-21', endDate: '2026-12-27' }
  const result = await load(current, previous)
  assert.equal(result.status, 'complete')
  assert.deepEqual(result.range, current)
  assert.deepEqual(result.comparisonRange, previous)
  assert.deepEqual(goalRange, { startDate: previous.startDate, endDate: current.endDate })
  assert.deepEqual(logRange, goalRange)
})
test('an older range result is marked stale after a newer range request starts', async () => {
  let resolveFirst
  let calls = 0
  const load = createAnalyticsDataLoader(makeDependencies({ loadAcademics: () => {
    calls += 1
    if (calls === 1) return new Promise((resolve) => { resolveFirst = resolve })
    return Promise.resolve({ subjects: [], modules: [], topics: [] })
  } }))
  const older = load({ startDate: '2026-11-23', endDate: '2026-11-29' })
  const newer = await load({ startDate: '2026-11-30', endDate: '2026-12-06' })
  assert.equal(newer.status, 'complete')
  resolveFirst({ subjects: [], modules: [], topics: [] })
  assert.equal((await older).status, 'stale')
})
test('returning to an earlier range starts a fresh request instead of reusing its stale promise', async () => {
  let resolveOld
  let calls = 0
  const load = createAnalyticsDataLoader(makeDependencies({ loadAcademics: () => {
    calls += 1
    if (calls === 1) return new Promise((resolve) => { resolveOld = resolve })
    return Promise.resolve({ subjects: [], modules: [], topics: [] })
  } }))
  const firstRange = { startDate: '2026-11-23', endDate: '2026-11-29' }
  const old = load(firstRange)
  await load({ startDate: '2026-11-30', endDate: '2026-12-06' })
  const latestFirstRange = load(firstRange)
  assert.equal((await latestFirstRange).status, 'complete')
  assert.equal(calls, 3)
  resolveOld({ subjects: [], modules: [], topics: [] })
  assert.equal((await old).status, 'stale')
})
test('loader preserves successful dataset shapes for analytics calculations', async () => {
  const sample = { subjects: [{ id: 's' }], modules: [{ id: 'm' }], topics: [{ id: 't' }] }
  const result = await createAnalyticsDataLoader(makeDependencies({ loadAcademics: async () => sample }))({ startDate: '2026-11-23', endDate: '2026-11-29' })
  assert.notEqual(result.status, 'stale')
  if (result.status !== 'stale') assert.equal(result.datasets.academics.status, 'available')
  if (result.status !== 'stale' && result.datasets.academics.status === 'available') assert.equal(result.datasets.academics.data, sample)
})

process.on('exit', () => rmSync(out, { recursive: true, force: true }))
