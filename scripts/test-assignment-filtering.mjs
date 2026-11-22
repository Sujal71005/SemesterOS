import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const outDir = mkdtempSync(join(tmpdir(), 'semesteros-assignment-filtering-'))
execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--skipLibCheck', '--outDir', outDir, '--rootDir', 'src', 'src/utils/assignmentFiltering.ts', 'src/utils/latestRequest.ts', 'src/utils/assignmentDates.ts', 'src/types/assignments.ts', 'src/types/academics.ts'], { stdio: 'inherit' })
const compiledFilter = resolve(outDir, 'utils/assignmentFiltering.js')
writeFileSync(compiledFilter, readFileSync(compiledFilter, 'utf8').replace("from './assignmentDates'", "from './assignmentDates.js'"))
const { filterAssignments, groupDeadlineAssignments } = await import(pathToFileURL(resolve(outDir, 'utils/assignmentFiltering.js')))
const { createLatestRequestGate } = await import(pathToFileURL(resolve(outDir, 'utils/latestRequest.js')))
const base = (id, title, subject_id, status, due_at = null) => ({ id, title, subject_id, status, due_at, user_id: 'u', description: '', created_at: '', updated_at: '', subject: { id: subject_id, name: subject_id === 's1' ? 'Physics' : 'Chem Lab', kind: subject_id === 's1' ? 'subject' : 'lab' } })
const rows = [base('1', 'Physics Report', 's1', 'todo', '2026-11-22T11:00:00Z'), base('2', 'Chemistry Lab', 's2', 'in_progress', '2026-11-23T13:00:00Z'), base('3', 'Final Essay', 's1', 'submitted', '2026-11-21T12:00:00Z'), base('4', 'Done Reading', 's2', 'done', '2026-11-24T12:00:00Z'), base('5', 'No deadline task', 's1', 'todo')]
const now = new Date('2026-11-22T12:00:00Z')

test('title search is case-insensitive and trims surrounding whitespace', () => assert.deepEqual(filterAssignments(rows, { search: '  pHySiCs  ', subjectId: '', status: '' }).map((row) => row.id), ['1']))
test('empty search returns all rows', () => assert.equal(filterAssignments(rows, { search: '  ', subjectId: '', status: '' }).length, rows.length))
test('subject filter selects matching subject or lab by ID', () => assert.deepEqual(filterAssignments(rows, { search: '', subjectId: 's2', status: '' }).map((row) => row.id), ['2', '4']))
test('status filter selects matching status', () => assert.deepEqual(filterAssignments(rows, { search: '', subjectId: '', status: 'todo' }).map((row) => row.id), ['1', '5']))
test('search and subject and status filters combine', () => assert.deepEqual(filterAssignments(rows, { search: 'report', subjectId: 's1', status: 'todo' }).map((row) => row.id), ['1']))
test('nonmatching filters return an empty set', () => assert.deepEqual(filterAssignments(rows, { search: 'missing', subjectId: '', status: '' }), []))
test('deadline groups include equality overdue and future unfinished only', () => {
  const boundary = base('6', 'Boundary', 's1', 'todo', now.toISOString())
  const groups = groupDeadlineAssignments([...rows, boundary], now)
  assert.deepEqual(groups.overdue.map((row) => row.id), ['1', '6'])
  assert.deepEqual(groups.upcoming.map((row) => row.id), ['2'])
})
test('submitted, done and undated records are excluded from deadline groups', () => {
  const groups = groupDeadlineAssignments(rows, now)
  assert.equal(groups.overdue.some((row) => ['3', '4', '5'].includes(row.id)), false)
  assert.equal(groups.upcoming.some((row) => ['3', '4', '5'].includes(row.id)), false)
})
test('empty input produces empty deadline groups', () => assert.deepEqual(groupDeadlineAssignments([], now), { overdue: [], upcoming: [] }))
test('latest request gate prevents older responses from committing', () => {
  const gate = createLatestRequestGate()
  const older = gate.begin()
  const newer = gate.begin()
  assert.equal(gate.isCurrent(newer), true)
  assert.equal(gate.isCurrent(older), false)
})
test('invalidated request gate prevents updates after unmount', () => {
  const gate = createLatestRequestGate()
  const request = gate.begin()
  gate.invalidate()
  assert.equal(gate.isCurrent(request), false)
})

process.on('exit', () => rmSync(outDir, { recursive: true, force: true }))
