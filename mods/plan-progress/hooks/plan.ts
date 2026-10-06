import type { Bound, PlanStatus, PlanSummary, Task, TaskStatus } from '../types'

const PLAN_STATUSES: readonly PlanStatus[] = ['not-started', 'in-progress', 'blocked', 'completed']
const TASK_STATUSES: readonly TaskStatus[] = ['pending', 'in-progress', 'completed', 'blocked']

export const PLAN_PATH = /\.scratch\/([^/]+)\/plans\/([^/]+)-plan\.md$/

/** `<feature>/<work-item>` from a plan path, or null when it is not one. */
export const planId = (path: string): string | null => {
  const match = PLAN_PATH.exec(path)

  return match ? `${match[1]}/${match[2]}` : null
}

/** Whether a skill name is `implement`, bare or under a plugin namespace (`mattpocock-skills:implement`). */
export const isImplementSkill = (name: string): boolean => /^(?:[\w-]+:)?implement$/.test(name)

/** Whether a prompt invokes `/implement`, bare or under a plugin namespace. */
export const isImplementCommand = (text: string): boolean => /^\s*\/(?:[\w-]+:)?implement\b(?!-)/.test(text)

/** Reads a to-plan implementation plan into its summary. */
export const parsePlan = (text: string): PlanSummary => {
  const execution = /\*\*Execution:\*\*\s*([\w-]+)/.exec(text)?.[1] ?? ''
  const status = (PLAN_STATUSES as readonly string[]).includes(execution) ? (execution as PlanStatus) : 'not-started'

  const tasks: Task[] = [...text.matchAll(/^### Task \d+:\s*(.*?)\s*\(([\w-]+)\)\s*$/gm)].map(match => {
    const raw = match[2] ?? 'pending'
    const taskStatus = (TASK_STATUSES as readonly string[]).includes(raw) ? (raw as TaskStatus) : 'pending'

    return { title: match[1] ?? '', status: taskStatus }
  })

  return { status, tasks }
}

/** Index of the task being worked on: the first not completed, or the count when all are. */
export const currentIndex = (plan: PlanSummary): number => {
  const i = plan.tasks.findIndex(task => task.status !== 'completed')

  return i < 0 ? plan.tasks.length : i
}

/** Folds a fresh parse into the bound record, timing the task that just completed. */
export const advance = (bound: Bound, plan: PlanSummary, now: number): Bound => {
  const before = bound.plan ? currentIndex(bound.plan) : 0
  const after = currentIndex(plan)
  if (after <= before) return { ...bound, plan }

  // Every task from the old current up to the new one finished in this span; credit the span to the first.
  const durations = { ...bound.durations, [before]: Math.round((now - bound.taskStartedAt) / 1000) }

  return { ...bound, plan, durations, taskStartedAt: now }
}

/** `4m` / `1h 5m` / `32s`: the short form for a task's duration. */
export const brief = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)

  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export type Layout = {
  /** Width of each step cell. */
  step: number
  /** First and one-past-last task index in view. */
  from: number
  to: number
  /** Whether tasks are cut off before `from` / after `to`. */
  cutLeft: boolean
  cutRight: boolean
}

const MAX_STEP = 40
const MIN_STEP = 8

/** Spreads the steps over the width (up to MAX_STEP each), shrinks them to fit, then windows around `current`. */
export const layout = (count: number, current: number, columns: number): Layout => {
  if (count === 0) return { step: MAX_STEP, from: 0, to: 0, cutLeft: false, cutRight: false }
  const fit = Math.floor(columns / count)
  if (fit >= MIN_STEP) return { step: Math.min(MAX_STEP, fit), from: 0, to: count, cutLeft: false, cutRight: false }

  const visible = Math.max(1, Math.floor(columns / MIN_STEP))
  let from = Math.max(0, Math.min(current, count - 1) - Math.floor(visible / 2))
  const to = Math.min(count, from + visible)
  from = Math.max(0, to - visible)

  return { step: MIN_STEP, from, to, cutLeft: from > 0, cutRight: to < count }
}

export const truncate = (text: string, width: number): string =>
  text.length <= width ? text : `${text.slice(0, Math.max(0, width - 1))}…`
