import { expect, mock, test } from 'claude-code/testing'

const PLAN_PATH = '/repo/.scratch/metrics/plans/metrics-plan.md'

const plan = (first: string) => `# Metrics Implementation Plan

**Execution:** in-progress

## Tasks

### Task 1: Add ordering_user tag (${first})

### Task 2: Add ordering_type tag (pending)
`

const PROPS = { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 100 }

// The events below are the shapes a real session raises (captured with a logging mod under `claude -p`).
// A session never raises skill.prompt for a user-tier plugin: cc-plugin-sec-default bypasses it, so no test does.
const TYPED_IMPLEMENT = { text: '/mattpocock-skills:implement' }

test('typed /implement binds a plan it edits without reading it first', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('ui.render', async () => ({ type: 'Box', props: {}, children: [] }))
  let text = plan('pending')
  on('fs.read', async () => ({ value: text }))
  on('fs.stat', async () => ({ value: { mtimeMs: 1, size: text.length, isFile: true, isDirectory: false } }))
  on('prompt.submit', async ($, e) => ({ text: e.text }))
  on('tool.call', async () => ({ result: { filePath: PLAN_PATH } }))

  // The plan was written earlier in the session, so /implement goes straight to Edit.
  await $.prompt.submit(TYPED_IMPLEMENT)
  text = plan('completed')
  await $.tool.call({ tool: 'Edit', file_path: PLAN_PATH, old_string: '(pending)', new_string: '(completed)' })

  const band = await $.ui.mount({ plugin: 'plan-progress', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  expect(await band.find({ text: /✓.*Add ordering_user tag/ })).toBeDefined()
  expect(await band.find({ text: /▶.*Add ordering_type tag/ })).toBeDefined()
})

test('typed /implement binds a plan read before it was invoked', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('ui.render', async () => ({ type: 'Box', props: {}, children: [] }))
  on('fs.read', async () => ({ value: plan('pending') }))
  on('prompt.submit', async ($, e) => ({ text: e.text }))
  on('tool.call', async () => ({ result: { type: 'text', file: { filePath: PLAN_PATH } } }))

  // "check plan" first, then /implement: the plan is in context and never read again.
  await $.tool.call({ tool: 'Read', file_path: PLAN_PATH })
  await $.prompt.submit(TYPED_IMPLEMENT)

  const band = await $.ui.mount({ plugin: 'plan-progress', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  expect(await band.find({ text: /▶.*Add ordering_user tag/ })).toBeDefined()
})

test('typed /implement binds a plan it edits through Bash', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('ui.render', async () => ({ type: 'Box', props: {}, children: [] }))
  let text = plan('pending')
  on('fs.read', async () => ({ value: text }))
  on('fs.stat', async () => ({ value: { mtimeMs: 1, size: text.length, isFile: true, isDirectory: false } }))
  on('session.cwd', async () => ({ value: '/repo' }))
  on('prompt.submit', async ($, e) => ({ text: e.text }))
  on('tool.call', async () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await $.prompt.submit(TYPED_IMPLEMENT)
  text = plan('completed')
  await $.tool.call({
    tool: 'Bash',
    command: "python3 - <<'EOF'\np='.scratch/metrics/plans/metrics-plan.md'\nEOF",
  })

  const band = await $.ui.mount({ plugin: 'plan-progress', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  expect(await band.find({ text: /✓.*Add ordering_user tag/ })).toBeDefined()
})

const OTHER = '/main/.scratch/metrics/plans/metrics-plan.md'

/**
 * A session bound to PLAN_PATH whose files are `files`: the bound plan is pending, and any other path that exists
 * reads as completed, so the band shows ✓ only if it followed one.
 */
const boundWith = async ($: any, on: any, files: Set<string>) => {
  mock.clock(on, { now: 1_000 })
  on('ui.render', async () => ({ type: 'Box', props: {}, children: [] }))
  const exists = (path: string) => {
    if (!files.has(path)) throw new Error('ENOENT')
  }
  on('fs.read', async (_$: unknown, e: { path: string }) => {
    exists(e.path)

    return { value: plan(e.path === PLAN_PATH ? 'pending' : 'completed') }
  })
  on('fs.stat', async (_$: unknown, e: { path: string }) => {
    exists(e.path)

    return { value: { mtimeMs: 1, size: 1, isFile: true, isDirectory: false } }
  })
  on('session.cwd', async () => ({ value: '/repo' }))
  on('prompt.submit', async (_$: unknown, e: { text: string }) => ({ text: e.text }))
  on('tool.call', async () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await $.tool.call({ tool: 'Read', file_path: PLAN_PATH })
  await $.prompt.submit(TYPED_IMPLEMENT)
}

const mountBand = ($: any) =>
  $.ui.mount({ plugin: 'plan-progress', surface: 'desktop', component: 'AbovePrompt', props: PROPS })

test('a bound plan moved to another checkout is followed to its new path', async ($, on) => {
  const files = new Set([PLAN_PATH])
  await boundWith($, on, files)
  files.delete(PLAN_PATH)
  files.add(OTHER)
  await $.tool.call({ tool: 'Bash', command: `mkdir -p /main/.scratch/metrics/plans && mv .scratch/metrics/plans/metrics-plan.md /main/.scratch/metrics/plans/` })
  await $.tool.call({ tool: 'Bash', command: `P=${OTHER}\npython3 - "$P" <<'EOF'\nEOF` })

  expect(await (await mountBand($)).find({ text: /✓.*Add ordering_user tag/ })).toBeDefined()
})

test('a same-named plan in another worktree does not take over the band', async ($, on) => {
  await boundWith($, on, new Set([PLAN_PATH, OTHER]))
  await $.tool.call({ tool: 'Read', file_path: OTHER })
  await $.tool.call({ tool: 'Edit', file_path: OTHER, old_string: '(pending)', new_string: '(completed)' })

  const band = await mountBand($)
  expect(await band.find({ text: /▶.*Add ordering_user tag/ })).toBeDefined()
  expect(await band.find({ text: /✓.*Add ordering_user tag/ })).toBeUndefined()
})

test('a plan path the shell would expand does not take the band off the real plan', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000 })
  let mtimeMs = 1
  let first = 'pending'
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('ui.render', async () => ({ type: 'Box', props: {}, children: [] }))
  on('fs.read', async (_$, e) => {
    if (e.path !== PLAN_PATH) throw new Error('ENOENT')

    return { value: plan(first) }
  })
  on('fs.stat', async (_$, e) => {
    if (e.path !== PLAN_PATH) throw new Error('ENOENT')

    return { value: { mtimeMs, size: 1, isFile: true, isDirectory: false } }
  })
  on('session.cwd', async () => ({ value: '/repo' }))
  on('prompt.submit', async (_$, e) => ({ text: e.text }))
  on('tool.call', async () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  // Starting the session sets up the poll that a subagent's edit depends on.
  await $.session.start({ cwd: '/repo', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Read', file_path: PLAN_PATH })
  await $.prompt.submit(TYPED_IMPLEMENT)
  // `/repo/$WT/...` is no real file; then a subagent finishes the task, which only the poll sees.
  await $.tool.call({ tool: 'Bash', command: `python3 - "$WT/.scratch/metrics/plans/metrics-plan.md" <<'EOF'\nEOF` })
  first = 'completed'
  mtimeMs = 2
  await clock.advance(3_000)

  expect(await (await mountBand($)).find({ text: /✓.*Add ordering_user tag/ })).toBeDefined()
})

test('implement through the Skill tool binds the plan in its args', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('ui.render', async () => ({ type: 'Box', props: {}, children: [] }))
  on('fs.read', async () => ({ value: plan('pending') }))
  on('session.cwd', async () => ({ value: '/repo' }))
  on('tool.call', async () => ({ result: { success: true, commandName: 'mattpocock-skills:implement' } }))

  await $.tool.call({ tool: 'Skill', skill: 'mattpocock-skills:implement', args: '.scratch/metrics/plans/metrics-plan.md' })

  const band = await $.ui.mount({ plugin: 'plan-progress', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  expect(await band.find({ text: /▶.*Add ordering_user tag/ })).toBeDefined()
})

test('a plan edit with no /implement before it binds nothing', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('ui.render', async () => ({ type: 'Box', props: {}, children: [] }))
  on('fs.read', async () => ({ value: plan('pending') }))
  on('tool.call', async () => ({ result: { filePath: PLAN_PATH } }))

  await $.tool.call({ tool: 'Edit', file_path: PLAN_PATH, old_string: '(pending)', new_string: '(completed)' })

  const band = await $.ui.mount({ plugin: 'plan-progress', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  expect(await band.find({ text: /Add ordering_user tag/ })).toBeUndefined()
})
