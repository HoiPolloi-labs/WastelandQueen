import type {
  Assignment,
  Building,
  EventConfig,
  NapTerm,
  ShiftNumber,
  Signup,
  TroopType,
} from '@/types/wk'

const BUILDING_LABEL: Record<Building, string> = {
  hub: 'HUB',
  'turret-n': 'N',
  'turret-s': 'S',
  'turret-e': 'E',
  'turret-w': 'W',
  mud: 'Mud',
  reserve: 'Res',
  'hit-squad': 'Hit',
  unassigned: 'Unassigned',
}

const TYPE_SHORT: Record<TroopType, string> = {
  fighter: 'F',
  shooter: 'S',
  rider: 'R',
}

function formatRally(n: number | null): string {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

/**
 * Plaza assignments as plain ASCII for posting into in-game chat (P&S
 * doesn't render markdown). Tight columns, universal abbreviations
 * (T13/F/S/R), no unicode box-drawing so it survives clipboard round-trips
 * through older Android keyboards.
 */
export function formatPlazaAsText(
  event: EventConfig,
  signups: Signup[],
  assignments: Assignment[],
  shift: ShiftNumber,
): string {
  const byId = new Map(signups.map((s) => [s.id, s]))
  const shiftAssignments = assignments.filter((a) => a.shift === shift)
  const buildingOrder: Building[] = ['hub', 'turret-n', 'turret-e', 'turret-s', 'turret-w']
  const sidebarOrder: Building[] = ['mud', 'reserve', 'hit-squad']

  const lines: string[] = []
  lines.push(`=== Shift ${shift} / ${event.id} / ${event.home_server} ===`)
  lines.push('')

  for (const b of buildingOrder) {
    const members = shiftAssignments
      .filter((a) => a.building === b)
      .sort((a, c) =>
        a.is_captain === c.is_captain ? a.position - c.position : a.is_captain ? -1 : 1,
      )
    const captainRow = members.find((m) => m.is_captain)
    const captainSig = captainRow ? byId.get(captainRow.signup_id) : null
    const label = BUILDING_LABEL[b].padEnd(4)
    if (!captainSig) {
      if (members.length === 0) {
        lines.push(`${label} (empty)`)
      } else {
        lines.push(`${label} (no captain)`)
      }
    } else {
      const rally = formatRally(captainSig.rally_size)
      lines.push(
        `${label} C:${captainSig.ign} [${captainSig.alliance_tag}] T${captainSig.tier} ${TYPE_SHORT[captainSig.troop_type]}${rally ? ' ' + rally : ''}`,
      )
    }
    for (const m of members) {
      if (m.is_captain) continue
      const s = byId.get(m.signup_id)
      if (!s) continue
      lines.push(`  ${s.ign} [${s.alliance_tag}] T${s.tier} ${TYPE_SHORT[s.troop_type]}`)
    }
    lines.push('')
  }

  for (const b of sidebarOrder) {
    const members = shiftAssignments.filter((a) => a.building === b)
    if (members.length === 0) continue
    if (b === 'hit-squad') {
      const targets = event.foreign_targets?.join(', ') ?? ''
      lines.push(`Hit${targets ? ' -> ' + targets : ''} (${members.length}):`)
      for (const m of members) {
        const s = byId.get(m.signup_id)
        if (!s) continue
        lines.push(`  ${s.ign} [${s.alliance_tag}] T${s.tier} ${TYPE_SHORT[s.troop_type]}`)
      }
    } else {
      const names = members
        .map((m) => byId.get(m.signup_id)?.ign)
        .filter(Boolean)
        .join(', ')
      lines.push(`${BUILDING_LABEL[b]} (${members.length}): ${names}`)
    }
  }

  return lines.join('\n').trimEnd() + '\n'
}

/**
 * NAP terms as plain ASCII for in-game chat. Status uppercase so it stands
 * out without emoji (which inconsistently render across P&S regions).
 */
export function formatNapAsText(terms: NapTerm[], eventId: string): string {
  if (terms.length === 0) return `=== NAP / ${eventId} ===\n(no entries)\n`
  const lines: string[] = []
  lines.push(`=== NAP / ${eventId} ===`)
  lines.push('')
  for (const t of terms) {
    lines.push(`vs ${t.with_state} [${t.status.toUpperCase()}]`)
    const window = formatWindow(t.starts_at_utc, t.ends_at_utc)
    if (window) lines.push(`  ${window}`)
    for (const line of t.terms.split('\n')) {
      const trimmed = line.trim()
      if (trimmed) lines.push(`  ${trimmed}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd() + '\n'
}

function formatWindow(starts: string | null, ends: string | null): string | null {
  const fmt = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`
  }
  if (starts && ends) return `${fmt(starts)} -> ${fmt(ends)} UTC`
  if (starts) return `from ${fmt(starts)} UTC`
  if (ends) return `until ${fmt(ends)} UTC`
  return null
}
