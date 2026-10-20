/** Ids for the control's aria-describedby, matching what FormField renders */
export function fieldDescribedBy(id: string, { hint, error }: { hint?: unknown; error?: unknown }) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
}
