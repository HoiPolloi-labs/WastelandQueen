import { useRef, useState } from 'react'
import { Download, Upload, Loader2, X, AlertTriangle, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseCSV, stringifyCSV } from '@/lib/csv'
import { Button } from '@/components/ui/Button'
import { signupSchema } from '@/features/signup/signup-schema'
import type { Signup } from '@/types/wk'

const HEADERS = [
  'ign',
  'alliance_tag',
  'server',
  'tier',
  'troop_type',
  'max_solo_lair',
  'rally_size',
  'true_might',
  'willing_captain',
  'shift_pref',
  'state_alliance_joined',
  'planner_notes',
] as const

type Header = (typeof HEADERS)[number]

interface RosterImportExportProps {
  eventId: string
  signups: Signup[]
  onRefresh: () => void | Promise<void>
}

interface RowReport {
  line: number
  ign: string
  status: 'ok' | 'error'
  message?: string
}

/**
 * Roster import/export. Default format is XLSX because everyone has Excel
 * and the breadth of users don't reliably know what CSV is. CSV stays as
 * an alternate for power users / Linux setups.
 *
 * Import accepts both XLSX and CSV — detected by file extension. Upserts by
 * IGN (case-insensitive), per-row validation via signupSchema, errors
 * collected without aborting the batch.
 *
 * XLSX library is dynamic-imported so the ~700KB SheetJS bundle only
 * downloads when the user clicks Export/Import (not on every Planner load).
 */
