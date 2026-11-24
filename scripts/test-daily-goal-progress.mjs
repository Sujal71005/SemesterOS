import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const outDir = mkdtempSync(join(tmpdir(), 'semesteros-daily-goal-progress-'))
try {
  execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--skipLibCheck', '--outDir', outDir, 'src/utils/dailyGoalProgress.ts', 'src/utils/dailyGoalDates.ts', 'src/utils/dailyGoalValidation.ts', 'src/types/dailyGoals.ts'], { stdio: 'inherit' })
  for (const file of ['dailyGoalProgress.js', 'dailyGoalDates.js']) {
    const filePath = resolve(outDir, 'utils', file)
    let compiled = readFileSync(filePath, 'utf8')
    compiled = compiled.replace("from './dailyGoalDates'", "from './dailyGoalDates.js'").replace("from './dailyGoalValidation'", "from './dailyGoalValidation.js'")
    writeFileSync(filePath, compiled)
  }
  const progress = await import(pathToFileURL(resolve(outDir, 'utils', 'dailyGoalProgress.js')))
  const goal = (goal_date, status = 'pending') => ({ goal_date, status })

  test('daily statistics handle zero goals and completion percentages', () => {
    assert.deepEqual(progress.calculateDailyGoalProgress([]), { total: 0, completed: 0, pending: 0, percentage: 0 })
    assert.deepEqual(progress.calculateDailyGoalProgress([goal('2026-11-24', 'completed'), goal('2026-11-24'), goal('2026-11-24', 'completed')]), { total: 3, completed: 2, pending: 1, percentage: 67 })
  })

  test('weekly statistics handle zero goals', () => {
    assert.deepEqual(progress.calculateWeeklyGoalProgress([], '2026-11-25', '2026-11-25'), {
      total: 0, completed: 0, pending: 0, percentage: 0, week_start: '2026-11-23', week_end: '2026-11-29', future_goals: [],
    })
  })

  test('weekly current progress excludes future goals and returns them separately', () => {
    const goals = [goal('2026-11-23', 'completed'), goal('2026-11-24'), goal('2026-11-25', 'completed'), goal('2026-11-26')]
    const result = progress.calculateWeeklyGoalProgress(goals, '2026-11-25', '2026-11-25')
    assert.deepEqual({ total: result.total, completed: result.completed, pending: result.pending, percentage: result.percentage }, { total: 3, completed: 2, pending: 1, percentage: 67 })
    assert.deepEqual(result.future_goals, [goal('2026-11-26')])
  })

  test('reopened goals count as pending based on current status', () => {
    const result = progress.calculateWeeklyGoalProgress([goal('2026-11-24', 'pending')], '2026-11-24', '2026-11-24')
    assert.equal(result.completed, 0)
    assert.equal(result.pending, 1)
    assert.equal(result.percentage, 0)
  })

  test('goals outside the selected week are excluded', () => {
    const result = progress.calculateWeeklyGoalProgress([
      goal('2026-11-22', 'completed'), goal('2026-11-23', 'completed'), goal('2026-11-29'), goal('2026-11-30', 'completed'),
    ], '2026-11-25', '2026-11-30')
    assert.equal(result.total, 2)
    assert.equal(result.completed, 1)
    assert.deepEqual(result.future_goals, [])
  })

  test('a selected future week reports its goals separately from current progress', () => {
    const result = progress.calculateWeeklyGoalProgress([goal('2026-12-01'), goal('2026-12-03', 'completed')], '2026-12-02', '2026-11-25')
    assert.equal(result.total, 0)
    assert.equal(result.percentage, 0)
    assert.equal(result.future_goals.length, 2)
  })
} finally {
  process.on('exit', () => rmSync(outDir, { recursive: true, force: true }))
}
