import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

// Database checks use the Supabase SDK with authenticated temporary-user clients.
// The browser service imports src/lib/supabase.ts through import.meta.env, so it
// cannot be imported directly in Node without inventing a production config.

const results = []
const records = []
let admin
let clientA
let clientB
let userA
let userB
let goalA
let deletedCrudGoal
let lifecycleGoalA
let goalB
let setupFailure = null
let prefix = ''

function safeReason(error) {
  if (error?.localSetup) return error.localSetup
  if (error?.code) return `Supabase error code ${String(error.code).slice(0, 20)}`
  if (error instanceof SkipTest) return error.message
  return 'Check failed; details suppressed to avoid exposing credentials or tokens.'
}

function setupError(message) {
  const error = new Error(message)
  error.localSetup = message
  return error
}

class SkipTest extends Error {}

function required(value, description) {
  if (value == null) throw new SkipTest(`Skipped because ${description} was not created.`)
  return value
}

async function record(name, fn) {
  try {
    await fn()
    results.push({ name, status: 'PASS' })
  } catch (error) {
    results.push({ name, status: error instanceof SkipTest ? 'SKIP' : 'FAIL', reason: safeReason(error) })
  }
}

async function runServiceValidationChecks() {
  const outDir = mkdtempSync(join(tmpdir(), 'semesteros-daily-goals-integration-'))
  try {
    execFileSync(process.execPath, [
      resolve('node_modules/typescript/bin/tsc'), '--target', 'ES2022', '--module', 'ES2022',
      '--moduleResolution', 'Bundler', '--skipLibCheck', '--outDir', outDir,
      'src/utils/dailyGoalServiceInput.ts', 'src/utils/dailyGoalValidation.ts', 'src/types/dailyGoals.ts',
    ], { stdio: 'ignore' })
    const helperPath = resolve(outDir, 'utils', 'dailyGoalServiceInput.js')
    writeFileSync(helperPath, readFileSync(helperPath, 'utf8').replace("from './dailyGoalValidation'", "from './dailyGoalValidation.js'"))
    const helpers = await import(pathToFileURL(helperPath))
    const base = { title: 'Valid integration goal', description: '', goal_date: '2035-03-10', category: 'academics' }
    const invalidInputs = [
      ['Service rejects blank title', { ...base, title: '   ' }, /title/i],
      ['Service rejects title over 180 characters', { ...base, title: 'x'.repeat(181) }, /title/i],
      ['Service rejects description over 1000 characters', { ...base, description: 'x'.repeat(1001) }, /description/i],
      ['Service rejects invalid category', { ...base, category: 'invalid' }, /category/i],
      ['Service rejects invalid priority', { ...base, priority: 'urgent' }, /priority/i],
      ['Service rejects invalid status', { ...base, status: 'blocked' }, /status/i],
    ]
    for (const [name, input, message] of invalidInputs) {
      await record(name, async () => assert.throws(() => helpers.prepareDailyGoalCreate(input), message))
    }
  } catch {
    for (const name of [
      'Service rejects blank title', 'Service rejects title over 180 characters',
      'Service rejects description over 1000 characters', 'Service rejects invalid category',
      'Service rejects invalid priority', 'Service rejects invalid status',
    ]) results.push({ name, status: 'FAIL', reason: 'Service validation helper could not be loaded.' })
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
}

function localConfig() {
  const url = process.env.SEMESTEROS_SUPABASE_URL
  const anonKey = process.env.SEMESTEROS_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SEMESTEROS_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceRoleKey) {
    throw setupError('Local Supabase variables are not configured; no Supabase requests or test setup were attempted.')
  }

  let parsed
  try { parsed = new URL(url) } catch { throw setupError('SEMESTEROS_SUPABASE_URL is invalid; no Supabase requests were made.') }
  if (!['localhost', '127.0.0.1'].includes(parsed.hostname) || parsed.username || parsed.password) {
    throw setupError('Refusing non-loopback Supabase URL; no Supabase requests or test setup were attempted.')
  }
  return { url: parsed.origin, anonKey, serviceRoleKey }
}

