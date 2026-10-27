/** Ids for the control's aria-describedby, matching what FormField renders */
export function fieldDescribedBy(id: string, { hint, error }: { hint?: unknown; error?: unknown }) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
}

/**
 * Splits a 400's `details` into per-field messages and a form-level message
 * (`field: ""` means the error isn't about one field).
 */
export function splitServerErrors(details: { field: string; message: string }[]) {
  const fields: Record<string, string> = {}
  let form: string | null = null
  for (const { field, message } of details) {
    if (field) fields[field] ??= message
    else form ??= message
  }
  return { fields, form }
}
