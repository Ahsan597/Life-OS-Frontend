import { describe, expect, it } from 'vitest'
import { METRIC_META, dailySeries, metricDomain, trendLabel, trendTone } from '@/lib/checkIns'
import type { SeriesPoint } from '@/types/checkIn'

describe('trendTone', () => {
  it.each(['mood', 'energy', 'sleepHours'] as const)('rising %s is good, falling is bad', (metric) => {
    expect(trendTone(metric, 'rising')).toBe('good')
    expect(trendTone(metric, 'falling')).toBe('bad')
  })

  it('treats rising stress as bad and falling stress as good', () => {
    expect(trendTone('stressLevel', 'rising')).toBe('bad')
    expect(trendTone('stressLevel', 'falling')).toBe('good')
  })

  it('is neutral when flat or when there is not enough data', () => {
    expect(trendTone('mood', 'flat')).toBe('neutral')
    expect(trendTone('stressLevel', null)).toBe('neutral')
  })
})

describe('trendLabel', () => {
  it('names every trend, including the missing one', () => {
    expect(trendLabel('rising')).toBe('Rising')
    expect(trendLabel('falling')).toBe('Falling')
    expect(trendLabel('flat')).toBe('Steady')
    expect(trendLabel(null)).toBe('Not enough data')
  })
})

describe('METRIC_META formatting', () => {
  it('formats scales and hours', () => {
    expect(METRIC_META.mood.format(3.5)).toBe('3.5 / 5')
    expect(METRIC_META.energy.format(4)).toBe('4 / 5')
    expect(METRIC_META.sleepHours.format(7.25)).toBe('7.3 h')
  })
})

describe('metricDomain', () => {
  it('uses 1–5 for the scales', () => {
    expect(metricDomain('mood', [2, 4])).toEqual([1, 5])
  })

  it('uses 0–12 hours of sleep, growing to 24 when needed', () => {
    expect(metricDomain('sleepHours', [7, 8, null])).toEqual([0, 12])
    expect(metricDomain('sleepHours', [7, 14])).toEqual([0, 24])
    expect(metricDomain('sleepHours', [null])).toEqual([0, 12])
  })
})

describe('dailySeries', () => {
  const series: SeriesPoint[] = [
    { date: '2026-10-15', mood: 2, energy: 2, sleepHours: 5, stressLevel: 4 },
    { date: '2026-10-17', mood: null, energy: 4, sleepHours: 8, stressLevel: 2 },
  ]

  it('has one entry per day, with gaps (null) on days without data — never zero', () => {
    expect(dailySeries(series, 'mood', '2026-10-14', '2026-10-18')).toEqual([
      { date: '2026-10-14', value: null },
      { date: '2026-10-15', value: 2 },
      { date: '2026-10-16', value: null },
      { date: '2026-10-17', value: null }, // checked in, but mood was left blank
      { date: '2026-10-18', value: null },
    ])
  })

  it('picks the requested metric', () => {
    expect(dailySeries(series, 'sleepHours', '2026-10-15', '2026-10-17').map((p) => p.value)).toEqual([5, null, 8])
  })
})