function goalInput(title, goalDate, changes = {}) {
  return {
    title,
    description: 'Local Daily Goals integration fixture.',
    goal_date: goalDate,
    category: 'academics',
    priority: 'medium',
    ...changes,
  }
}

function remember(row) {
  if (row?.id) records.push(row.id)
  return row
}

async function insertGoal(client, input) {
  const { data, error } = await client.from('daily_goals').insert(input).select('*').single()
  if (error) throw error
  return remember(data)
}

async function runDatabaseChecks() {
  const names = [
    'Local Auth health and two authenticated temporary users',
    'User A creates a goal without supplying user_id',
    'User A lists goals by assigned date',
    'User A retrieves a goal by ID',
    'User A updates title, description, category, priority, and date',
    'User A deletes a goal',
    'Deleted goal cannot be retrieved',
    'Pending goal begins with completed_at null',
    'Complete transition sets completed status',
    'Completion timestamp is a valid populated timestamp',
    'Reopen transition sets pending status',
    'Reopened goal has completed_at null',
    'Reopened goal can be completed again',
    'Database rejects blank title',
    'Database rejects title over 180 characters',
    'Database rejects description over 1000 characters',
    'Database rejects invalid category',
    'Database rejects invalid priority',
    'Database rejects invalid status',
    'Date-range query excludes goals outside its bounds',
    'User B cannot read User A goal',
    'User B cannot assign User A user_id on insert',
    'User B cannot update User A goal',
    'User B cannot delete User A goal',
    'User B can create and access own goal',
    'User A and User B date results remain isolated',
    'Hard-deleted goal is absent from date-range results',
  ]

  try {
    const { url, anonKey, serviceRoleKey } = localConfig()
    // The URL has been verified as loopback before this health request or any setup.
    const health = await fetch(`${url}/auth/v1/health`)
    if (!health.ok) throw setupError('Local Supabase Auth health check failed; no test users were created.')

    admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    clientA = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    clientB = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const suffix = randomBytes(12).toString('hex')
    prefix = `Daily Goals integration ${suffix}`
    const password = `${randomBytes(24).toString('base64url')}Aa1!`

    const createUser = async (label) => {
      const { data, error } = await admin.auth.admin.createUser({
        email: `semesteros-daily-goals-${label}-${suffix}@example.test`, password, email_confirm: true,
      })
      if (error || !data.user) throw error ?? new Error('Temporary user creation failed.')
      return data.user
    }
    userA = await createUser('a')
    userB = await createUser('b')
    for (const [client, user] of [[clientA, userA], [clientB, userB]]) {
      const { data, error } = await client.auth.signInWithPassword({ email: user.email, password })
      if (error || !data.session) throw error ?? new Error('Temporary user sign-in failed.')
    }
    results.push({ name: names[0], status: 'PASS' })

    await record(names[1], async () => {
      goalA = await insertGoal(clientA, goalInput(`${prefix} CRUD`, '2035-01-10'))
      assert.equal(goalA.user_id, userA.id)
    })
    await record(names[2], async () => {
      const row = required(goalA, 'User A CRUD goal')
      const { data, error } = await clientA.from('daily_goals').select('*').eq('goal_date', row.goal_date)
      if (error) throw error
      assert.ok(data.some((item) => item.id === row.id))
      assert.ok(data.every((item) => item.user_id === userA.id))
    })
    await record(names[3], async () => {
      const row = required(goalA, 'User A CRUD goal')
      const { data, error } = await clientA.from('daily_goals').select('*').eq('id', row.id).maybeSingle()
      if (error) throw error
      assert.equal(data?.id, row.id)
    })
    await record(names[4], async () => {
      const row = required(goalA, 'User A CRUD goal')
      const { data, error } = await clientA.from('daily_goals').update({
        title: `${prefix} updated`, description: 'Updated by authenticated User A.', category: 'dsa',
        priority: 'high', goal_date: '2035-01-11',
      }).eq('id', row.id).select('*').single()
      if (error) throw error
      assert.equal(data.title, `${prefix} updated`)
      assert.equal(data.description, 'Updated by authenticated User A.')
      assert.equal(data.category, 'dsa')
      assert.equal(data.priority, 'high')
      assert.equal(data.goal_date, '2035-01-11')
      goalA = data
      deletedCrudGoal = data
    })
    await record(names[5], async () => {
      const row = required(goalA, 'User A CRUD goal')
      const { data, error } = await clientA.from('daily_goals').delete().eq('id', row.id).select('id')
      if (error) throw error
      assert.equal(data.length, 1)
      goalA = null
    })
    await record(names[6], async () => {
      const id = required(deletedCrudGoal?.id, 'deleted goal ID')
      const { data, error } = await clientA.from('daily_goals').select('id').eq('id', id).maybeSingle()
      if (error) throw error
      assert.equal(data, null)
    })

    await record(names[7], async () => {
      lifecycleGoalA = await insertGoal(clientA, goalInput(`${prefix} lifecycle`, '2035-03-10'))
      assert.equal(lifecycleGoalA.status, 'pending')
      assert.equal(lifecycleGoalA.completed_at, null)
    })
    await record(names[8], async () => {
      const row = required(lifecycleGoalA, 'lifecycle goal')
      const { data, error } = await clientA.from('daily_goals').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', row.id).select('*').single()
      if (error) throw error
      assert.equal(data.status, 'completed')
      lifecycleGoalA = data
    })
    await record(names[9], async () => {
      const row = required(lifecycleGoalA, 'lifecycle goal')
      assert.ok(row.completed_at)
      assert.ok(Number.isFinite(Date.parse(row.completed_at)))
    })
    await record(names[10], async () => {
      const row = required(lifecycleGoalA, 'lifecycle goal')
      const { data, error } = await clientA.from('daily_goals').update({ status: 'pending', completed_at: null }).eq('id', row.id).select('*').single()
      if (error) throw error
      assert.equal(data.status, 'pending')
      lifecycleGoalA = data
    })
    await record(names[11], async () => assert.equal(required(lifecycleGoalA, 'lifecycle goal').completed_at, null))
    await record(names[12], async () => {
      const row = required(lifecycleGoalA, 'lifecycle goal')
      const { data, error } = await clientA.from('daily_goals').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', row.id).select('*').single()
      if (error) throw error
      assert.equal(data.status, 'completed')
      assert.ok(Number.isFinite(Date.parse(data.completed_at)))
      lifecycleGoalA = data
    })

    const invalidRows = [
      { name: names[13], changes: { title: '   ' } },
      { name: names[14], changes: { title: 'x'.repeat(181) } },
      { name: names[15], changes: { description: 'x'.repeat(1001) } },
      { name: names[16], changes: { category: 'invalid' } },
      { name: names[17], changes: { priority: 'urgent' } },
      { name: names[18], changes: { status: 'blocked' } },
    ]
    for (const { name, changes } of invalidRows) {
      await record(name, async () => {
        const { data, error } = await clientA.from('daily_goals').insert(goalInput(`${prefix} invalid`, '2035-04-10', changes)).select('id')
        assert.equal(error?.code, '23514')
        assert.equal(data, null)
      })
    }

    await record(names[19], async () => {
      const before = await insertGoal(clientA, goalInput(`${prefix} range before`, '2035-02-09'))
      const inside = await insertGoal(clientA, goalInput(`${prefix} range inside`, '2035-02-10'))
      const after = await insertGoal(clientA, goalInput(`${prefix} range after`, '2035-02-11'))
      const { data, error } = await clientA.from('daily_goals').select('id').gte('goal_date', '2035-02-10').lte('goal_date', '2035-02-10')
      if (error) throw error
      assert.deepEqual(data.map((item) => item.id), [inside.id])
      assert.ok(!data.some((item) => item.id === before.id || item.id === after.id))
    })

    await record(names[20], async () => {
      const row = required(lifecycleGoalA, 'User A lifecycle goal')
      const { data, error } = await clientB.from('daily_goals').select('id').eq('id', row.id).maybeSingle()
      if (error) throw error
      assert.equal(data, null)
    })
    await record(names[21], async () => {
      const { data, error } = await clientB.from('daily_goals')
        .insert({ ...goalInput(`${prefix} spoofed owner`, '2035-03-11'), user_id: userA.id }).select('id')
      assert.equal(error?.code, '42501')
      assert.equal(data, null)
    })
    await record(names[22], async () => {
      const row = required(lifecycleGoalA, 'User A lifecycle goal')
      const { data, error } = await clientB.from('daily_goals').update({ title: `${prefix} unauthorized` }).eq('id', row.id).select('id')
      if (error) throw error
      assert.equal(data.length, 0)
      const verify = await clientA.from('daily_goals').select('title').eq('id', row.id).single()
      if (verify.error) throw verify.error
      assert.equal(verify.data.title, row.title)
    })
    await record(names[23], async () => {
      const row = required(lifecycleGoalA, 'User A lifecycle goal')
      const { data, error } = await clientB.from('daily_goals').delete().eq('id', row.id).select('id')
      if (error) throw error
      assert.equal(data.length, 0)
      const verify = await clientA.from('daily_goals').select('id').eq('id', row.id).maybeSingle()
      if (verify.error) throw verify.error
      assert.equal(verify.data?.id, row.id)
    })
    await record(names[24], async () => {
      goalB = await insertGoal(clientB, goalInput(`${prefix} user B`, '2035-03-10', { category: 'personal', priority: 'low' }))
      assert.equal(goalB.user_id, userB.id)
      const { data, error } = await clientB.from('daily_goals').select('*').eq('id', goalB.id).single()
      if (error) throw error
      assert.equal(data.user_id, userB.id)
    })
    await record(names[25], async () => {
      const rowA = required(lifecycleGoalA, 'User A lifecycle goal')
      const rowB = required(goalB, 'User B goal')
      const [aRows, bRows] = await Promise.all([
        clientA.from('daily_goals').select('id,user_id').eq('goal_date', '2035-03-10'),
        clientB.from('daily_goals').select('id,user_id').eq('goal_date', '2035-03-10'),
      ])
      if (aRows.error || bRows.error) throw aRows.error ?? bRows.error
      assert.ok(aRows.data.some((row) => row.id === rowA.id))
      assert.ok(aRows.data.every((row) => row.user_id === userA.id))
      assert.ok(bRows.data.some((row) => row.id === rowB.id))
      assert.ok(bRows.data.every((row) => row.user_id === userB.id))
    })
    await record(names[26], async () => {
      const deleted = required(deletedCrudGoal, 'deleted CRUD goal')
      const { data, error } = await clientA.from('daily_goals').select('id').gte('goal_date', deleted.goal_date).lte('goal_date', deleted.goal_date)
      if (error) throw error
      assert.ok(!data.some((row) => row.id === deleted.id))
    })
  } catch (error) {
    setupFailure = safeReason(error)
  } finally {
    await clientA?.auth.signOut().catch(() => {})
    await clientB?.auth.signOut().catch(() => {})

    let cleanupStatus = admin ? 'PASS' : (userA || userB ? 'FAIL' : 'SKIP')
    if (admin) {
      if (records.length) {
        const { error } = await admin.from('daily_goals').delete().in('id', records)
        if (error) cleanupStatus = 'FAIL'
      }
      for (const user of [userA, userB]) {
        if (!user) continue
        const { error } = await admin.auth.admin.deleteUser(user.id)
        if (error) cleanupStatus = 'FAIL'
      }
    }
    results.push({ name: 'Cleanup temporary users and all their test records', status: cleanupStatus, reason: cleanupStatus === 'SKIP' ? 'No temporary users or test records were created.' : undefined })
  }

  if (setupFailure) {
    for (const name of names) {
      if (!results.some((result) => result.name === name)) results.push({ name, status: 'SKIP', reason: `Integration setup did not reach this check: ${setupFailure}` })
    }
  }
}

await runServiceValidationChecks()
await runDatabaseChecks()

for (const result of results) console.log(`${result.status}: ${result.name}${result.reason ? ` — ${result.reason}` : ''}`)
const passed = results.filter((result) => result.status === 'PASS').length
const failed = results.filter((result) => result.status === 'FAIL').length
const skipped = results.filter((result) => result.status === 'SKIP').length
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped, ${results.length} total`)
if (failed || setupFailure) process.exitCode = 1
