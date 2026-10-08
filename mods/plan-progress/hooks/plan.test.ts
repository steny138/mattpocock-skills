import { expect, test } from 'claude-code/testing'

import type { Bound } from '../types'
import { advance, brief, currentIndex, isImplementCommand, isImplementSkill, layout, parsePlan, planId, planPathIn } from './plan'

const PLAN = `# Demo Implementation Plan

**Execution:** in-progress

## Tasks

### Task 1: Add session model (completed)

### Task 2: Refresh token on expiry (in-progress)

### Task 3: Expose logout endpoint (pending)

## Blockers

- None.
`

test('a plan path yields feature/work-item, anything else null', async () => {
  expect(planId('/repo/.scratch/auth/plans/01-session-plan.md')).toBe('auth/01-session')
  expect(planId('/repo/.scratch/auth/implement-spec.md')).toBe(null)
  expect(planId('/repo/src/plan.md')).toBe(null)
})

test('a shell command yields the plan path it edits, not a glob or a spec', async () => {
  expect(planPathIn("python3 - <<'EOF'\np='.scratch/metrics/plans/metrics-plan.md'\nEOF")).toBe(
    '.scratch/metrics/plans/metrics-plan.md',
  )
  expect(planPathIn("sed -i '' 's/a/b/' /repo/.scratch/auth/plans/01-session-plan.md")).toBe(
    '/repo/.scratch/auth/plans/01-session-plan.md',
  )
  expect(planPathIn('wc -l .scratch/metrics/spec.md .scratch/metrics/plans/*.md')).toBe(null)
  expect(planPathIn('git status --short')).toBe(null)
})

test('implement matches bare or plugin-namespaced, not its siblings', async () => {
  expect(isImplementSkill('implement')).toBe(true)
  expect(isImplementSkill('mattpocock-skills:implement')).toBe(true)
  expect(isImplementSkill('implement-spec')).toBe(false)
  expect(isImplementSkill('mattpocock-skills:implement-spec')).toBe(false)

  expect(isImplementCommand('/implement .scratch/auth/plans/01-plan.md')).toBe(true)
  expect(isImplementCommand('/mattpocock-skills:implement .scratch/auth/plans/01-plan.md')).toBe(true)
  expect(isImplementCommand('/mattpocock-skills:implement-spec .scratch/auth/spec.md')).toBe(false)
  expect(isImplementCommand('please /implement it')).toBe(false)
})

test('parsePlan reads the execution state and each task', async () => {
  const plan = parsePlan(PLAN)
  expect(plan.status).toBe('in-progress')
  expect(plan.tasks.map(t => t.status)).toEqual(['completed', 'in-progress', 'pending'])
  expect(plan.tasks[1]?.title).toBe('Refresh token on expiry')
  expect(currentIndex(plan)).toBe(1)

  expect(parsePlan(PLAN.replace('in-progress\n', 'blocked\n')).status).toBe('blocked')
  expect(currentIndex(parsePlan(PLAN.replace(/\((in-progress|pending)\)/g, '(completed)')))).toBe(3)
})

test('parsePlan reads a status in full-width parentheses, as a plan written in Chinese may have it', async () => {
  const plan = parsePlan('### Task 1: push dev 防護 hook（completed）\n\n### Task 2: 專案層權限（in-progress）\n')
  expect(plan.tasks.map(t => t.status)).toEqual(['completed', 'in-progress'])
  expect(plan.tasks[0]?.title).toBe('push dev 防護 hook')
  expect(parsePlan('### Task 1: a (blocked）\n').tasks.map(t => t.status)).toEqual(['blocked'])
})

test('parsePlan reads the status before a note an agent appended inside the parentheses', async () => {
  const plan = parsePlan(
    '### Task 8: 補 hook 的繞過寫法（completed，review 修正，使用者已核准）\n\n### Task 9: Retry on timeout (in-progress, waiting on CI)\n',
  )
  expect(plan.tasks.map(t => t.status)).toEqual(['completed', 'in-progress'])
  expect(plan.tasks[0]?.title).toBe('補 hook 的繞過寫法')
})

test('advance times the task that just completed', async () => {
  const start: Bound = {
    path: 'p',
    id: 'auth/01',
    taskStartedAt: 0,
    durations: {},
    plan: parsePlan(PLAN.replace('(completed)', '(pending)').replace('(in-progress)', '(pending)')),
  }

  const after = advance(start, parsePlan(PLAN), 120_000)
  expect(after.durations).toEqual({ 0: 120 })
  expect(after.taskStartedAt).toBe(120_000)

  const same = advance(after, parsePlan(PLAN), 200_000)
  expect(same.durations).toEqual({ 0: 120 })
  expect(same.taskStartedAt).toBe(120_000)
})

test('brief formats a duration the way the band shows it', async () => {
  expect(brief(45)).toBe('45s')
  expect(brief(240)).toBe('4m')
  expect(brief(3900)).toBe('1h 5m')
})

test('layout spreads steps, shrinks them, then windows around the current task', async () => {
  expect(layout(5, 1, 100)).toEqual({ step: 20, from: 0, to: 5, cutLeft: false, cutRight: false })
  expect(layout(3, 0, 200)).toEqual({ step: 40, from: 0, to: 3, cutLeft: false, cutRight: false })
  expect(layout(5, 1, 50)).toEqual({ step: 10, from: 0, to: 5, cutLeft: false, cutRight: false })
  expect(layout(12, 7, 40)).toEqual({ step: 8, from: 5, to: 10, cutLeft: true, cutRight: true })
  expect(layout(12, 11, 40)).toEqual({ step: 8, from: 7, to: 12, cutLeft: true, cutRight: false })
})
