import { describe, it, expect } from 'vitest'
import { parseShiftPref, serializeShiftPref, type ShiftNumber } from './wk'

describe('parseShiftPref', () => {
  it('parses single shift', () => {
    expect(parseShiftPref('1')).toEqual([1])
    expect(parseShiftPref('3')).toEqual([3])
  })

  it('parses multiple shifts', () => {
    expect(parseShiftPref('1,2')).toEqual([1, 2])
    expect(parseShiftPref('1,3,4')).toEqual([1, 3, 4])
  })

  it('trims whitespace around commas', () => {
    expect(parseShiftPref('1, 2 ,3')).toEqual([1, 2, 3])
  })

  it('drops out-of-range values', () => {
    expect(parseShiftPref('0,1,5')).toEqual([1])
    expect(parseShiftPref('99')).toEqual([])
  })

  it('drops non-numeric values', () => {
    expect(parseShiftPref('1,abc,2')).toEqual([1, 2])
  })

  it('handles empty string as empty array', () => {
    expect(parseShiftPref('')).toEqual([])
  })

  it('backwards-compat: parses legacy "first" / "second" / "both"', () => {
    expect(parseShiftPref('first')).toEqual([1])
    expect(parseShiftPref('second')).toEqual([2])
    expect(parseShiftPref('both')).toEqual([1, 2])
  })

  it('backwards-compat is case-insensitive and trims', () => {
    expect(parseShiftPref('FIRST')).toEqual([1])
    expect(parseShiftPref(' both ')).toEqual([1, 2])
  })
})

describe('serializeShiftPref', () => {
  it('joins sorted unique shift numbers', () => {
    expect(serializeShiftPref([2, 1, 3])).toBe('1,2,3')
  })

  it('dedups', () => {
    expect(serializeShiftPref([1, 1, 2])).toBe('1,2')
  })

  it('handles single', () => {
    expect(serializeShiftPref([4])).toBe('4')
  })

  it('handles empty', () => {
    expect(serializeShiftPref([])).toBe('')
  })
})

describe('parse/serialize roundtrip', () => {
  const cases: ShiftNumber[][] = [[1], [2], [1, 2], [1, 3], [1, 2, 3, 4], [4]]
  for (const shifts of cases) {
    it(`survives roundtrip for ${JSON.stringify(shifts)}`, () => {
      expect(parseShiftPref(serializeShiftPref(shifts))).toEqual(shifts)
    })
  }
})
