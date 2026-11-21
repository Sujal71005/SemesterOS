import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const results = []
const test = async (name, fn) => {
  try {
    await fn()
    results.push({ name, status: 'PASS' })
  } catch (error) {
    results.push({ name, status: 'FAIL', reason: safeReason(error) })
  }
}

function safeReason(error) {
  if (error?.code) return `Supabase error code ${String(error.code).slice(0, 20)}`
  if (error?.localSetup) return error.localSetup
  return 'Check failed; details suppressed to avoid exposing credentials or tokens.'
}

function localCliConfig() {
  const url = process.env.SEMESTEROS_SUPABASE_URL
  const anonKey = process.env.SEMESTEROS_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SEMESTEROS_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceRoleKey) throw setupError('Set SEMESTEROS_SUPABASE_URL, SEMESTEROS_SUPABASE_ANON_KEY, and SEMESTEROS_SUPABASE_SERVICE_ROLE_KEY in PowerShell using local Supabase values.')
  let parsedUrl
  try { parsedUrl = new URL(url) } catch { throw setupError('SEMESTEROS_SUPABASE_URL is not a valid URL.') }
  if (!['localhost', '127.0.0.1'].includes(parsedUrl.hostname)) throw setupError('Refusing non-loopback Supabase URL; no database requests were made.')
  return { url: parsedUrl.origin, anonKey, serviceRoleKey }
}

function setupError(message) {
  const error = new Error(message)
  error.localSetup = message
  return error
}
const names = [
  'User A creates/authenticates',
  'User B creates/authenticates',
  'User A inserts own subject',
  'User B inserts own subject',
  'User A reads own subject',
  'User A cannot read User B subject',
  'User A cannot update User B subject',
  'User A cannot delete User B subject',
  'User A cannot create module for User B subject',
  'User A creates module for own subject',
  'User A cannot create assignment for User B subject',
  'User A cannot create topic for User B module',
  'Composite foreign keys reject cross-user relationships',
]

let admin
let clientA
let clientB
let userA
let userB
let subjectA
let subjectB
let moduleA
let moduleB
let crossUserRejects = 0
let setupFailure