export function RosterImportExport({ eventId, signups, onRefresh }: RosterImportExportProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<RowReport[] | null>(null)

  const buildRows = (): (string | number | boolean | null)[][] => {
    const rows: (string | number | boolean | null)[][] = [HEADERS as unknown as string[]]
    for (const s of signups) {
      rows.push([
        s.ign,
        s.alliance_tag,
        s.server,
        s.tier,
        s.troop_type,
        s.max_solo_lair,
        s.rally_size,
        s.true_might,
        s.willing_captain,
        s.shift_pref,
        s.state_alliance_joined,
        s.planner_notes,
      ])
    }
    return rows
  }

  const exportXlsx = async () => {
    setBusy(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(buildRows())
      XLSX.utils.book_append_sheet(wb, ws, 'Roster')
      XLSX.writeFile(wb, `roster-${eventId}.xlsx`)
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = () => {
    const blob = new Blob([stringifyCSV(buildRows())], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roster-${eventId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importFile = async (file: File) => {
    setBusy(true)
    setReport(null)
    try {
      let rows: string[][]
      const lower = file.name.toLowerCase()
      if (
        lower.endsWith('.xlsx') ||
        lower.endsWith('.xlsm') ||
        lower.endsWith('.xls') ||
        file.type.includes('spreadsheetml') ||
        file.type.includes('excel')
      ) {
        rows = await parseXlsx(file)
      } else {
        const text = await file.text()
        rows = parseCSV(text)
      }
      await processRows(rows)
    } catch (e) {
      setReport([{ line: 0, ign: '', status: 'error', message: (e as Error).message }])
    } finally {
      setBusy(false)
    }
    await onRefresh()
  }

  const parseXlsx = async (file: File): Promise<string[][]> => {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = wb.SheetNames[0]
    if (!firstSheetName) throw new Error('Excel-Datei enthält kein Sheet')
    const ws = wb.Sheets[firstSheetName]
    if (!ws) throw new Error(`Sheet "${firstSheetName}" nicht lesbar`)
    // header:1 → array of arrays; defval:'' → don't skip empty cells;
    // raw:false → coerce numbers/booleans to strings for consistent parsing
    const out = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '', raw: false })
    return out.map((row) => row.map((cell) => (cell == null ? '' : String(cell))))
  }

  const processRows = async (rows: string[][]) => {
    if (rows.length < 2) {
      setReport([{ line: 1, ign: '', status: 'error', message: 'Datei ist leer oder hat keinen Header' }])
      return
    }
    const header = rows[0]!.map((h) => h.trim())
    const colIdx: Record<Header, number> = {} as Record<Header, number>
    for (const h of HEADERS) {
      const i = header.indexOf(h)
      if (i === -1) {
        setReport([{
          line: 1, ign: '', status: 'error',
          message: `Header fehlt: ${h}. Erwartet sind: ${HEADERS.join(', ')}`,
        }])
        return
      }
      colIdx[h] = i
    }

    const reports: RowReport[] = []
    const validRows: { ign: string; payload: Record<string, unknown> }[] = []
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!
      if (row.every((c) => c.trim() === '')) continue
      const cell = (h: Header) => row[colIdx[h]] ?? ''
      const ign = cell('ign').trim()
      const raw = {
        ign,
        alliance_tag: cell('alliance_tag').trim(),
        server: cell('server').trim(),
        tier: Number(cell('tier')),
        troop_type: cell('troop_type').trim().toLowerCase(),
        max_solo_lair: Number(cell('max_solo_lair')),
        rally_size: cell('rally_size').trim() ? Number(cell('rally_size')) : undefined,
        true_might: cell('true_might').trim() ? Number(cell('true_might')) : undefined,
        willing_captain: parseBool(cell('willing_captain')),
        shift_pref: cell('shift_pref').trim(),
      }
      const parsed = signupSchema.safeParse(raw)
      if (!parsed.success) {
        reports.push({
          line: i + 1, ign, status: 'error',
          message: parsed.error.issues.map((iss) => `${iss.path.join('.')}: ${iss.message}`).join('; '),
        })
        continue
      }
      validRows.push({
        ign,
        payload: {
          ...parsed.data,
          event_id: eventId,
          state_alliance_joined: parseBool(cell('state_alliance_joined')),
          planner_notes: cell('planner_notes').trim() || null,
        },
      })
    }

    // Row-by-row upsert keeps error reports tied to the source row and
    // means one bad row doesn't abort the rest of the batch.
    for (const r of validRows) {
      const { data: existing } = await supabase
        .from('signups')
        .select('id')
        .eq('event_id', eventId)
        .ilike('ign', r.ign)
        .maybeSingle()
      let err
      const existingId =
        existing && typeof (existing as { id?: unknown }).id === 'string'
          ? (existing as { id: string }).id
          : null
      if (existingId) {
        const { error } = await supabase
          .from('signups')
          .update(r.payload)
          .eq('id', existingId)
        err = error
      } else {
        const { error } = await supabase.from('signups').insert(r.payload)
        err = error
      }
      if (err) {
        reports.push({ line: 0, ign: r.ign, status: 'error', message: err.message })
      } else {
        reports.push({ line: 0, ign: r.ign, status: 'ok' })
      }
    }

    setReport(reports)
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Roster
        </h3>
        <span className="text-[10px] text-zinc-400">{signups.length} Spieler</span>
      </header>
      <p className="mb-2 text-[11px] text-zinc-400">
        Excel-Backup oder Re-Import für nächstes Event. Import upsert per IGN.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={() => void exportXlsx()} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export .xlsx
        </Button>
        <Button variant="ghost" size="sm" onClick={exportCsv} disabled={busy}>
          <Download className="h-3.5 w-3.5" />
          .csv
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Import
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xlsm,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importFile(f)
            e.target.value = ''
          }}
        />
      </div>

      {report && (
        <div className="mt-3 rounded border border-zinc-800 bg-zinc-950 p-2 text-[11px]">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-zinc-300">
              {report.filter((r) => r.status === 'ok').length} ok ·{' '}
              <span className="text-red-300">{report.filter((r) => r.status === 'error').length} Fehler</span>
            </span>
            <button
              type="button"
              onClick={() => setReport(null)}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <ul className="max-h-40 overflow-y-auto">
            {report.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 border-t border-zinc-800/60 py-1 first:border-t-0"
              >
                {r.status === 'ok' ? (
                  <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-300" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-300" />
                )}
                <span className="font-mono text-zinc-300">{r.ign || `Zeile ${r.line}`}</span>
                {r.message && (
                  <span className="text-zinc-400">— {r.message}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function parseBool(v: string): boolean {
  const s = v.trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes' || s === 'ja' || s === 'y'
}
