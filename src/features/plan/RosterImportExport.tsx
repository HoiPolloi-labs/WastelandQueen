import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Upload, Loader2, X, AlertTriangle, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseCSV, stringifyCSV, escapeFormula } from '@/lib/csv'
import { Button } from '@/components/ui/Button'
import { signupSchema } from '@/features/signup/signup-schema'
import type { Signup } from '@/types/wk'

const BASE_HEADERS = [
  'ign',
  'alliance_tag',
  'server',
  'tier',
  'troop_type',
  'max_solo_lair',
  'rally_size',
  'march_size',
  'true_might',
  'willing_captain',
  'shift_pref',
  'state_alliance_joined',
  'planner_notes',
] as const

const HEROES_HEADERS = ['agent_x_frags', 'dr_j_frags', 'nataly_frags'] as const

// Always-present tail columns (core sign-up data). Optional on IMPORT so a
// legacy sheet without them still loads. `secondary_troop_types` is pipe-
// delimited (never comma — the CSV is comma-separated).
const EXTRA_HEADERS = [
  'secondary_troop_types',
  'secondary_tier',
  'defend_at_start',
  'willing_foreign_hub',
] as const

type Header =
  | (typeof BASE_HEADERS)[number]
  | (typeof HEROES_HEADERS)[number]
  | (typeof EXTRA_HEADERS)[number]

const VALID_TYPES = ['fighter', 'shooter', 'rider']

interface RosterImportExportProps {
  eventId: string
  heroesEnabled: boolean
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
export function RosterImportExport({
  eventId,
  heroesEnabled,
  signups,
  onRefresh,
}: RosterImportExportProps) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<RowReport[] | null>(null)

  // EXTRA columns always export (core data). Heroes columns are tail-appended
  // only when the event has the feature on — keeps sheets clean for the 90%
  // of events that don't track frags.
  const headers: readonly Header[] = heroesEnabled
    ? [...BASE_HEADERS, ...EXTRA_HEADERS, ...HEROES_HEADERS]
    : [...BASE_HEADERS, ...EXTRA_HEADERS]

