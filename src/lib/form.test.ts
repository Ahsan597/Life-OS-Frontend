import { describe, expect, it } from 'vitest'
import { fieldDescribedBy } from '@/lib/form'

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