try {
  const { url, anonKey, serviceRoleKey } = localCliConfig()
  admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  clientA = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  clientB = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const suffix = randomBytes(10).toString('hex')
  const password = `${randomBytes(24).toString('base64url')}Aa1!`
  const createdA = await admin.auth.admin.createUser({
    email: `semesteros-local-a-${suffix}@example.test`,
    password,
    email_confirm: true,
  })
  if (createdA.error || !createdA.data.user) throw createdA.error ?? new Error('User A creation failed')
  userA = createdA.data.user

  const createdB = await admin.auth.admin.createUser({
    email: `semesteros-local-b-${suffix}@example.test`,
    password,
    email_confirm: true,
  })
  if (createdB.error || !createdB.data.user) throw createdB.error ?? new Error('User B creation failed')
  userB = createdB.data.user

  const signedA = await clientA.auth.signInWithPassword({ email: userA.email, password })
  if (signedA.error || !signedA.data.session) throw signedA.error ?? new Error('User A auth failed')
  results.push({ name: names[0], status: 'PASS' })

  const signedB = await clientB.auth.signInWithPassword({ email: userB.email, password })
  if (signedB.error || !signedB.data.session) throw signedB.error ?? new Error('User B auth failed')
  results.push({ name: names[1], status: 'PASS' })

  await test(names[2], async () => {
    const { data, error } = await clientA.from('subjects')
      .insert({ kind: 'subject', name: `Local A ${suffix}`, credits: 3 })
      .select('id,user_id').single()
    if (error) throw error
    subjectA = data
    if (data.user_id !== userA.id) throw new Error('Owner mismatch')
  })

  await test(names[3], async () => {
    const { data, error } = await clientB.from('subjects')
      .insert({ kind: 'subject', name: `Local B ${suffix}`, credits: 3 })
      .select('id,user_id').single()
    if (error) throw error
    subjectB = data
    if (data.user_id !== userB.id) throw new Error('Owner mismatch')
  })

  await test(names[4], async () => {
    if (!subjectA) throw new Error('User A subject unavailable')
    const { data, error } = await clientA.from('subjects')
      .select('id').eq('id', subjectA.id).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Own row not visible')
  })

  await test(names[5], async () => {
    if (!subjectB) throw new Error('User B subject unavailable')
    const { data, error } = await clientA.from('subjects')
      .select('id').eq('id', subjectB.id).maybeSingle()
    if (error) throw error
    if (data) throw new Error('Other user row visible')
  })

  await test(names[6], async () => {
    if (!subjectB) throw new Error('User B subject unavailable')
    const { data, error } = await clientA.from('subjects')
      .update({ description: 'must not be written' }).eq('id', subjectB.id).select('id')
    if (error) throw error
    if (data?.length) throw new Error('Other user row was updated')
    const { data: saved, error: readError } = await admin.from('subjects')
      .select('description').eq('id', subjectB.id).single()
    if (readError) throw readError
    if (saved.description === 'must not be written') throw new Error('Unauthorized update persisted')
  })

  await test(names[7], async () => {
    if (!subjectB) throw new Error('User B subject unavailable')
    const { data, error } = await clientA.from('subjects')
      .delete().eq('id', subjectB.id).select('id')
    if (error) throw error
    if (data?.length) throw new Error('Other user row was deleted')
    const { data: saved, error: readError } = await admin.from('subjects')
      .select('id').eq('id', subjectB.id).maybeSingle()
    if (readError) throw readError
    if (!saved) throw new Error('Other user row no longer exists')
  })

  await test(names[8], async () => {
    if (!subjectB) throw new Error('User B subject unavailable')
    const { data, error } = await clientA.from('syllabus_modules')
      .insert({ subject_id: subjectB.id, section: 'theory', title: `Cross module ${suffix}` })
      .select('id')
    if (error?.code !== '23503') throw error ?? new Error('Expected composite FK violation 23503')
    if (data?.length) throw new Error('Cross-user module was inserted')
    crossUserRejects += 1
  })

  await test(names[9], async () => {
    if (!subjectA) throw new Error('User A subject unavailable')
    const { data, error } = await clientA.from('syllabus_modules')
      .insert({ subject_id: subjectA.id, section: 'theory', title: `Own module ${suffix}` })
      .select('id,user_id').single()
    if (error) throw error
    moduleA = data
    if (data.user_id !== userA.id) throw new Error('Owner mismatch')
  })

  await test('User B creates own module for cross-user topic test', async () => {
    if (!subjectB) throw new Error('User B subject unavailable')
    const { data, error } = await clientB.from('syllabus_modules')
      .insert({ subject_id: subjectB.id, section: 'theory', title: `B module ${suffix}` })
      .select('id,user_id').single()
    if (error) throw error
    moduleB = data
    if (data.user_id !== userB.id) throw new Error('Owner mismatch')
  })

  await test(names[10], async () => {
    if (!subjectB) throw new Error('User B subject unavailable')
    const { data, error } = await clientA.from('assignments')
      .insert({ subject_id: subjectB.id, title: `Cross assignment ${suffix}` })
      .select('id')
    if (error?.code !== '23503') throw error ?? new Error('Expected composite FK violation 23503')
    if (data?.length) throw new Error('Cross-user assignment was inserted')
    crossUserRejects += 1
  })

  await test(names[11], async () => {
    if (!moduleB) throw new Error('User B module unavailable')
    const { data, error } = await clientA.from('syllabus_topics')
      .insert({ module_id: moduleB.id, title: `Cross topic ${suffix}` })
      .select('id')
    if (error?.code !== '23503') throw error ?? new Error('Expected composite FK violation 23503')
    if (data?.length) throw new Error('Cross-user topic was inserted')
    crossUserRejects += 1
  })

  await test(names[12], async () => {
    if (crossUserRejects !== 3) throw new Error('Not all three composite FK checks rejected cross-user references')
  })
} catch (error) {
  setupFailure = safeReason(error)
} finally {
  if (clientA) await clientA.auth.signOut().catch(() => {})
  if (clientB) await clientB.auth.signOut().catch(() => {})

  let cleanupOk = true
  if (admin) {
    for (const user of [userA, userB]) {
      if (!user) continue
      const { error } = await admin.auth.admin.deleteUser(user.id)
      if (error) cleanupOk = false
    }
  } else if (userA || userB) {
    cleanupOk = false
  }
  results.push({ name: 'Cleanup temporary users and cascaded records', status: cleanupOk ? 'PASS' : 'FAIL' })

  if (setupFailure) {
    for (const name of names) {
      if (!results.some((result) => result.name === name)) {
        results.push({ name, status: 'FAIL', reason: `Setup incomplete: ${setupFailure}` })
      }
    }
  }
}

for (const result of results) {
  console.log(`${result.status}: ${result.name}${result.reason ? ` — ${result.reason}` : ''}`)
}

if (results.some((result) => result.status === 'FAIL')) process.exitCode = 1
