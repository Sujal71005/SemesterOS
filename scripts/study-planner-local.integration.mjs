import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const results = []
const names = [
  'Local Auth health and two authenticated temporary users',
  'Create recurring lecture session',
  'Create one-time self-study session',
  'List and retrieve sessions',
  'Update session fields',
  'Database rejects invalid schedule combinations',
  'Database rejects invalid time ranges',
  'Valid subject and lab relationships',
  'Composite FK rejects cross-user subject relationship',
  'User A cannot read, update, or delete User B sessions',
  'Create completed, skipped, and planned logs',
  'Database rejects invalid status/completed_at combinations',
  'Occurrence-date service validation test status',
  'Database rejects duplicate occurrence logs',
  'Subject deletion sets session subject_id to null',
  'Session deletion cascades to occurrence logs',
]

function safeReason(error) {
  if (error?.localSetup) return error.localSetup
  if (error?.code) return `Supabase error code ${String(error.code).slice(0, 20)}`
  return 'Check failed; details suppressed.'
}

function setupError(message) {
  const error = new Error(message)
  error.localSetup = message
  return error
}

function getLocalConfig() {
  const url = process.env.SEMESTEROS_SUPABASE_URL
  const anonKey = process.env.SEMESTEROS_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SEMESTEROS_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceRoleKey) {
    throw setupError('Set SEMESTEROS_SUPABASE_URL, SEMESTEROS_SUPABASE_ANON_KEY, and SEMESTEROS_SUPABASE_SERVICE_ROLE_KEY to local Supabase values.')
  }
  let parsed
  try { parsed = new URL(url) } catch { throw setupError('SEMESTEROS_SUPABASE_URL is invalid; no requests were made.') }
  if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    throw setupError('Refusing non-loopback Supabase URL; no requests were made.')
  }
  return { url: parsed.origin, anonKey, serviceRoleKey }
}

const record = async (name, fn) => {
  try { await fn(); results.push({ name, status: 'PASS' }) }
  catch (error) { results.push({ name, status: 'FAIL', reason: safeReason(error) }) }
}

const sessionColumns = 'id,user_id,subject_id,title,description,session_category,schedule_type,day_of_week,session_date,start_time,end_time,created_at,updated_at'
const sessionJoin = `${sessionColumns},subject:subjects(id,name,kind)`
const logColumns = 'id,user_id,session_id,occurrence_date,status,completed_at,created_at'
const recurring = (title, values = {}) => ({
  title, description: '', session_category: 'lecture', schedule_type: 'recurring',
  day_of_week: 0, session_date: null, start_time: '09:00', end_time: '10:00', ...values,
})
const oneTime = (title, date, values = {}) => ({
  title, description: '', session_category: 'self_study', schedule_type: 'one_time',
  day_of_week: null, session_date: date, start_time: '14:00', end_time: '15:00', ...values,
})

let admin, clientA, clientB, userA, userB
let subjectA, labA, subjectB, sessionA, sessionB, sessionForSubjectDelete, sessionForCascade
let setupFailure = null
let serviceValidationStatus = 'not-run'

