import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Bound, Task } from '../types'
import {
  advance,
  brief,
  currentIndex,
  isImplementCommand,
  isImplementSkill,
  layout,
  parsePlan,
  planId,
  planPathIn,
  truncate,
} from './plan'
import { COLUMNS as CAT_COLUMNS, ROWS as CAT_ROWS, frameFor, type Mood } from './sprite'

const FRAME_MS = 220
const POLL_MS = 3000
const CAT_KEY = 'cat'

const bound = atom({ plugin: 'plan-progress', key: 'bound' } as const, null)
const tick = atom({ plugin: 'plan-progress', key: 'tick' } as const, 0)

const moodOf = (b: Bound): Mood =>
  b.plan?.status === 'blocked' ? 'blocked' : b.plan?.status === 'completed' ? 'done' : 'running'

const bind = async ($: EngineInterface, path: string): Promise<void> => {
  const id = planId(path)
  if (id === null) return
  const now = await $.clock.now()
  const text = await $.fs.read(path).catch(() => '')
  const fresh: Bound = { path, id, taskStartedAt: now, durations: {}, plan: parsePlan(text) }
  await update($, bound, () => fresh)
}

const absolute = async ($: EngineInterface, path: string): Promise<string> =>
  path.startsWith('/') ? path : `${await $.session.cwd()}/${path}`

/**
 * /implement started: binds the plan its arguments name, else the plan the session last touched.
 * Resolves true when it bound neither, so the next plan touched is the one to bind.
 */
const startImplement = async ($: EngineInterface, named: string | null, lastPlan: string | null): Promise<boolean> => {
  const path = named === null ? lastPlan : await absolute($, named)
  if (path === null) return true
  await bind($, path)

  return false
}

const refresh = async ($: EngineInterface): Promise<void> => {
  const current = await read($, bound)
  if (current === null) return
  const text = await $.fs.read(current.path).catch(() => null)
  if (text === null) return
  const now = await $.clock.now()
  await update($, bound, b => (b === null ? null : advance(b, parsePlan(text), now)))
}

