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

  it('drops trailing all-empty row from file with trailing comma + newline', () => {
    // `field1,field2,\n` yields `['field1','field2','']` then trailing `''`.
    // The trailing-row dropper should ignore the truly-empty row that comes
    // from the file ending in \n.
    expect(parseCSV('a,b\nx,y\n')).toEqual([
      ['a', 'b'],
      ['x', 'y'],
    ])
    // multi-cell empty row should also be dropped
    expect(parseCSV('a,b\nx,y\n,,\n')).toEqual([
      ['a', 'b'],
      ['x', 'y'],
    ])
  })

  it('preserves a row that has some empty cells but not all', () => {
    // not a "trailing empty row" — keep it
    expect(parseCSV('a,b,c\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ])
  })

  it('handles single-row file without trailing newline', () => {
    expect(parseCSV('only,row')).toEqual([['only', 'row']])
  })

  it('handles empty file', () => {
    expect(parseCSV('')).toEqual([])
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
