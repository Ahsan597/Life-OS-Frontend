import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PasswordStrengthMeter } from '@/components/form/PasswordStrengthMeter'

describe('PasswordStrengthMeter', () => {
  it('shows no label for an empty password', () => {
    const { container } = render(<PasswordStrengthMeter password="" />)

    expect(container.querySelector('p')).toBeNull()
  })

  it('rates a weak password and lists what is missing', () => {
    render(<PasswordStrengthMeter password="abc" />)

    expect(screen.getByText('Too weak')).toBeInTheDocument()
    expect(screen.getByText(/Add .*upper and lower case letters, a number, a symbol/)).toBeInTheDocument()
  })

  it('rates a password that passes every check as strong with no hints', () => {
    render(<PasswordStrengthMeter password="Sup3r$ecretPass" />)

    expect(screen.getByText('Strong')).toBeInTheDocument()
    expect(screen.queryByText(/Add/)).toBeNull()
  })
})