export const register: Register = on => {
  let isArmed = false
  let lastPlan: string | null = null
  let bandId: string | null = null
  let frame = 0
  let lastMtime = 0

  on('session.start', async ($, e, next) => {
    // Animate the cat in place, and redraw the clocks once a second.
    $.clock.every(FRAME_MS, () => {
      void (async () => {
        const b = await read($, bound)
        if (b === null || bandId === null) return
        frame += 1
        if (moodOf(b) === 'running') {
          void $.ui.blit({ requestId: bandId, key: CAT_KEY, cells: frameFor('running', frame) })
        }
        if (frame % Math.round(1000 / FRAME_MS) === 0) await update($, tick, n => n + 1)
      })()
    })

    // Catch edits no tool call announced (a subagent, a Bash heredoc).
    $.clock.every(POLL_MS, () => {
      void (async () => {
        const b = await read($, bound)
        if (b === null) return
        const stat = await $.fs.stat(b.path).catch(() => null)
        if (stat === null || stat.mtimeMs === lastMtime) return
        lastMtime = stat.mtimeMs
        await refresh($)
      })()
    })

    return next(e)
  })

  // /implement starts in one of two ways, never through skill.prompt: cc-plugin-sec-default bypasses that event
  // for user-tier plugins. Typed, it arrives here as its own text; invoked by the model, it is a Skill tool call.
  on('prompt.submit', async ($, e, next) => {
    // A finished plan stays on the band until the person's next message.
    const b = await read($, bound)
    if (b?.plan?.status === 'completed') await update($, bound, () => null)

    if (isImplementCommand(e.text)) isArmed = await startImplement($, planPathIn(e.text), lastPlan)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (e.tool === 'Skill') {
      if (isImplementSkill(e.skill)) isArmed = await startImplement($, planPathIn(e.args ?? ''), lastPlan)

      return result
    }

    const named = e.tool === 'Bash' ? planPathIn(e.command) : 'file_path' in e && typeof e.file_path === 'string' ? e.file_path : null
    if (named === null || planId(named) === null) return result
    const path = await absolute($, named)
    lastPlan = path

    // Any tool counts: a plan already in context may be edited without a Read, or through a Bash script.
    if (isArmed) {
      isArmed = false
      await bind($, path)
    } else {
      const b = await read($, bound)
      if (b !== null && b.path === path && e.tool !== 'Read') await refresh($)
    }

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const b = await read($, bound)
    if (b === null || b.plan === null || e.props.hasSurvey) return next(e)
    await read($, tick)
    bandId = e.requestId

    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const tasks = b.plan.tasks
    const current = currentIndex(b.plan)
    const mood = moodOf(b)
    const columns = e.props.bodyColumns
    // One column is kept for the finish node after the last segment.
    const grid = layout(tasks.length, current, columns - 1)
    const shown = tasks.slice(grid.from, grid.to)

    const accent = mood === 'blocked' ? 'error' : mood === 'done' ? 'success' : 'warning'

    // Node k is the boundary before task k (k = tasks.length is the finish line); segment k is task k.
    const nodeOf = (k: number): { glyph: string; color: string; dim: boolean } => {
      if (k < current || mood === 'done') return { glyph: '●', color: 'success', dim: false }
      if (k === current) return { glyph: mood === 'blocked' ? '⛔' : '●', color: accent, dim: false }

      return { glyph: '○', color: 'text', dim: true }
    }
    const labelOf = (task: Task, index: number) =>
      task.status === 'completed' || mood === 'done'
        ? { color: 'success', dim: false }
        : index === current
          ? { color: accent, dim: false }
          : { color: 'text', dim: true }

    const catLeft = Math.max(0, Math.min(columns - CAT_COLUMNS, (Math.min(current, tasks.length - 1) - grid.from) * grid.step))

    // The cat is a Raster, a terminal-only element: elsewhere the band draws the stepper alone.
    let cat = null
    if (e.surface === 'terminal') {
      const { Raster } = $.ui.resolve(e)
      cat = (
        <Box marginLeft={catLeft}>
          <Raster key={CAT_KEY} columns={CAT_COLUMNS} rows={CAT_ROWS} cells={frameFor(mood, frame)} />
        </Box>
      )
    }

    return (
      <Box flexDirection="column" width={columns}>
        {cat}
        <Text wrap="truncate-end">
          {grid.cutLeft ? <Text dimColor>… </Text> : null}
          {shown.map((task, i) => {
            const node = nodeOf(grid.from + i)
            const isDone = task.status === 'completed' || mood === 'done'

            return (
              <Text>
                <Text color={node.color} dimColor={node.dim}>
                  {node.glyph}
                </Text>
                <Text color={isDone ? 'success' : undefined} dimColor={!isDone}>
                  {(isDone ? '━' : '─').repeat(grid.step - 1)}
                </Text>
              </Text>
            )
          })}
          <Text color={nodeOf(grid.to).color} dimColor={nodeOf(grid.to).dim}>
            {nodeOf(grid.to).glyph}
          </Text>
          {grid.cutRight ? <Text dimColor> …</Text> : null}
        </Text>
        <Box>
          {grid.cutLeft ? <Box width={2} /> : null}
          {shown.map((task, i) => {
            const index = grid.from + i
            const label = labelOf(task, index)
            const seconds = b.durations[index]
            // The mark and time lead the title: "✓ 2m Add session model", "▶ 20m Expose logout endpoint".
            const lead =
              task.status === 'completed'
                ? `✓ ${seconds === undefined ? '' : `${brief(seconds)} `}`
                : index === current && mood !== 'done'
                  ? `${mood === 'blocked' ? '⛔' : '▶'} ${brief(Math.floor((now - b.taskStartedAt) / 1000))} `
                  : ''

            return (
              <Box width={grid.step}>
                <Text color={label.color} dimColor={label.dim} wrap="truncate-end">
                  {truncate(`${lead}${task.title}`, grid.step - 1)}
                </Text>
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  })
}
