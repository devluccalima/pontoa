/** Classes e atributos compartilhados pelos campos de formulário. */

export function controlBorder(error?: string): string {
  return error ? 'border-2 border-danger' : 'border border-border-strong'
}

export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  return [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined
}
