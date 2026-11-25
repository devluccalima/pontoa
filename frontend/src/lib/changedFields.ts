/** Só os campos alterados, para o PATCH (ADR-0006: campos ausentes não mudam). */
export function changedFields<T extends object>(original: T, edited: Partial<T>): Partial<T> {
  const changes: Partial<T> = {}
  for (const key of Object.keys(edited) as (keyof T)[]) {
    if (edited[key] !== original[key]) changes[key] = edited[key]
  }
  return changes
}
