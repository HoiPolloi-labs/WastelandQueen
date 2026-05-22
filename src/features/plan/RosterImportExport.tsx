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
 * CSV roster import/export. Export dumps the current event's signups for
 * disaster recovery or to seed the next event (clone-like). Import upserts
 * by IGN — existing rows update, new rows insert. Planner-only (the RLS
 * policies on signups allow planner CRUD).
 */
export function RosterImportExport({ eventId, signups, onRefresh }: RosterImportExportProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<RowReport[] | null>(null)

  const exportCsv = () => {
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
    const blob = new Blob([stringifyCSV(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roster-${eventId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importCsv = async (file: File) => {
    setBusy(true)
    setReport(null)
    const text = await file.text()
    const rows = parseCSV(text)
    if (rows.length < 2) {
      setReport([{ line: 1, ign: '', status: 'error', message: 'CSV ist leer oder hat keinen Header' }])
      setBusy(false)
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
        setBusy(false)
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

    // Upsert in two passes — first try to bulk insert, then UPDATE-on-conflict
    // for the duplicates. Doing this row-by-row keeps error reporting tied to
    // the original CSV line and avoids a single bad row aborting the batch.
    for (const r of validRows) {
      const { data: existing } = await supabase
        .from('signups')
        .select('id')
        .eq('event_id', eventId)
        .ilike('ign', r.ign)
        .maybeSingle()
      let err
      if (existing) {
        const { error } = await supabase
          .from('signups')
          .update(r.payload)
          .eq('id', (existing as { id: string }).id)
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
    setBusy(false)
    await onRefresh()
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Roster CSV
        </h3>
        <span className="text-[10px] text-zinc-400">{signups.length} Spieler</span>
      </header>
      <p className="mb-2 text-[11px] text-zinc-400">
        Export für Backup oder Re-Import in nächstes Event. Import upsert per IGN.
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" />
          Export
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
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importCsv(f)
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
