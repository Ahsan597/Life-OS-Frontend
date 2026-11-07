import { describe, expect, it } from 'vitest'
import {
  accuracyRange,
  formatPercent,
  headlineLevels,
  missChanceLabel,
  riskBadgeKind,
  scoreFactorReasons,
  targetLabel,
  targetPhrase,
} from '@/lib/predictions'
import type { Forecast } from '@/types/predictions'

const TODAY = '2026-10-20' // Tuesday

function forecast(overrides: Partial<Forecast> = {}): Forecast {
  return {
    habitId: '1',
    title: 'Gym',
    frequency: 'daily',
    currentStreak: 5,
    target: { period: 'day', date: TODAY, current: true },
    completionProbability: 0.095,
    riskScore: 0.905,
    riskLevel: 'high',
    confidence: 'high',
    factors: [],
    modelVersion: 'heuristic_v1',
    ...overrides,
  }
}

describe('formatPercent', () => {
  it('rounds to a whole percent and shows a dash for null', () => {
    expect(formatPercent(0.905)).toBe('91%')
    expect(formatPercent(0)).toBe('0%')
    expect(formatPercent(null)).toBe('—')
  })
})

describe('riskBadgeKind', () => {
  it('flags high risk on an open period as at risk, medium as watch', () => {
    expect(riskBadgeKind(forecast())).toBe('at_risk')
    expect(riskBadgeKind(forecast({ riskLevel: 'medium' }))).toBe('watch')
  })

  it('shows nothing for low risk, not enough history, or a period that is not open', () => {
    expect(riskBadgeKind(forecast({ riskLevel: 'low' }))).toBeNull()
    expect(riskBadgeKind(forecast({ riskLevel: 'insufficient_data' }))).toBeNull()
    expect(riskBadgeKind(forecast({ target: { period: 'day', date: '2026-10-21', current: false } }))).toBeNull()
    expect(riskBadgeKind(undefined)).toBeNull()
  })

  it('treats today as safe once the habit is ticked off, before the forecast refetches', () => {
    expect(riskBadgeKind(forecast(), { doneToday: true })).toBeNull()
  })
})

describe('targetLabel / targetPhrase', () => {
  it('names days relative to the server today', () => {
    expect(targetLabel(forecast(), TODAY)).toBe('today')
    expect(targetLabel(forecast({ target: { period: 'day', date: '2026-10-21', current: false } }), TODAY)).toBe('tomorrow')
    expect(targetLabel(forecast({ target: { period: 'day', date: '2026-10-23', current: false } }), TODAY)).toBe('Fri, 23 Oct')
    expect(targetPhrase(forecast({ target: { period: 'day', date: '2026-10-23', current: false } }), TODAY)).toBe('on Fri, 23 Oct')
    expect(targetPhrase(forecast(), TODAY)).toBe('today')
  })

  it('names weeks for weekly habits', () => {
    expect(targetLabel(forecast({ target: { period: 'week', date: '2026-10-19', current: true } }), TODAY)).toBe('this week')
    expect(targetLabel(forecast({ target: { period: 'week', date: '2026-10-26', current: false } }), TODAY)).toBe('next week')
    expect(targetLabel(forecast({ target: { period: 'week', date: '2026-11-02', current: false } }), TODAY)).toBe(
      'the week of 2 Nov',
    )
  })
})

describe('missChanceLabel', () => {
  it('reads as a tendency, not a certainty', () => {
    expect(missChanceLabel(forecast(), TODAY)).toBe('~91% chance of a miss today')
  })
})

describe('scoreFactorReasons', () => {
  const neutral = { ruleWeight: 1, habitRisk: 1, feedback: 1, freshness: 1 }

  it('only mentions factors more than 0.05 away from neutral', () => {
    expect(scoreFactorReasons(neutral)).toEqual([])
    expect(scoreFactorReasons({ ...neutral, habitRisk: 1.04, feedback: 0.96, freshness: 0.97 })).toEqual([])
    expect(scoreFactorReasons(null)).toEqual([])
  })

  it('explains each factor in plain words', () => {
    expect(scoreFactorReasons({ ...neutral, habitRisk: 1.2, feedback: 1.3, freshness: 0.8 })).toEqual([
      "This habit's streak is at risk",
      'You usually find this kind of tip useful',
      'This has been waiting a while',
    ])
    expect(scoreFactorReasons({ ...neutral, feedback: 0.7 })).toEqual(["You often dismiss these, so it's ranked lower"])
  })

  it('ignores the rule weight and fresh-advice boosts', () => {
    expect(scoreFactorReasons({ ...neutral, ruleWeight: 0.5, freshness: 1.1, habitRisk: 0.8 })).toEqual([])
  })
})

describe('accuracyRange', () => {
  it('ends yesterday and spans the chosen number of days', () => {
    expect(accuracyRange(TODAY, 30)).toEqual({ from: '2026-09-20', to: '2026-10-19' })
    expect(accuracyRange(TODAY, 180)).toEqual({ from: '2026-04-23', to: '2026-10-19' })
  })

  it('never asks for more than 366 days', () => {
    expect(accuracyRange(TODAY, 1000)).toEqual({ from: '2025-10-19', to: '2026-10-19' })
  })
})

describe('headlineLevels', () => {
  it('picks the high and low rows that have data', () => {
    const rows = [
      { riskLevel: 'low' as const, predictions: 0, averagePredictedRisk: null, observedMissRate: null },
      { riskLevel: 'high' as const, predictions: 24, averagePredictedRisk: 0.771, observedMissRate: 0.833 },
    ]
    expect(headlineLevels(rows)).toEqual({ high: rows[1], low: undefined })
  })
})
