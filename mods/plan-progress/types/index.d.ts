export type PlanStatus = 'not-started' | 'in-progress' | 'blocked' | 'completed'
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'blocked'

export type Task = {
  title: string
  status: TaskStatus
}

export type PlanSummary = {
  status: PlanStatus
  tasks: Task[]
}

export type Bound = {
  /** Path of the plan file, as the Read or Edit that named it spelled it. */
  path: string
  /** `<feature>/<work-item>`, read off the path. */
  id: string
  /** When the current task became current, ms since epoch. */
  taskStartedAt: number
  /** Seconds each completed task took, by task index; only tasks finished in this session. */
  durations: Record<number, number>
  plan: PlanSummary | null
}

declare module 'claude-code' {
  interface PluginState {
    'plan-progress': {
      bound: Bound | null
      tick: number
    }
  }
}
