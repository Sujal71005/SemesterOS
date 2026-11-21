import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { calculateSyllabusProgress } from '../src/utils/syllabusProgress.ts'

const results = []
const record = (name, pass, reason = '') => results.push({ name, status: pass ? 'PASS' : 'FAIL', reason })
const safe = (error) => error?.localSetup ?? (error?.code ? `Supabase error code ${String(error.code).slice(0, 20)}` : error instanceof Error ? error.message : 'Check failed.')
function getLocalConfig() {
  const url = process.env.SEMESTEROS_SUPABASE_URL
  const anonKey = process.env.SEMESTEROS_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SEMESTEROS_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceRoleKey) {
    const error = new Error('Set SEMESTEROS_SUPABASE_URL, SEMESTEROS_SUPABASE_ANON_KEY, and SEMESTEROS_SUPABASE_SERVICE_ROLE_KEY in PowerShell using local Supabase values.')
    error.localSetup = error.message
    throw error
  }
  let parsed
  try { parsed = new URL(url) } catch {
    const error = new Error('SEMESTEROS_SUPABASE_URL is not a valid URL.')
    error.localSetup = error.message
    throw error
  }
  if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    const error = new Error('Refusing non-loopback Supabase URL; no database requests were made.')
    error.localSetup = error.message
    throw error
  }
  return { url: parsed.origin, anonKey, serviceRoleKey }
}

let admin, a, b, userA, userB, subjectA, subjectB
let setupIssue = null
try {
  const { url, anonKey, serviceRoleKey } = getLocalConfig()
  admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  a = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  b = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const suffix = randomBytes(10).toString('hex')
  const password = `${randomBytes(24).toString('base64url')}Aa1!`
  const createUser = async (label) => {
    const { data, error } = await admin.auth.admin.createUser({ email: `semesteros-analytics-${label}-${suffix}@example.test`, password, email_confirm: true })
    if (error || !data.user) throw error ?? new Error('User creation failed')
    return data.user
  }
  userA = await createUser('a'); userB = await createUser('b')
  for (const [client, user, label] of [[a,userA,'A'],[b,userB,'B']]) {
    const { data, error } = await client.auth.signInWithPassword({ email: user.email, password })
    if (error || !data.session) throw error ?? new Error(`User ${label} authentication failed`)
  }
  const makeSubject = async (client, label, empty = false) => {
    const { data, error } = await client.from('subjects').insert({ name: `Analytics ${label} ${suffix}`, credits: 3, kind: 'subject' }).select('id').single()
    if (error) throw error
    if (empty) return data.id
    const { data: modules, error: moduleError } = await client.from('syllabus_modules').insert([
      { subject_id: data.id, section: 'theory', title: `${label} Theory ${suffix}`, position: 0 },
      { subject_id: data.id, section: 'practical', title: `${label} Practical ${suffix}`, position: 1 },
    ]).select('id,section')
    if (moduleError) throw moduleError
    const theory = modules.find((row) => row.section === 'theory').id
    const practical = modules.find((row) => row.section === 'practical').id
    const { error: topicError } = await client.from('syllabus_topics').insert([
      { module_id: theory, title: `Done ${suffix}`, is_complete: true, position: 0 },
      { module_id: theory, title: `Pending ${suffix}`, is_complete: false, position: 1 },
      { module_id: practical, title: `Practical done ${suffix}`, is_complete: true, position: 0 },
    ])
    if (topicError) throw topicError
    return data.id
  }
  subjectA = await makeSubject(a, 'A')
  const emptySubjectA = await makeSubject(a, 'A empty', true)
  subjectB = await makeSubject(b, 'B')
  const analytics = async (client) => {
    const [subjects, modules, topics] = await Promise.all([
      client.from('subjects').select('id,user_id,kind,name,credits,description,notes,created_at,updated_at'),
      client.from('syllabus_modules').select('id,user_id,subject_id,section,title,description,position,created_at,updated_at'),
      client.from('syllabus_topics').select('id,user_id,module_id,title,is_complete,position,created_at,updated_at'),
    ])
    for (const response of [subjects, modules, topics]) if (response.error) throw response.error
    return { subjects: subjects.data, modules: modules.data, topics: topics.data }
  }
  const asProgress = (data) => calculateSyllabusProgress(data.modules, data.topics, data.subjects)
  const dataA = await analytics(a); const progressA = asProgress(dataA)
  record('A analytics scoped to own subjects/modules/topics', dataA.subjects.every((row) => row.user_id === userA.id) && dataA.modules.every((row) => row.user_id === userA.id) && dataA.topics.every((row) => row.user_id === userA.id) && !dataA.subjects.some((row) => row.id === subjectB))
  const target = progressA.find((row) => row.subjectId === subjectA)
  record('A totals include mixed completion counts', target?.total === 3 && target.completed === 2 && target.pending === 1 && target.percentage === 67)
  record('A Theory and Practical analytics are correct', target?.theory.total === 2 && target.theory.completed === 1 && target.theory.pending === 1 && target.theory.percentage === 50 && target.practical.total === 1 && target.practical.completed === 1 && target.practical.percentage === 100)
  record('A subject with no topics reports zero percent', progressA.some((row) => row.subjectId === emptySubjectA && row.total === 0 && row.percentage === 0))
  const dataB = await analytics(b)
  record('B analytics scoped to own subjects/modules/topics', dataB.subjects.every((row) => row.user_id === userB.id) && dataB.modules.every((row) => row.user_id === userB.id) && dataB.topics.every((row) => row.user_id === userB.id) && !dataB.subjects.some((row) => row.id === subjectA))
} catch (error) {
  setupIssue = error?.message?.startsWith('Local Supabase') || error?.message?.startsWith('Refusing') ? error.message : safe(error)
} finally {
  if (a) await a.auth.signOut().catch(() => {})
  if (b) await b.auth.signOut().catch(() => {})
  let cleanupOk = admin ? true : null
  if (admin) for (const user of [userA, userB]) if (user) {
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) cleanupOk = false
  }
  if (cleanupOk !== null) record('Cleanup temporary users and cascaded records', cleanupOk)
}

if (setupIssue) {
  for (const name of ['A analytics scoped to own subjects/modules/topics','A totals include mixed completion counts','A Theory and Practical analytics are correct','A subject with no topics reports zero percent','B analytics scoped to own subjects/modules/topics']) record(name, false, `Not run: ${setupIssue}`)
}
for (const result of results) console.log(`${result.status}: ${result.name}${result.reason ? ` — ${result.reason}` : ''}`)
const passed = results.filter((result) => result.status === 'PASS').length
const failed = results.length - passed
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${results.length} total`)
if (failed) process.exitCode = 1
