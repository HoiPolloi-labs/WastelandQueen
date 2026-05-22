import { describe, it, expect } from 'vitest'
import { parseCSV, stringifyCSV } from './csv'

describe('parseCSV', () => {
  it('splits a plain header + row', () => {
    expect(parseCSV('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles quoted values with embedded commas', () => {
    expect(parseCSV('ign,note\nWhaler,"hello, world"')).toEqual([
      ['ign', 'note'],
      ['Whaler', 'hello, world'],
    ])
  })

  it('handles escaped quotes inside a quoted field', () => {
    expect(parseCSV('a\n"he said ""yo"""')).toEqual([['a'], ['he said "yo"']])
  })

  it('handles \\r\\n line endings', () => {
    expect(parseCSV('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles newlines inside quoted fields', () => {
    expect(parseCSV('a\n"line1\nline2"')).toEqual([['a'], ['line1\nline2']])
  })

  it('strips BOM', () => {
    expect(parseCSV('﻿a\n1')).toEqual([['a'], ['1']])
  })
})

describe('stringifyCSV', () => {
  it('roundtrips simple data', () => {
    const data = [
      ['a', 'b'],
      ['1', '2'],
    ]
    expect(parseCSV(stringifyCSV(data))).toEqual(data)
  })

  it('quotes values containing comma/quote/newline', () => {
    const out = stringifyCSV([['x'], ['hello, "world"\nnext']])
    expect(parseCSV(out)).toEqual([['x'], ['hello, "world"\nnext']])
  })

  it('coerces non-strings', () => {
    expect(stringifyCSV([[1, true, null, 'x']])).toBe('1,true,,x\r\n')
  })
})
