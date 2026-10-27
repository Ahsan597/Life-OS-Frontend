import { describe, expect, it } from 'vitest'
import {
  bucketName,
  correlationEffect,
  formatR,
  insightsRange,
  ruleMeta,
  strengthEmphasis,
} from '@/lib/insights'

describe('insightsRange', () => {
  it('ends yesterday, because today is still in progress', () => {
    expect(insightsRange('2026-10-20', 90)).toEqual({ from: '2026-07-22', to: '2026-10-19' })
    expect(insightsRange('2026-10-20', 30)).toEqual({ from: '2026-09-20', to: '2026-10-19' })
  })

  it('crosses month and year boundaries', () => {
    expect(insightsRange('2026-01-01', 180)).toEqual({ from: '2025-07-05', to: '2025-12-31' })
  })
})

describe('ruleMeta', () => {
  it('maps each rule to its icon and tone', () => {
    expect(ruleMeta('missed_in_a_row')).toEqual({ emoji: '⚠️', tone: 'warning' })
    expect(ruleMeta('low_completion')).toEqual({ emoji: '📉', tone: 'warning' })
    expect(ruleMeta('streak_milestone')).toEqual({ emoji: '🔥', tone: 'positive' })
    expect(ruleMeta('checkin_gap')).toEqual({ emoji: '📝', tone: 'info' })
    expect(ruleMeta('low_sleep')).toEqual({ emoji: '😴', tone: 'warning' })
    expect(ruleMeta('rising_stress')).toEqual({ emoji: '🧘', tone: 'warning' })
  })

  it('falls back to a neutral card for rules it does not know yet', () => {
    expect(ruleMeta('something_new')).toEqual({ emoji: '💡', tone: 'info' })
  })
})

describe('strengthEmphasis', () => {
  it('makes strong bold, moderate normal and the rest muted', () => {
    expect(strengthEmphasis('strong')).toBe('bold')
    expect(strengthEmphasis('moderate')).toBe('normal')
    for (const s of ['weak', 'negligible', 'no_variation', 'insufficient_data'] as const) {
      expect(strengthEmphasis(s)).toBe('muted')
    }
  })
})

describe('correlationEffect', () => {
  it('reads a positive link as helping and a negative one as hurting', () => {
    expect(correlationEffect({ direction: 'positive' })).toBe('helps')
    expect(correlationEffect({ direction: 'negative' })).toBe('hurts') // e.g. stress
    expect(correlationEffect({ direction: null })).toBeNull()
  })
})

describe('formatR', () => {
  it('signs and rounds to two places', () => {
    expect(formatR(0.353)).toBe('+0.35')
    expect(formatR(-0.525)).toBe('−0.53')
    expect(formatR(0)).toBe('0.00')
    expect(formatR(null)).toBe('—')
  })
})

describe('bucketName', () => {
  it('adds the scale word for 1–5 metrics', () => {
    expect(bucketName('mood', '3')).toBe('Mood 3 (Okay)')
    expect(bucketName('stressLevel', '5')).toBe('Stress 5 (Overwhelmed)')
  })

  it('keeps sleep bands as they are', () => {
    expect(bucketName('sleepHours', '<6h')).toBe('Sleep <6h')
  })
})
