/**
 * Minimal RFC 4180 CSV parser + stringifier.
 * - Handles double-quoted values, embedded commas, embedded newlines, escaped
 *   quotes ("").
 * - Returns/accepts string[][] (header is just the first row).
 * - Not streaming — for our roster files (50–200 rows) the whole-file
 *   approach is simpler than pulling in PapaParse (25kb).
 */

export function parseCSV(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  // strip BOM if present
  if (input.charCodeAt(0) === 0xfeff) i = 1
  const len = input.length

  while (i < len) {
    const c = input[i]!
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (c === '\r') {
      // accept \r\n or bare \r
      if (input[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      i++
      continue
    }
    if (c === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      i++
      continue
    }
    field += c
    i++
  }
  // flush final field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // drop trailing empty row that comes from files ending in newline
  if (rows.length > 0 && rows[rows.length - 1]!.length === 1 && rows[rows.length - 1]![0] === '') {
    rows.pop()
  }
  return rows
}

const NEEDS_QUOTING = /[",\r\n]/

export function stringifyCSV(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell == null) return ''
          const s = String(cell)
          if (NEEDS_QUOTING.test(s)) return `"${s.replace(/"/g, '""')}"`
          return s
        })
        .join(','),
    )
    .join('\r\n') + '\r\n'
}
