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
