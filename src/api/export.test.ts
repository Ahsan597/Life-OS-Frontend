import { describe, expect, it } from 'vitest'
import { filenameFromDisposition } from '@/api/export'

describe('filenameFromDisposition', () => {
  it('reads quoted, bare and RFC 5987 filenames', () => {
    expect(filenameFromDisposition('attachment; filename="lifeos-export-2026-10-27.json"')).toBe('lifeos-export-2026-10-27.json')
    expect(filenameFromDisposition('attachment; filename=habits.csv')).toBe('habits.csv')
    expect(filenameFromDisposition("attachment; filename*=UTF-8''life%20os.csv")).toBe('life os.csv')
  })

  it('falls back when the header is missing', () => {
    expect(filenameFromDisposition(undefined)).toBe('lifeos-export.json')
    expect(filenameFromDisposition('attachment', 'x.csv')).toBe('x.csv')
  })
})
