export class CalculationInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CalculationInputError'
  }
}

export function ensurePositive(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new CalculationInputError(`${field} deve ser maior que zero.`)
  }
}

export function ensureNonNegative(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new CalculationInputError(`${field} deve ser maior ou igual a zero.`)
  }
}

export function ensureRange(value: number, min: number, max: number, field: string) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new CalculationInputError(`${field} deve estar entre ${min} e ${max}.`)
  }
}