try {
  const { url, anonKey, serviceRoleKey } = getLocalConfig()
  const health = await fetch(`${url}/auth/v1/health`)
  if (!health.ok) throw setupError('Local Supabase Auth health check failed; no test users were created.')

  admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  clientA = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  clientB = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const suffix = randomBytes(10).toString('hex')
  const password = `${randomBytes(24).toString('base64url')}Aa1!`

  const makeUser = async (label) => {
    const { data, error } = await admin.auth.admin.createUser({
      email: `semesteros-study-${label}-${suffix}@example.test`, password, email_confirm: true,
    })
    if (error || !data.user) throw error ?? new Error('Temporary user creation failed.')
    return data.user
  }
  userA = await makeUser('a')
  userB = await makeUser('b')
  for (const [client, user] of [[clientA, userA], [clientB, userB]]) {
    const { data, error } = await client.auth.signInWithPassword({ email: user.email, password })
    if (error || !data.session) throw error ?? new Error('Temporary user sign-in failed.')
  }
  results.push({ name: names[0], status: 'PASS' })

  const makeSubject = async (client, name, kind) => {
    const { data, error } = await client.from('subjects').insert({ name, kind, credits: 3 }).select('id').single()
    if (error) throw error
    return data.id
  }
  subjectA = await makeSubject(clientA, `Planner subject ${suffix}`, 'subject')
  labA = await makeSubject(clientA, `Planner lab ${suffix}`, 'lab')
  subjectB = await makeSubject(clientB, `Planner subject B ${suffix}`, 'subject')

  const insertSession = (client, input) => client.from('study_sessions').insert(input).select(sessionJoin).single()
  const readSession = (client, id) => client.from('study_sessions').select(sessionJoin).eq('id', id).maybeSingle()

  await record(names[1], async () => {
    const { data, error } = await insertSession(clientA, recurring(`Recurring lecture ${suffix}`, { subject_id: subjectA }))
    if (error) throw error
    sessionA = data.id
    if (data.user_id !== userA.id || data.day_of_week !== 0 || data.session_date !== null) throw new Error('Recurring row does not match expected owner or Sunday schedule.')
  })
  await record(names[2], async () => {
    const { data, error } = await insertSession(clientA, oneTime(`One-time study ${suffix}`, '2030-01-02'))
    if (error) throw error
    if (data.schedule_type !== 'one_time' || data.session_date !== '2030-01-02' || data.day_of_week !== null) throw new Error('One-time row does not match expected schedule.')
  })
  await record(names[3], async () => {
    const { data, error } = await clientA.from('study_sessions').select(sessionJoin).order('start_time')
    if (error) throw error
    if (!data.some((row) => row.id === sessionA) || data.some((row) => row.user_id !== userA.id)) throw new Error('Session list did not match authenticated ownership.')
    const fetched = await readSession(clientA, sessionA)
    if (fetched.error || !fetched.data || fetched.data.id !== sessionA) throw fetched.error ?? new Error('Session retrieval failed.')
  })
  await record(names[4], async () => {
    const { data, error } = await clientA.from('study_sessions').update({ title: `Updated planner ${suffix}`, description: 'updated', end_time: '10:30' }).eq('id', sessionA).select('id,title,description,end_time').single()
    if (error) throw error
    if (data.title !== `Updated planner ${suffix}` || data.description !== 'updated' || data.end_time !== '10:30:00') throw new Error('Updated values do not match.')
  })
  await record(names[5], async () => {
    for (const input of [
      recurring(`Bad schedule ${suffix}`, { day_of_week: null }),
      recurring(`Bad schedule ${suffix}`, { session_date: '2030-01-02' }),
      oneTime(`Bad schedule ${suffix}`, null, { day_of_week: 0 }),
      oneTime(`Bad schedule ${suffix}`, null),
      recurring(`Bad weekday ${suffix}`, { day_of_week: 7 }),
    ]) {
      const { error } = await clientA.from('study_sessions').insert(input)
      if (error?.code !== '23514') throw error ?? new Error('Expected schedule CHECK violation 23514.')
    }
  })
  await record(names[6], async () => {
    for (const end_time of ['09:00', '08:59']) {
      const { error } = await clientA.from('study_sessions').insert(recurring(`Bad time ${suffix}`, { end_time }))
      if (error?.code !== '23514') throw error ?? new Error('Expected time-range CHECK violation 23514.')
    }
  })
  await record(names[7], async () => {
    for (const [subject_id, expectedKind] of [[subjectA, 'subject'], [labA, 'lab']]) {
      const { data, error } = await insertSession(clientA, recurring(`Linked ${expectedKind} ${suffix}`, { subject_id }))
      if (error) throw error
      if (data.subject?.id !== subject_id || data.subject.kind !== expectedKind) throw new Error('Subject relationship did not resolve as expected.')
    }
  })
  await record(names[8], async () => {
    const { error } = await insertSession(clientA, recurring(`Cross subject ${suffix}`, { subject_id: subjectB }))
    if (error?.code !== '23503') throw error ?? new Error('Expected composite ownership FK violation 23503.')
  })

  const other = await insertSession(clientB, recurring(`Private session ${suffix}`, { subject_id: subjectB }))
  if (other.error) throw other.error
  sessionB = other.data.id
  await record(names[9], async () => {
    const read = await readSession(clientA, sessionB)
    if (read.error || read.data) throw read.error ?? new Error('User A could read User B session.')
    const update = await clientA.from('study_sessions').update({ title: 'Unauthorized update' }).eq('id', sessionB).select('id')
    if (update.error || update.data?.length) throw update.error ?? new Error('User A updated User B session.')
    const verify = await clientB.from('study_sessions').select('title').eq('id', sessionB).single()
    if (verify.error || verify.data.title !== `Private session ${suffix}`) throw verify.error ?? new Error('Denied update altered User B session.')
    const remove = await clientA.from('study_sessions').delete().eq('id', sessionB).select('id')
    if (remove.error || remove.data?.length) throw remove.error ?? new Error('User A deleted User B session.')
    const stillThere = await clientB.from('study_sessions').select('id').eq('id', sessionB).maybeSingle()
    if (stillThere.error || !stillThere.data) throw stillThere.error ?? new Error('Denied delete removed User B session.')
  })

  await record(names[10], async () => {
    const rows = [
      { session_id: sessionA, occurrence_date: '2030-01-06', status: 'completed', completed_at: new Date().toISOString() },
      { session_id: sessionA, occurrence_date: '2030-01-13', status: 'skipped', completed_at: null },
      { session_id: sessionA, occurrence_date: '2030-01-20', status: 'planned', completed_at: null },
    ]
    const { data, error } = await clientA.from('study_session_logs').insert(rows).select(logColumns)
    if (error) throw error
    if (data.length !== 3 || data.some((row) => row.user_id !== userA.id)) throw new Error('Expected three owned occurrence logs.')
  })
  await record(names[11], async () => {
    for (const input of [
      { session_id: sessionA, occurrence_date: '2030-01-27', status: 'completed', completed_at: null },
      { session_id: sessionA, occurrence_date: '2030-02-03', status: 'skipped', completed_at: new Date().toISOString() },
      { session_id: sessionA, occurrence_date: '2030-02-10', status: 'invalid', completed_at: null },
    ]) {
      const { error } = await clientA.from('study_session_logs').insert(input)
      if (error?.code !== '23514') throw error ?? new Error('Expected status/completion CHECK violation 23514.')
    }
  })
  results.push({ name: names[12], status: 'SKIP', reason: 'Service-level occurrence validation is not a database constraint; standalone Node cannot safely import the application client using import.meta.env. Covered by utility/service validation tests instead.' })
  await record(names[13], async () => {
    const { error } = await clientA.from('study_session_logs').insert({ session_id: sessionA, occurrence_date: '2030-01-06', status: 'skipped', completed_at: null })
    if (error?.code !== '23505') throw error ?? new Error('Expected unique occurrence violation 23505.')
  })
  await record(names[14], async () => {
    const { data: row, error: createError } = await insertSession(clientA, recurring(`Subject delete ${suffix}`, { subject_id: subjectA }))
    if (createError) throw createError
    sessionForSubjectDelete = row.id
    const { error } = await clientA.from('subjects').delete().eq('id', subjectA)
    if (error) throw error
    const result = await clientA.from('study_sessions').select('id,subject_id').eq('id', sessionForSubjectDelete).single()
    if (result.error || result.data.subject_id !== null) throw result.error ?? new Error('Subject deletion did not preserve session with null subject_id.')
  })
  await record(names[15], async () => {
    const { data: row, error: createError } = await insertSession(clientA, recurring(`Cascade session ${suffix}`))
    if (createError) throw createError
    sessionForCascade = row.id
    const { error: logError } = await clientA.from('study_session_logs').insert({ session_id: sessionForCascade, occurrence_date: '2030-01-06', status: 'skipped', completed_at: null })
    if (logError) throw logError
    const { error } = await clientA.from('study_sessions').delete().eq('id', sessionForCascade)
    if (error) throw error
    const logs = await clientA.from('study_session_logs').select('id').eq('session_id', sessionForCascade)
    if (logs.error || logs.data.length) throw logs.error ?? new Error('Session deletion did not cascade to its logs.')
  })
} catch (error) {
  setupFailure = error?.localSetup ?? (error?.code ? `Setup failed with Supabase error code ${String(error.code).slice(0, 20)}.` : 'Setup failed; details suppressed.')
} finally {
  await clientA?.auth.signOut().catch(() => {})
  await clientB?.auth.signOut().catch(() => {})
  let cleanupStatus = admin ? 'PASS' : (userA || userB ? 'FAIL' : 'SKIP')
  if (admin) {
    for (const user of [userA, userB]) if (user) {
      const { error } = await admin.auth.admin.deleteUser(user.id)
      if (error) cleanupStatus = 'FAIL'
    }
  }
  results.push({ name: 'Cleanup temporary users and cascaded records', status: cleanupStatus, reason: cleanupStatus === 'SKIP' ? 'No temporary users were created.' : undefined })
}

if (setupFailure) {
  for (const name of names) if (!results.some((result) => result.name === name)) {
    results.push({ name, status: 'SKIP', reason: `Setup did not reach this test: ${setupFailure}` })
  }
}
for (const result of results) console.log(`${result.status}: ${result.name}${result.reason ? ` — ${result.reason}` : ''}`)
const passed = results.filter((result) => result.status === 'PASS').length
const failed = results.filter((result) => result.status === 'FAIL').length
const skipped = results.filter((result) => result.status === 'SKIP').length
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped, ${results.length} total`)
if (failed || setupFailure) process.exitCode = 1
