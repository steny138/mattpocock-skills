import { expect, test } from 'claude-code/testing'

import type { Bound } from '../types'
import { advance, brief, currentIndex, displayWidth, isImplementCommand, isImplementSkill, layout, parsePlan, planId, planPathIn, truncate } from './plan'

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

test('focus layout splits space equally and keeps folded nodes', async () => {
  expect(layout(['全部空桌時段計算', 'b', 'c', 'd', 'e'], 1, 100)).toEqual({ widths: [3, 40, 40, 2, 2], from: 0, to: 5, cutLeft: false, cutRight: false, leftFolded: 1, rightFolded: 2, mode: 'focus' })
  expect(layout(['全部空桌時段計算與預約桌位配置驗證', 'b', 'c'], 0, 100)).toEqual({ widths: [40, 40, 3], from: 0, to: 3, cutLeft: false, cutRight: false, leftFolded: 0, rightFolded: 1, mode: 'focus' })
  expect(layout(['全部空桌時段計算', 'b', 'c', 'd', 'e'], 1, 50)).toEqual({ widths: [3, 21, 21, 2, 2], from: 0, to: 5, cutLeft: false, cutRight: false, leftFolded: 1, rightFolded: 2, mode: 'focus' })
})

test('Chinese labels truncate within terminal columns', async () => {
  expect(truncate('全部空桌時段計算', 9)).toBe('全部空桌…')
})

test('mixed labels and exact fits retain their terminal width', async () => {
  expect(truncate('移除 Config 驗證', 12)).toBe('移除 Config…')
  expect(truncate('移除 Config 驗證', 16)).toBe('移除 Config 驗證')
})

test('wide emoji and East Asian text occupy two columns', async () => {
  expect(displayWidth('ASCII')).toBe(5)
  expect(displayWidth('中文かな한글Ａ')).toBe(14)
  expect(displayWidth('移除 Config 驗證')).toBe(16)
  expect(displayWidth('⛔ blocked')).toBe(10)
  expect(truncate('⛔ 全部空桌', 8)).toBe('⛔ 全部…')
})

test('labels fitting the exact prefix and spacing boundary keep equal cells', async () => {
  expect(layout(['中文a', 'b', 'c'], 1, 42).mode).toBe('equal')
  expect(layout(['中文ab', 'b', 'c'], 1, 42).mode).toBe('focus')
})

test('too little focus space falls back to the original scrolling window', async () => {
  expect(layout(Array(12).fill('中文長標題'), 7, 34)).toEqual({ widths: [8, 8, 8, 8], from: 5, to: 9, cutLeft: true, cutRight: true, leftFolded: 0, rightFolded: 0, mode: 'window' })
  expect(layout(Array(12).fill('中文長標題'), 11, 34)).toEqual({ widths: [8, 8, 8, 8], from: 8, to: 12, cutLeft: true, cutRight: false, leftFolded: 0, rightFolded: 0, mode: 'window' })
})

test('forty columns still fit two focus cells above the scrolling threshold', async () => {
  expect(layout(Array(12).fill('中文長標題'), 7, 40)).toEqual({ widths: [2, 2, 2, 2, 2, 2, 2, 10, 10, 2, 2, 2], from: 0, to: 12, cutLeft: false, cutRight: false, leftFolded: 7, rightFolded: 3, mode: 'focus' })
})

test('a wide band keeps three titles equal before applying the maximum cell width', async () => {
  expect(layout(['全部空桌時段計算與預約桌位配置驗證a', 'b', 'c'], 0, 200)).toEqual({ widths: [40, 40, 40], from: 0, to: 3, cutLeft: false, cutRight: false, leftFolded: 0, rightFolded: 0, mode: 'equal' })
})
