import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const outDir = mkdtempSync(join(tmpdir(), 'semesteros-progress-'))
const tsc = resolve('node_modules/typescript/bin/tsc')
execFileSync(process.execPath, [tsc, '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--skipLibCheck', '--outDir', outDir, 'src/utils/syllabusProgress.ts', 'src/types/academics.ts'], { stdio: 'inherit' })
const utilPath = resolve(outDir, 'utils/syllabusProgress.js')
const { calculateSyllabusProgress } = await import(pathToFileURL(utilPath))
const moduleRow = (id, subject, section = 'theory') => ({ id, user_id: 'u', subject_id: subject, section, title: id, description: '', position: 0, created_at: '', updated_at: '' })
const topic = (id, module, is_complete) => ({ id, user_id: 'u', module_id: module, title: id, is_complete, position: 0, created_at: '', updated_at: '' })

test('zero topics gives zero progress; modules without topics remain zero', () => {
  const [result] = calculateSyllabusProgress([moduleRow('m1', 's1')], [])
  assert.deepEqual([result.total, result.pending, result.percentage, result.modules[0].percentage], [0, 0, 0, 0])
})
test('all topics complete gives 100 percent', () => {
  const [result] = calculateSyllabusProgress([moduleRow('m1', 's1')], [topic('t1', 'm1', true), topic('t2', 'm1', true)])
  assert.equal(result.percentage, 100)
  assert.equal(result.completed, 2)
})
test('mixed completion reports completed and pending counts', () => {
  const [result] = calculateSyllabusProgress([moduleRow('m1', 's1')], [topic('t1', 'm1', true), topic('t2', 'm1', false), topic('t3', 'm1', false)])
  assert.deepEqual([result.completed, result.pending, result.percentage], [1, 2, 33])
})
test('subject progress is weighted by topic count across unequal modules', () => {
  const modules = [moduleRow('small', 's1'), moduleRow('large', 's1')]
  const topics = [topic('a', 'small', true), ...Array.from({ length: 9 }, (_, i) => topic(`b${i}`, 'large', false))]
  const [result] = calculateSyllabusProgress(modules, topics)
  assert.deepEqual([result.percentage, result.total, result.completed], [10, 10, 1])
  assert.notEqual(result.percentage, 50)
})
test('Theory and Practical use their actual module sections', () => {
  const modules = [moduleRow('theory', 's1', 'theory'), moduleRow('practical', 's1', 'practical')]
  const topics = [topic('t1', 'theory', true), topic('t2', 'theory', false), topic('p1', 'practical', true)]
  const [result] = calculateSyllabusProgress(modules, topics)
  assert.deepEqual([result.theory.total, result.theory.completed, result.theory.percentage], [2, 1, 50])
  assert.deepEqual([result.practical.total, result.practical.completed, result.practical.percentage], [1, 1, 100])
})
test('subject with no modules has no progress result', () => {
  assert.deepEqual(calculateSyllabusProgress([], []), [])
})
test('queried subject with no modules remains present at zero progress', () => {
  const subject = { id: 's-empty', user_id: 'u', kind: 'subject', name: 'Empty', credits: 3, description: '', notes: '', created_at: '', updated_at: '' }
  const [result] = calculateSyllabusProgress([], [], [subject])
  assert.deepEqual([result.subjectId, result.total, result.completed, result.pending, result.percentage], ['s-empty', 0, 0, 0, 0])
})
test('percentages round to whole numbers', () => {
  const [result] = calculateSyllabusProgress([moduleRow('m1', 's1')], [topic('a', 'm1', true), topic('b', 'm1', true), topic('c', 'm1', false), topic('d', 'm1', false), topic('e', 'm1', false), topic('f', 'm1', false), topic('g', 'm1', false)])
  assert.equal(result.percentage, 29)
})

process.on('exit', () => rmSync(outDir, { recursive: true, force: true }))
