import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const outDir = mkdtempSync(join(tmpdir(), 'semesteros-daily-goal-service-input-'))
try {
  execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--skipLibCheck', '--outDir', outDir, 'src/utils/dailyGoalServiceInput.ts', 'src/utils/dailyGoalValidation.ts', 'src/types/dailyGoals.ts'], { stdio: 'inherit' })
  const helperPath = resolve(outDir, 'utils', 'dailyGoalServiceInput.js')
  writeFileSync(helperPath, readFileSync(helperPath, 'utf8').replace("from './dailyGoalValidation'", "from './dailyGoalValidation.js'"))
  const helpers = await import(pathToFileURL(helperPath))
  const base = { title: '  Review notes ', description: ' Details ', goal_date: '2026-11-24', category: 'academics' }
  const existing = { id: 'g1', user_id: 'u1', title: 'Review notes', description: 'Details', goal_date: '2026-11-24', category: 'academics', priority: 'medium', status: 'pending', completed_at: null, created_at: '', updated_at: '' }

  test('create payload normalizes fields and applies schema defaults without user_id', () => {
    const payload = helpers.prepareDailyGoalCreate(base, '2026-11-24T10:00:00.000Z')
    assert.deepEqual(payload, { title: 'Review notes', description: 'Details', goal_date: '2026-11-24', category: 'academics', priority: 'medium', status: 'pending', completed_at: null })
    assert.equal(Object.hasOwn(payload, 'user_id'), false)
  })

  test('completed creation receives a completion timestamp and explicit inconsistency is rejected', () => {
    const payload = helpers.prepareDailyGoalCreate({ ...base, status: 'completed' }, '2026-11-24T10:00:00.000Z')
    assert.equal(payload.completed_at, '2026-11-24T10:00:00.000Z')
    assert.throws(() => helpers.prepareDailyGoalCreate({ ...base, status: 'pending', completed_at: '2026-11-24T10:00:00Z' }), /must not/i)
    assert.throws(() => helpers.prepareDailyGoalCreate({ ...base, category: 'invalid' }), /category/i)
    assert.throws(() => helpers.prepareDailyGoalCreate({ ...base, priority: 'urgent' }), /priority/i)
  })

  test('partial updates normalize supported fields and omit unprovided fields', () => {
    assert.deepEqual(helpers.prepareDailyGoalUpdate({ title: '  New title  ' }, existing), { title: 'New title' })
    assert.throws(() => helpers.prepareDailyGoalUpdate({}, existing), /at least one/i)
    assert.throws(() => helpers.prepareDailyGoalUpdate({ goal_date: '2026-02-30' }, existing), /date/i)
  })

  test('status transitions keep completion timestamps consistent', () => {
    assert.deepEqual(helpers.prepareDailyGoalUpdate({ status: 'completed' }, existing, '2026-11-24T11:00:00.000Z'), { status: 'completed', completed_at: '2026-11-24T11:00:00.000Z' })
    const completed = { ...existing, status: 'completed', completed_at: '2026-11-24T10:00:00.000Z' }
    assert.deepEqual(helpers.prepareDailyGoalUpdate({ status: 'pending' }, completed), { status: 'pending', completed_at: null })
    assert.throws(() => helpers.prepareDailyGoalUpdate({ status: 'pending', completed_at: '2026-11-24T10:00:00Z' }, completed), /must not/i)
  })
} finally {
  process.on('exit', () => rmSync(outDir, { recursive: true, force: true }))
}
