import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const outDir = mkdtempSync(join(tmpdir(), 'semesteros-daily-goal-dates-'))
try {
  execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--skipLibCheck', '--outDir', outDir, 'src/utils/dailyGoalDates.ts', 'src/utils/dailyGoalValidation.ts', 'src/types/dailyGoals.ts'], { stdio: 'inherit' })
  const datesPath = resolve(outDir, 'utils', 'dailyGoalDates.js')
  writeFileSync(datesPath, readFileSync(datesPath, 'utf8').replace("from './dailyGoalValidation'", "from './dailyGoalValidation.js'"))
  const dates = await import(pathToFileURL(datesPath))

  test('parsing and formatting preserve date-only calendar values', () => {
    assert.equal(dates.formatDailyGoalDate('2026-11-24', 'en-US'), 'Tuesday, November 24, 2026')
    assert.equal(dates.parseDailyGoalDate('2026-11-24').getDate(), 24)
    assert.throws(() => dates.parseDailyGoalDate('2026-02-30'), /date/i)
  })

  test('today uses the local calendar date', () => {
    const localDate = new Date(2026, 10, 24, 23, 45)
    assert.equal(dates.getTodayLocalDate(localDate), '2026-11-24')
  })

  test('previous and next day cross month and year boundaries', () => {
    assert.equal(dates.getPreviousDay('2026-03-01'), '2026-02-28')
    assert.equal(dates.getNextDay('2026-12-31'), '2027-01-01')
    assert.equal(dates.getPreviousDay('2024-03-01'), '2024-02-29')
    assert.equal(dates.getNextDay('2024-02-28'), '2024-02-29')
  })

  test('calendar day offsets require integer values', () => {
    assert.equal(dates.addCalendarDays('2026-01-01', 31), '2026-02-01')
    assert.throws(() => dates.addCalendarDays('2026-01-01', 1.5), /integer/i)
  })

  test('weeks run Monday through Sunday across month and year boundaries', () => {
    assert.equal(dates.getWeekStart('2026-11-24'), '2026-11-23')
    assert.equal(dates.getWeekEnd('2026-11-24'), '2026-11-29')
    assert.equal(dates.getWeekStart('2027-01-01'), '2026-12-28')
    assert.equal(dates.getWeekEnd('2027-01-01'), '2027-01-03')
    assert.equal(dates.getWeekStart('2026-11-29'), '2026-11-23')
    assert.equal(dates.getWeekEnd('2026-11-29'), '2026-11-29')
  })

  test('week generation returns seven ordered dates and membership is bounded', () => {
    assert.deepEqual(dates.getWeekDates('2026-11-25'), ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'])
    assert.equal(dates.isDateInWeek('2026-11-23', '2026-11-29'), true)
    assert.equal(dates.isDateInWeek('2026-11-29', '2026-11-23'), true)
    assert.equal(dates.isDateInWeek('2026-11-30', '2026-11-23'), false)
    assert.equal(dates.isDateInWeek('2026-11-22', '2026-11-23'), false)
  })
} finally {
  process.on('exit', () => rmSync(outDir, { recursive: true, force: true }))
}
