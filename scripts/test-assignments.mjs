import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const outDir = mkdtempSync(join(tmpdir(), 'semesteros-assignments-'))
execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--skipLibCheck', '--outDir', outDir, 'src/utils/assignmentDates.ts', 'src/utils/assignmentDateInput.ts', 'src/utils/assignmentValidation.ts', 'src/utils/assignmentStatusUpdate.ts', 'src/types/assignments.ts', 'src/types/academics.ts'], { stdio: 'inherit' })
const { isOverdue, isUpcoming, formatAssignmentStatus } = await import(pathToFileURL(resolve(outDir, 'utils/assignmentDates.js')))
const service = await import(pathToFileURL(resolve(outDir, 'utils/assignmentValidation.js')))
const dateInput = await import(pathToFileURL(resolve(outDir, 'utils/assignmentDateInput.js')))
const statusUpdates = await import(pathToFileURL(resolve(outDir, 'utils/assignmentStatusUpdate.js')))
const now = new Date('2026-11-22T12:00:00.000Z')
const assignment = (status, due_at) => ({ status, due_at })

test('all four assignment statuses have labels', () => {
  assert.deepEqual(['todo', 'in_progress', 'submitted', 'done'].map(formatAssignmentStatus), ['To-do', 'In Progress', 'Submitted', 'Done'])
})
test('titles trim and accept valid boundary lengths', () => {
  assert.equal(service.validateAssignmentTitle('  Valid title  '), 'Valid title')
  assert.equal(service.validateAssignmentTitle('x'.repeat(180)).length, 180)
})
test('blank, whitespace-only and overlong titles are rejected', () => {
  assert.throws(() => service.validateAssignmentTitle(''), /title/i)
  assert.throws(() => service.validateAssignmentTitle('   '), /title/i)
  assert.throws(() => service.validateAssignmentTitle('x'.repeat(181)), /title/i)
})
test('subject ID is required and whitespace is rejected', () => {
  assert.throws(() => service.validateAssignmentSubjectId(''), /subject or lab/i)
  assert.throws(() => service.validateAssignmentSubjectId('   '), /subject or lab/i)
})
test('missing and null deadlines are supported; invalid deadline is rejected', () => {
  assert.equal(service.validateAssignmentDueAt(undefined), null)
  assert.equal(service.validateAssignmentDueAt(null), null)
  assert.throws(() => service.validateAssignmentDueAt('not-a-date'), /deadline/i)
})
test('only the four supported statuses are accepted', () => {
  for (const status of ['todo', 'in_progress', 'submitted', 'done']) assert.doesNotThrow(() => service.validateAssignmentStatus(status))
  assert.throws(() => service.validateAssignmentStatus('invalid'), /status/i)
})
test('unfinished assignments are overdue at and after their deadline', () => {
  assert.equal(isOverdue(assignment('todo', now.toISOString()), now), true)
  assert.equal(isOverdue(assignment('todo', '2026-11-22T11:59:59.999Z'), now), true)
  assert.equal(isOverdue(assignment('in_progress', '2026-11-22T12:00:00.001Z'), now), false)
})
test('submitted and done assignments are never overdue or upcoming', () => {
  for (const status of ['submitted', 'done']) {
    assert.equal(isOverdue(assignment(status, '2026-11-21T00:00:00Z'), now), false)
    assert.equal(isUpcoming(assignment(status, '2026-11-23T00:00:00Z'), now), false)
  }
})
test('future unfinished deadlines are upcoming and past deadlines are not', () => {
  assert.equal(isUpcoming(assignment('todo', '2026-11-22T12:00:00.001Z'), now), true)
  assert.equal(isUpcoming(assignment('in_progress', '2026-11-22T11:59:59.999Z'), now), false)
})
test('undated assignments are neither overdue nor upcoming', () => {
  assert.equal(isOverdue(assignment('todo', null), now), false)
  assert.equal(isUpcoming(assignment('todo', null), now), false)
})
test('invalid deadline strings throw explicitly', () => {
  assert.throws(() => isOverdue(assignment('todo', 'invalid'), now), /deadline/i)
  assert.throws(() => isUpcoming(assignment('todo', 'invalid'), now), /deadline/i)
})
test('deadline input preserves the same instant when converted to and from local input', () => {
  const iso = '2026-11-22T12:34:00.000Z'
  const localValue = dateInput.toLocalDateTimeInput(iso)
  assert.equal(new Date(dateInput.localDateTimeToIso(localValue)).getTime(), new Date(iso).getTime())
  assert.equal(dateInput.toLocalDateTimeInput(null), '')
  assert.equal(dateInput.localDateTimeToIso(''), null)
})
test('successful status update commits the saved status once', async () => {
  let saved = 'todo'
  const result = await statusUpdates.persistAssignmentStatus(saved, 'done', async () => {}, (status) => { saved = status })
  assert.equal(result, true)
  assert.equal(saved, 'done')
})
test('failed status update keeps the previous saved status', async () => {
  let saved = 'todo'
  const result = await statusUpdates.persistAssignmentStatus(saved, 'done', async () => { throw new Error('offline') }, (status) => { saved = status })
  assert.equal(result, false)
  assert.equal(saved, 'todo')
})
test('status update does not submit the already saved status', async () => {
  let calls = 0
  const result = await statusUpdates.persistAssignmentStatus('todo', 'todo', async () => { calls += 1 }, () => {})
  assert.equal(result, true)
  assert.equal(calls, 0)
})

process.on('exit', () => rmSync(outDir, { recursive: true, force: true }))
