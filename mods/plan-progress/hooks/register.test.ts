import { expect, mock, test } from 'claude-code/testing'

import { displayWidth } from './plan'

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

/** The element types in a drawn tree, depth first. */
const typesIn = (node: any): string[] =>
  node === null || typeof node !== 'object' ? [] : [node.type, ...(node.children ?? []).flatMap(typesIn)]

/** A whole 1x1 PNG, as bytes: the engine refuses a `png` source that does not parse as one. */
const PNG = atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=')

/** A terminal band over a bound plan, its blits answered by `blit`; each frame reads as that PNG, its path after IEND. */
const terminalBand = async ($: any, on: any, blit: (args: any) => { value: {} } | { deny: string }, frames = true) => {
  const clock = mock.clock(on, { now: 1_000 })
  const blits: any[] = []
  on('session.start', async (_$: unknown, e: any) => ({ cwd: e.cwd }))
  on('ui.render', async () => ({ type: 'Box', props: {}, children: [] }))
  on('ui.blit', async (_$: unknown, e: any) => {
    blits.push(e)

    return blit(e)
  })
  on('fs.read', async (_$: unknown, e: { path: string; as: string }) =>
    e.as === 'bytes' ? (frames ? { value: { base64: btoa(`${PNG}${e.path}`) } } : { deny: 'ENOENT' }) : { value: plan('pending') },
  )
  on('tool.call', async () => ({ result: { success: true } }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Skill', skill: 'implement', args: PLAN_PATH })
  const band = await $.ui.mount({ plugin: 'plan-progress', surface: 'terminal', component: 'AbovePrompt', props: PROPS })

  return { band, blits, clock }
}

test('a terminal that draws pictures animates the cat as an Image of PNG bytes', async ($, on) => {
  const { band, blits, clock } = await terminalBand($, on, () => ({ value: {} }))
  expect(typesIn(await band.drawn())).toContain('Image')
  await clock.advance(400)
  expect(blits.length).toBe(2)
  // Bytes, never a path: Orca's xterm.js refuses kitty file transmission without denying the blit.
  expect(blits.every(b => b.source?.file === undefined && /\/assets\/cat-\d\.png$/.test(atob(b.source?.png ?? '')))).toBe(true)
  expect(blits[0].source.png).not.toBe(blits[1].source.png)
  expect(typesIn(await band.drawn())).not.toContain('Raster')
})

test('frames that cannot be read leave the cat a Raster', async ($, on) => {
  const { band, blits, clock } = await terminalBand($, on, () => ({ value: {} }), false)
  await clock.advance(400)
  const types = typesIn(await band.drawn())
  expect(types).toContain('Raster')
  expect(types).not.toContain('Image')
  expect(blits.every(b => b.cells !== undefined)).toBe(true)
})

test('the Image names a visible alt, so a refused picture still shows a cat', async ($, on) => {
  const { band } = await terminalBand($, on, () => ({ value: {} }))
  const image = await band.find({ type: 'Image' })
  expect(image?.props.alt.trim()).not.toBe('')
})

test('a terminal that draws the alt instead falls back to the Raster cat', async ($, on) => {
  const { band, blits, clock } = await terminalBand($, on, b => (b.source ? { deny: 'no placeholder images' } : { value: {} }))
  await clock.advance(1100)
  const types = typesIn(await band.drawn())
  expect(types).toContain('Raster')
  expect(types).not.toContain('Image')
  await clock.advance(200)
  expect(blits.at(-1).cells).toBeDefined()
})

test('a denial the engine loses while the Image mounts keeps the cat an Image', async ($, on) => {
  // The first blit can land before the Image has its image id; the engine denies it, then draws the rest.
  let blitCount = 0
  const { band, clock } = await terminalBand($, on, () => (++blitCount === 1 ? { deny: 'every 8-bit image id is in use' } : { value: {} }))
  await clock.advance(1100)
  const types = typesIn(await band.drawn())
  expect(types).toContain('Image')
  expect(types).not.toContain('Raster')
})

test('a band drawn without a cat sends no blit that could be denied', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000 })
  const blits: any[] = []
  on('session.start', async (_$: unknown, e: any) => ({ cwd: e.cwd }))
  on('ui.render', async () => ({ type: 'Box', props: {}, children: [] }))
  on('ui.blit', async (_$: unknown, e: any) => {
    blits.push(e)

    return { deny: 'nothing mounted' }
  })
  on('fs.read', async () => ({ value: plan('pending') }))
  on('tool.call', async () => ({ result: { success: true } }))
  await $.session.start({ cwd: '/repo', surface: null, isInteractive: true })
  await $.tool.call({ tool: 'Skill', skill: 'implement', args: PLAN_PATH })
  await mountBand($)
  await clock.advance(400)
  expect(blits).toEqual([])
})

const FOCUS_TITLES = [
  '全部空桌時段計算', '同步預約桌位設定', '依時段驗證桌位配置', '更新可預約人數限制',
  '移除 Config 驗證', '補預設 CONTEXT.md 說明', '驗證預約時間邊界', '整理桌位分配測試', '完成預約流程驗證',
]

