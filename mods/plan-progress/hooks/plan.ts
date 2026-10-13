import type { Bound, PlanStatus, PlanSummary, Task, TaskStatus } from '../types'

const PLAN_STATUSES: readonly PlanStatus[] = ['not-started', 'in-progress', 'blocked', 'completed']
const TASK_STATUSES: readonly TaskStatus[] = ['pending', 'in-progress', 'completed', 'blocked']

export const PLAN_PATH = /\.scratch\/([^/]+)\/plans\/([^/]+)-plan\.md$/

/** `<feature>/<work-item>` from a plan path, or null when it is not one. */
export const planId = (path: string): string | null => {
  const match = PLAN_PATH.exec(path)

  return match ? `${match[1]}/${match[2]}` : null
}

/** The first plan path a shell command names (a python or sed edit), or null. */
export const planPathIn = (command: string): string | null =>
  /[^\s'"=]*\.scratch\/[^/\s'"]+\/plans\/[^/\s'"]+-plan\.md/.exec(command)?.[0] ?? null

/** Whether a skill name is `implement`, bare or under a plugin namespace (`mattpocock-skills:implement`). */
export const isImplementSkill = (name: string): boolean => /^(?:[\w-]+:)?implement$/.test(name)

/** Whether a prompt invokes `/implement`, bare or under a plugin namespace. */
export const isImplementCommand = (text: string): boolean => /^\s*\/(?:[\w-]+:)?implement\b(?!-)/.test(text)

/** Reads a to-plan implementation plan into its summary. */
export const parsePlan = (text: string): PlanSummary => {
  const execution = /\*\*Execution:\*\*\s*([\w-]+)/.exec(text)?.[1] ?? ''
  const status = (PLAN_STATUSES as readonly string[]).includes(execution) ? (execution as PlanStatus) : 'not-started'

  // A plan written in Chinese may wrap the status in full-width parentheses, and an agent may append a note after
  // it: `（completed，review 修正）`. Only the leading status word counts.
  const tasks: Task[] = [...text.matchAll(/^### Task \d+:\s*(.*?)\s*[(（]([\w-]+)[^)）]*[)）]\s*$/gm)].map(match => {
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
  /** Terminal columns for each task in view. */
  widths: number[]
  from: number
  to: number
  cutLeft: boolean
  cutRight: boolean
  leftFolded: number
  rightFolded: number
  mode: 'equal' | 'focus' | 'window'
}

const MAX_STEP = 40
const MIN_STEP = 8

/** Uses equal cells when titles fit, focuses crowded plans, and windows when focus cannot fit. */
export const layout = (titles: readonly string[], current: number, columns: number): Layout => {
  const count = titles.length
  if (count === 0) return { widths: [], from: 0, to: 0, cutLeft: false, cutRight: false, leftFolded: 0, rightFolded: 0, mode: 'equal' }
  const fit = Math.min(MAX_STEP, Math.floor(columns / count))
  if (fit >= MIN_STEP && titles.every(title => displayWidth(title) + 9 <= fit)) {
    return { widths: titles.map(() => fit), from: 0, to: count, cutLeft: false, cutRight: false, leftFolded: 0, rightFolded: 0, mode: 'equal' }
  }
  const focusCount = Math.min(2, count)
  const leftFolded = Math.max(0, Math.min(current, count - focusCount))
  const rightFolded = count - leftFolded - focusCount
  const focusWidth = Math.min(MAX_STEP, Math.floor((columns - (leftFolded + rightFolded) * 2) / focusCount))

  if (focusWidth < MIN_STEP) {
    const visible = Math.max(1, Math.floor(columns / MIN_STEP))
    let from = Math.max(0, Math.min(current, count - 1) - Math.floor(visible / 2))
    const to = Math.min(count, from + visible)
    from = Math.max(0, to - visible)

    return { widths: titles.slice(from, to).map(() => MIN_STEP), from, to, cutLeft: from > 0, cutRight: to < count, leftFolded: 0, rightFolded: 0, mode: 'window' }
  }

  return {
    widths: titles.map((_, i) => i < leftFolded || i >= leftFolded + focusCount ? 2 : focusWidth),
    from: 0, to: count, cutLeft: false, cutRight: false, leftFolded, rightFolded, mode: 'focus',
  }
}

/** Terminal columns occupied by wide East Asian characters and emoji. */
export const displayWidth = (text: string): number => {
  let width = 0
  for (const character of text) {
    const code = character.codePointAt(0)!
    width += /\p{Emoji_Presentation}/u.test(character) || code >= 0x1100 && (
      code <= 0x115f || code === 0x2329 || code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
      (code >= 0xac00 && code <= 0xd7a3) || (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) || (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) || (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x20000 && code <= 0x3fffd)
    ) ? 2 : 1
  }

  return width
}

/** Truncates to terminal columns, leaving room for the ellipsis. */
export const truncate = (text: string, width: number): string => {
  if (width <= 0) return ''
  if (displayWidth(text) <= width) return text
  let result = ''
  let used = 0
  for (const character of text) {
    const size = displayWidth(character)
    if (used + size > width - 1) break
    result += character
    used += size
  }

  return `${result}…`
}
