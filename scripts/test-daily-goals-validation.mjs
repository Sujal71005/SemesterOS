import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const outDir = mkdtempSync(join(tmpdir(), 'semesteros-daily-goals-'))
try {
  execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--skipLibCheck', '--outDir', outDir, 'src/utils/dailyGoalValidation.ts', 'src/types/dailyGoals.ts'], { stdio: 'inherit' })
  const validation = await import(pathToFileURL(resolve(outDir, 'utils/dailyGoalValidation.js')))
  const { validateDailyGoalTitle, validateDailyGoalDescription, validateDailyGoalCategory, validateDailyGoalPriority, validateDailyGoalStatus, validateDailyGoalDate, validateDailyGoalCompletion } = validation

  test('valid goal fields and completion pair are accepted', () => {
    assert.equal(validateDailyGoalTitle(' Review notes '), 'Review notes')
    assert.equal(validateDailyGoalDescription('  Read chapter  '), 'Read chapter')
    assert.doesNotThrow(() => validateDailyGoalCategory('academics'))
    assert.doesNotThrow(() => validateDailyGoalPriority('medium'))
    assert.doesNotThrow(() => validateDailyGoalStatus('completed'))
    assert.equal(validateDailyGoalDate('2024-02-29'), '2024-02-29')
    assert.equal(validateDailyGoalCompletion('completed', ' 2024-02-29T12:30:00Z '), '2024-02-29T12:30:00Z')
    assert.equal(validateDailyGoalCompletion('pending'), null)
  })

  test('empty and whitespace-only titles are rejected', () => {
    assert.throws(() => validateDailyGoalTitle(''), /title/i)
    assert.throws(() => validateDailyGoalTitle('   '), /title/i)
  })

  test('title length boundaries are enforced after trimming', () => {
    assert.equal(validateDailyGoalTitle(` ${'x'.repeat(180)} `).length, 180)
    assert.throws(() => validateDailyGoalTitle('x'.repeat(181)), /1–180/)
  })

  test('description length boundary is enforced after trimming', () => {
    assert.equal(validateDailyGoalDescription(` ${'x'.repeat(1000)} `).length, 1000)
    assert.throws(() => validateDailyGoalDescription('x'.repeat(1001)), /1000/)
    assert.equal(validateDailyGoalDescription(undefined), '')
  })

  test('invalid category, priority and status are rejected', () => {
    assert.throws(() => validateDailyGoalCategory('study'), /category/i)
    assert.throws(() => validateDailyGoalPriority('urgent'), /priority/i)
    assert.throws(() => validateDailyGoalStatus('done'), /status/i)
  })

  test('invalid calendar dates and formats are rejected', () => {
    for (const date of ['2024-02-30', '2023-02-29', '2026-13-01', '2026-04-31', '2026-2-03', 'not-a-date', '0000-01-01']) {
      assert.throws(() => validateDailyGoalDate(date), /date/i, date)
    }
  })

  test('valid leap years are accepted and non-leap centuries rejected', () => {
    assert.equal(validateDailyGoalDate('2000-02-29'), '2000-02-29')
    assert.equal(validateDailyGoalDate('2024-02-29'), '2024-02-29')
    assert.throws(() => validateDailyGoalDate('1900-02-29'), /calendar/i)
  })

  test('completion timestamp must agree with status and be a valid ISO timestamp', () => {
    assert.throws(() => validateDailyGoalCompletion('completed', null), /require a completion timestamp/i)
    assert.throws(() => validateDailyGoalCompletion('completed', 'not-a-timestamp'), /timestamp/i)
    assert.throws(() => validateDailyGoalCompletion('completed', '2024-02-29'), /timestamp/i)
    assert.throws(() => validateDailyGoalCompletion('completed', '2024-02-30T12:30:00Z'), /calendar/i)
    assert.throws(() => validateDailyGoalCompletion('pending', '2024-02-29T12:30:00Z'), /must not/i)
    assert.equal(validateDailyGoalCompletion('pending', null), null)
  })

  test('title, description and completion timestamp are normalized', () => {
    assert.equal(validateDailyGoalTitle('\t Finish project  \n'), 'Finish project')
    assert.equal(validateDailyGoalDescription('\n Details here \t'), 'Details here')
    assert.equal(validateDailyGoalCompletion('completed', ' 2026-11-24T09:00:00+05:30 '), '2026-11-24T09:00:00+05:30')
  })
} finally {
  process.on('exit', () => rmSync(outDir, { recursive: true, force: true }))
}
