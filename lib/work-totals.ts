/** Totais só com dados já aprovados (regra de negócio). */

export function contractPercentApprovedValue(assignment: {
  mode: string
  contractTotal: number | null
  approvedPercent: number
}): number {
  if (assignment.mode !== 'CONTRACT_PERCENT' || assignment.contractTotal == null) return 0
  return assignment.contractTotal * (assignment.approvedPercent / 100)
}

export function contractStepsApprovedValue(
  steps: { approvedDone: boolean; amount: number }[]
): number {
  return steps.filter((s) => s.approvedDone).reduce((sum, s) => sum + s.amount, 0)
}

export function dailyApprovedValue(
  assignment: { mode: string; dailyRate: number | null },
  logs: { status: string; dayUnits: number | null }[]
): number {
  if (assignment.mode !== 'DAILY' || assignment.dailyRate == null) return 0
  return logs
    .filter((l) => l.status === 'APPROVED' && l.dayUnits != null)
    .reduce((sum, l) => sum + (l.dayUnits as number) * assignment.dailyRate!, 0)
}

export function assignmentApprovedTotal(assignment: {
  mode: string
  dailyRate: number | null
  contractTotal: number | null
  approvedPercent: number
  steps: { approvedDone: boolean; amount: number }[]
  dayLogs: { status: string; dayUnits: number | null }[]
}): number {
  if (assignment.mode === 'DAILY') {
    return dailyApprovedValue(assignment, assignment.dayLogs)
  }
  if (assignment.mode === 'CONTRACT_PERCENT') {
    return contractPercentApprovedValue(assignment)
  }
  if (assignment.mode === 'CONTRACT_STEPS') {
    return contractStepsApprovedValue(assignment.steps)
  }
  return 0
}
