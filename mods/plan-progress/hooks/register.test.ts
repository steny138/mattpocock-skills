import { expect, mock, test } from 'claude-code/testing'

const PLAN_PATH = '/repo/.scratch/metrics/plans/metrics-plan.md'

const plan = (first: string) => `# Metrics Implementation Plan

**Execution:** in-progress

## Tasks

### Task 1: Add ordering_user tag (${first})

### Task 2: Add ordering_type tag (pending)
`

const PROPS = { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 100 }

test('/implement binds a plan it edits without reading it first', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('ui.render', async () => ({ type: 'Box', props: {}, children: [] }))
  let text = plan('pending')
  on('fs.read', async () => ({ value: text }))
  on('fs.stat', async () => ({ value: { mtimeMs: 1, size: text.length, isFile: true, isDirectory: false } }))
  on('skill.prompt', async ($, e) => ({ text: e.text }))
  on('tool.call', async () => ({ result: { filePath: PLAN_PATH } }))

  // The plan was written earlier in the session, so /implement goes straight to Edit.
  await $.skill.prompt({ skill: 'mattpocock-skills:implement', text: '# Implement' })
  text = plan('completed')
  await $.tool.call({ tool: 'Edit', file_path: PLAN_PATH, old_string: '(pending)', new_string: '(completed)' })

  const band = await $.ui.mount({ plugin: 'plan-progress', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  expect(await band.find({ text: /✓.*Add ordering_user tag/ })).toBeDefined()
  expect(await band.find({ text: /▶.*Add ordering_type tag/ })).toBeDefined()
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