  const buildRows = (): (string | number | boolean | null)[][] => {
    const rows: (string | number | boolean | null)[][] = [headers as unknown as string[]]
    // SECURITY: any free-text field controlled by a signup (ign, alliance_tag,
    // server, planner_notes) goes through escapeFormula so Excel/Sheets render
    // a leading =/+/-/@ as literal text instead of executing it as a formula
    // when the planner opens the export. Numbers + booleans + the enum-like
    // troop_type don't need it (can't lead with those chars).
    const safe = (v: string | null) => (v == null ? null : escapeFormula(v))
    for (const s of signups) {
      const base: (string | number | boolean | null)[] = [
        safe(s.ign),
        safe(s.alliance_tag),
        safe(s.server),
        s.tier,
        s.troop_type,
        s.max_solo_lair,
        s.rally_size,
        s.march_size,
        s.true_might,
        s.willing_captain,
        safe(s.shift_pref),
        s.state_alliance_joined,
        safe(s.planner_notes),
        // EXTRA columns (always present). secondary types are enum values →
        // no formula-injection risk; pipe-delimited so a comma can't split them.
        s.secondary_troop_types ? s.secondary_troop_types.join('|') : '',
        s.secondary_tier,
        s.defend_at_start,
        s.willing_foreign_hub,
      ]
      if (heroesEnabled) {
        base.push(s.agent_x_frags, s.dr_j_frags, s.nataly_frags)
      }
      rows.push(base)
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
    if (!firstSheetName) throw new Error(t('roster.err_xlsx_no_sheet'))
    const ws = wb.Sheets[firstSheetName]
    if (!ws) throw new Error(t('roster.err_sheet_unreadable', { name: firstSheetName }))
    // header:1 → array of arrays; defval:'' → don't skip empty cells;
    // raw:false → coerce numbers/booleans to strings for consistent parsing
    const out = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '', raw: false })
    return out.map((row) => row.map((cell) => (cell == null ? '' : String(cell))))
  }

  const processRows = async (rows: string[][]) => {
    if (rows.length < 2) {
      setReport([{ line: 1, ign: '', status: 'error', message: t('roster.err_empty_or_no_header') }])
      return
    }
    const header = rows[0]!.map((h) => h.trim())
    const colIdx: Partial<Record<Header, number>> = {}
    for (const h of BASE_HEADERS) {
      const i = header.indexOf(h)
      if (i === -1) {
        setReport([{
          line: 1, ign: '', status: 'error',
          message: t('roster.err_missing_header', { header: h, expected: BASE_HEADERS.join(', ') }),
        }])
        return
      }
      colIdx[h] = i
    }
    // Hero columns are optional in imports — older sheets pre-feature won't
    // have them, and that's fine. Only pick up values when both the column
    // exists in the sheet AND the event has heroes_enabled.
    for (const h of HEROES_HEADERS) {
      const i = header.indexOf(h)
      if (i !== -1) colIdx[h] = i
    }
    // EXTRA columns optional on import too — legacy sheets pre-feature lack them.
    for (const h of EXTRA_HEADERS) {
      const i = header.indexOf(h)
      if (i !== -1) colIdx[h] = i
    }

    const reports: RowReport[] = []
    const validRows: { ign: string; payload: Record<string, unknown> }[] = []
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!
      if (row.every((c) => c.trim() === '')) continue
      const cell = (h: Header) => {
        const idx = colIdx[h]
        return idx == null ? '' : row[idx] ?? ''
      }
      const ign = cell('ign').trim()
      const numOrZero = (h: Header) => {
        const v = cell(h).trim()
        if (!v) return 0
        const n = Number(v)
        return Number.isFinite(n) && n >= 0 ? n : 0
      }
      // Pipe-delimited secondary types → lowercased valid-enum array (or null).
      const secondaryRaw = cell('secondary_troop_types').trim()
      const secondaryTypes = secondaryRaw
        ? secondaryRaw
            .split('|')
            .map((x) => x.trim().toLowerCase())
            .filter((x) => VALID_TYPES.includes(x))
        : []
      const raw = {
        ign,
        alliance_tag: cell('alliance_tag').trim(),
        server: cell('server').trim(),
        tier: Number(cell('tier')),
        troop_type: cell('troop_type').trim().toLowerCase(),
        max_solo_lair: Number(cell('max_solo_lair')),
        rally_size: cell('rally_size').trim() ? Number(cell('rally_size')) : undefined,
        march_size: cell('march_size').trim() ? Number(cell('march_size')) : undefined,
        true_might: cell('true_might').trim() ? Number(cell('true_might')) : undefined,
        willing_captain: parseBool(cell('willing_captain')),
        shift_pref: cell('shift_pref').trim(),
        secondary_troop_types: secondaryTypes.length > 0 ? secondaryTypes : null,
        secondary_tier: cell('secondary_tier').trim() ? Number(cell('secondary_tier')) : null,
        defend_at_start: parseBool(cell('defend_at_start')),
        willing_foreign_hub: parseBool(cell('willing_foreign_hub')),
        agent_x_frags: numOrZero('agent_x_frags'),
        dr_j_frags: numOrZero('dr_j_frags'),
        nataly_frags: numOrZero('nataly_frags'),
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
          {t('roster.section_title')}
        </h3>
        <span className="text-[10px] text-zinc-400">{t('roster.player_count', { count: signups.length })}</span>
      </header>
      <p className="mb-2 text-[11px] text-zinc-400">{t('roster.description')}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={() => void exportXlsx()} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {t('roster.export_xlsx')}
        </Button>
        <Button variant="ghost" size="sm" onClick={exportCsv} disabled={busy}>
          <Download className="h-3.5 w-3.5" />
          {t('roster.export_csv')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {t('roster.import')}
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
              {report.filter((r) => r.status === 'ok').length} {t('roster.ok_label')} ·{' '}
              <span className="text-red-300">{report.filter((r) => r.status === 'error').length} {t('roster.errors_label')}</span>
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
                <span className="font-mono text-zinc-300">{r.ign || t('roster.line_label', { n: r.line })}</span>
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
