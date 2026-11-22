import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function localConfig() {
  const url = process.env.SEMESTEROS_SUPABASE_URL
  const anonKey = process.env.SEMESTEROS_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SEMESTEROS_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceRoleKey) throw new Error('Set local Supabase URL, anon key, and service-role key environment variables.')
  const parsed = new URL(url)
  if (!['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) throw new Error('Refusing non-loopback Supabase URL; no requests were made.')
  return { url: parsed.origin, anonKey, serviceRoleKey }
}

function safeReason(error) {
  return error?.code ? `Supabase error code ${String(error.code).slice(0, 20)}` : 'Check failed; details suppressed.'
}

const results = []
const record = (name, fn) => fn().then(() => results.push({ name, ok: true }), (error) => results.push({ name, ok: false, reason: safeReason(error) }))
let admin, clientA, clientB, userA, userB
let setupError

try {
  const { url, anonKey, serviceRoleKey } = localConfig()
  const health = await fetch(`${url}/auth/v1/health`)
  if (!health.ok) throw new Error('Local Supabase API health check failed; no test users created.')
  admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  clientA = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  clientB = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const suffix = randomBytes(12).toString('hex')
  const password = `${randomBytes(24).toString('base64url')}Aa1!`
  const a = await admin.auth.admin.createUser({ email: `semesteros-assignment-a-${suffix}@example.test`, password, email_confirm: true })
  if (a.error || !a.data.user) throw a.error ?? new Error('Temporary user A creation failed.')
  userA = a.data.user
  const b = await admin.auth.admin.createUser({ email: `semesteros-assignment-b-${suffix}@example.test`, password, email_confirm: true })
  if (b.error || !b.data.user) throw b.error ?? new Error('Temporary user B creation failed.')
  userB = b.data.user
  for (const [client, user] of [[clientA, userA], [clientB, userB]]) {
    const auth = await client.auth.signInWithPassword({ email: user.email, password })
    if (auth.error || !auth.data.session) throw auth.error ?? new Error('Temporary user authentication failed.')
  }

  const [sa, sb] = await Promise.all([
    clientA.from('subjects').insert({ name: `Assignment test A ${suffix}`, credits: 3, kind: 'subject' }).select('id').single(),
    clientB.from('subjects').insert({ name: `Assignment test B ${suffix}`, credits: 3, kind: 'lab' }).select('id').single(),
  ])
  if (sa.error || sb.error) throw sa.error ?? sb.error
  const subjectA = sa.data.id, subjectB = sb.data.id

  const created = await clientA.from('assignments').insert({ subject_id: subjectA, title: `Assignment ${suffix}`, due_at: null, status: 'todo' }).select('id,user_id,subject_id,title,due_at,status').single()
  assert.ifError(created.error); assert.equal(created.data.due_at, null); assert.equal(created.data.user_id, userA.id)
  const assignmentId = created.data.id
  results.push({ name: 'Create assignment and nullable deadline', ok: true })

  await record('List and subject relationship selection', async () => {
    const { data, error } = await clientA.from('assignments').select('id,subject:subjects(id,name,kind)').eq('subject_id', subjectA)
    assert.ifError(error); assert.equal(data.length, 1); assert.equal(data[0].subject.kind, 'subject')
  })
  await record('Fetch assignment by ID', async () => {
    const { data, error } = await clientA.from('assignments').select('id').eq('id', assignmentId).single()
    assert.ifError(error); assert.equal(data.id, assignmentId)
  })
  await record('All four allowed statuses', async () => {
    for (const status of ['todo', 'in_progress', 'submitted', 'done']) {
      const { error } = await clientA.from('assignments').update({ status }).eq('id', assignmentId)
      assert.ifError(error)
    }
  })
  await record('Invalid title and status rejected', async () => {
    const blank = await clientA.from('assignments').insert({ subject_id: subjectA, title: '   ' })
    assert.equal(blank.error?.code, '23514')
    const status = await clientA.from('assignments').insert({ subject_id: subjectA, title: `Invalid status ${suffix}`, status: 'invalid' })
    assert.equal(status.error?.code, '23514')
  })
  await record('Combined subject and status filters', async () => {
    const { data, error } = await clientA.from('assignments').select('id').eq('subject_id', subjectA).eq('status', 'done')
    assert.ifError(error); assert.ok(data.some((row) => row.id === assignmentId))
  })
  await record('Update assignment', async () => {
    const { data, error } = await clientA.from('assignments').update({ title: `Updated ${suffix}`, status: 'in_progress' }).eq('id', assignmentId).select('title,status').single()
    assert.ifError(error); assert.equal(data.title, `Updated ${suffix}`); assert.equal(data.status, 'in_progress')
  })

  const other = await clientB.from('assignments').insert({ subject_id: subjectB, title: `Private ${suffix}` }).select('id').single()
  if (other.error) throw other.error
  const otherId = other.data.id
  await record('User A cannot read User B assignment', async () => {
    const { data, error } = await clientA.from('assignments').select('id').eq('id', otherId)
    assert.ifError(error); assert.equal(data.length, 0)
  })
  await record('User A cannot update User B assignment', async () => {
    const { data, error } = await clientA.from('assignments').update({ title: 'Unauthorized' }).eq('id', otherId).select('id')
    assert.ifError(error); assert.equal(data.length, 0)
  })
  await record('User A cannot delete User B assignment', async () => {
    const { data, error } = await clientA.from('assignments').delete().eq('id', otherId).select('id')
    assert.ifError(error); assert.equal(data.length, 0)
  })
  await record('User A cannot link assignment to User B subject', async () => {
    const { error } = await clientA.from('assignments').insert({ subject_id: subjectB, title: `Cross user ${suffix}` })
    assert.equal(error?.code, '23503')
  })
  await record('Delete assignment', async () => {
    const { data, error } = await clientA.from('assignments').delete().eq('id', assignmentId).select('id')
    assert.ifError(error); assert.equal(data.length, 1)
  })
} catch (error) {
  setupError = safeReason(error)
} finally {
  await clientA?.auth.signOut().catch(() => {})
  await clientB?.auth.signOut().catch(() => {})
  let cleanupOk = true
  if (admin) {
    for (const user of [userA, userB]) if (user) {
      const { error } = await admin.auth.admin.deleteUser(user.id)
      if (error) cleanupOk = false
    }
  } else if (userA || userB) cleanupOk = false
  results.push({ name: 'Temporary-user cleanup', ok: cleanupOk })
}

if (setupError) console.log(`Integration setup blocked/failed: ${setupError}`)
for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'}: ${result.name}${result.reason ? ` (${result.reason})` : ''}`)
if (setupError || results.some((result) => !result.ok)) process.exitCode = 1