/** Mounts the same plan states that the running session reads from disk. */
const focusBand = async ($: any, on: any, current = 4, status = 'in-progress', titles = FOCUS_TITLES, columns = 200) => {
  mock.clock(on, { now: 1_000 })
  on('ui.render', async () => ({ type: 'Box', props: {}, children: [] }))
  const text = `**Execution:** ${status}\n\n${titles.map((title, i) =>
    `### Task ${i + 1}: ${title} (${i < current ? 'completed' : i === current ? status : 'pending'})`,
  ).join('\n\n')}`
  on('fs.read', async () => ({ value: text }))
  on('tool.call', async () => ({ result: { success: true } }))
  await $.tool.call({ tool: 'Skill', skill: 'implement', args: PLAN_PATH })

  return $.ui.mount({ plugin: 'plan-progress', surface: 'desktop', component: 'AbovePrompt', props: { ...PROPS, bodyColumns: columns } })
}

test('a crowded Chinese plan shows folded counts and both full focus titles', async ($, on) => {
  const band = await focusBand($, on)
  expect(await band.find({ text: '✓4' })).toBeDefined()
  expect(await band.find({ text: '+3' })).toBeDefined()
  expect(await band.find({ text: /▶ 0s 移除 Config 驗證$/ })).toBeDefined()
  expect(await band.find({ text: '補預設 CONTEXT.md 說明' })).toBeDefined()
})

test('the last current task shares focus with its predecessor', async ($, on) => {
  const band = await focusBand($, on, 8)
  expect(await band.find({ text: '✓7' })).toBeDefined()
  expect(await band.find({ text: /✓ 整理桌位分配測試$/ })).toBeDefined()
  expect(await band.find({ text: /▶ 0s 完成預約流程驗證$/ })).toBeDefined()
  expect(await band.find({ text: /^\+\d+$/ })).toBeUndefined()
})

test('a completed plan retains the last two titles with no remaining marker', async ($, on) => {
  const band = await focusBand($, on, 9, 'completed')
  expect(await band.find({ text: '✓7' })).toBeDefined()
  expect(await band.find({ text: /✓ 整理桌位分配測試$/ })).toBeDefined()
  expect(await band.find({ text: /✓ 完成預約流程驗證$/ })).toBeDefined()
  expect(await band.find({ text: /^\+\d+$/ })).toBeUndefined()
})

test('a blocked task retains both focus titles with the blocked prefix', async ($, on) => {
  const band = await focusBand($, on, 4, 'blocked')
  expect(await band.find({ text: '✓4' })).toBeDefined()
  expect(await band.find({ text: '+3' })).toBeDefined()
  expect(await band.find({ text: /⛔ 0s 移除 Config 驗證$/ })).toBeDefined()
  expect(await band.find({ text: '補預設 CONTEXT.md 說明' })).toBeDefined()
})

test('short titles retain every equal-width task without folded counts', async ($, on) => {
  const band = await focusBand($, on, 0, 'in-progress', ['Read', 'Build', 'Ship'], 100)
  expect(await band.find({ text: /▶ 0s Read$/ })).toBeDefined()
  expect(await band.find({ text: 'Build' })).toBeDefined()
  expect(await band.find({ text: 'Ship' })).toBeDefined()
  expect(await band.find({ text: /^[✓+]\d+$/ })).toBeUndefined()
})

test('a wide band shows the full title judged to fit an equal cell', async ($, on) => {
  const band = await focusBand($, on, 0, 'in-progress', ['全部空桌時段計算與預約桌位配置驗證a', 'Build', 'Ship'], 200)
  expect(await band.find({ text: '▶ 0s 全部空桌時段計算與預約桌位配置驗證a' })).toBeDefined()
  expect(await band.find({ text: /…/ })).toBeUndefined()
})

/** Checks the mounted label row's allocated gaps, without claiming surface paint. */
const expectLabelGaps = async (band: any, columns: number) => {
  const tree = await band.drawn()
  const row = tree.children[tree.children.length - 1]
  let total = 0
  for (const cell of row.children) {
    const text = cell.children[0].children.join('')
    expect(await band.find({ text })).toBeDefined()
    expect(cell.props.width - displayWidth(text)).toBeGreaterThanOrEqual(1)
    total += cell.props.width
  }
  expect(total).toBeLessThanOrEqual(columns)
}

test('single folded markers leave a gap beside the focus titles', async ($, on) => {
  const band = await focusBand($, on, 1, 'in-progress', FOCUS_TITLES.slice(0, 4), 60)
  expect(await band.find({ text: '✓1' })).toBeDefined()
  expect(await band.find({ text: '+1' })).toBeDefined()
  await expectLabelGaps(band, 60)
})

test('adjacent Chinese titles retain gaps in equal cells', async ($, on) => {
  const band = await focusBand($, on, 0, 'in-progress', ['讀取設定', '建立資料', '驗證結果'], 100)
  expect(await band.find({ text: /▶ 0s 讀取設定$/ })).toBeDefined()
  expect(await band.find({ text: '建立資料' })).toBeDefined()
  expect(await band.find({ text: '驗證結果' })).toBeDefined()
  await expectLabelGaps(band, 100)
})

test('adjacent Chinese focus titles retain gaps', async ($, on) => {
  const band = await focusBand($, on)
  expect(await band.find({ text: /▶ 0s 移除 Config 驗證$/ })).toBeDefined()
  expect(await band.find({ text: '補預設 CONTEXT.md 說明' })).toBeDefined()
  await expectLabelGaps(band, 200)
})
