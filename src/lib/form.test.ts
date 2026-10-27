import { describe, expect, it } from 'vitest'
import { fieldDescribedBy, splitServerErrors } from '@/lib/form'

describe('fieldDescribedBy', () => {
  it('is undefined when there is no hint or error', () => {
    expect(fieldDescribedBy('email', {})).toBeUndefined()
  })

  it('references the hint only', () => {
    expect(fieldDescribedBy('email', { hint: 'We never share it' })).toBe('email-hint')
  })

  it('references the error only', () => {
    expect(fieldDescribedBy('email', { error: 'Required' })).toBe('email-error')
  })

  it('references both, hint first', () => {
    expect(fieldDescribedBy('email', { hint: 'x', error: 'y' })).toBe('email-hint email-error')
  })
})

describe('splitServerErrors', () => {
  it('maps field errors and treats field "" as a form-level error', () => {
    expect(
      splitServerErrors([
        { field: 'title', message: 'Title is required' },
        { field: 'title', message: 'second message is ignored' },
        { field: '', message: 'Provide at least one metric' },
      ]),
    ).toEqual({ fields: { title: 'Title is required' }, form: 'Provide at least one metric' })
  })

  it('returns nothing for an empty list', () => {
    expect(splitServerErrors([])).toEqual({ fields: {}, form: null })
  })
})
