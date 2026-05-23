import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { save } from '@/lib/storage'
import { LAST_EVENT_KEY } from './PlanIndex'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  Loader2,
  Wand2,
  Eraser,
  ExternalLink,
  ClipboardCopy,
  Eye,
  RefreshCcw,
  Trophy,
  Copy,
  FileText,
  Check,
} from 'lucide-react'
import { formatPlazaAsText } from '@/lib/share-formats'
import { useEvent } from '@/features/event/use-event'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { PageHeader } from '@/components/ui/PageHeader'
import type { Building as BuildingType, ShiftNumber, Signup } from '@/types/wk'
import { useSignups } from './use-signups'
import { useAssignments } from './use-assignments'
import { autoSort } from './auto-sort'
import { Plaza } from './Plaza'
import { UnassignedPool } from './UnassignedPool'
import { PlayerChip } from './PlayerChip'
import { ConflictBanner } from './ConflictBanner'
import { StatsSidebar } from './StatsSidebar'
import { OtherShiftDropzone } from './OtherShiftDropzone'
import { NotesProvider } from './NotesContext'
import { HeroesEnabledProvider } from './HeroesContext'
import { NoteEditor } from './NoteEditor'
import { HealthCheckPanel } from './HealthCheckPanel'
import { PreEventStatusPanel } from './PreEventStatusPanel'
import { WebhookSettings } from './WebhookSettings'
import { TokenRotation } from './TokenRotation'
import { RosterImportExport } from './RosterImportExport'
import { HeroesSettings } from './HeroesSettings'
import { NapPanel } from '@/features/nap/NapPanel'
import { shiftWindowLabel } from '@/features/event/shift-window'
import { EventPicker } from '@/features/event/EventPicker'

export function PlanPage() {
  const { t } = useTranslation()
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { event, loading: eventLoading, refresh: refreshEvent } = useEvent(eventId)
  const { signups, refresh: refreshSignups } = useSignups(eventId)
  const {
    assignments,
    moveOne,
    moveAcrossShifts,
    applyDraft,
    removeAll,
    setCaptainPresent,
  } = useAssignments(eventId)
  const [shift, setShift] = useState<ShiftNumber>(1)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [copiedPlaza, setCopiedPlaza] = useState(false)

  // PointerSensor handles mouse + stylus; TouchSensor splits off touch with
  // a delay-based activation so finger-jitter during scroll doesn't
  // accidentally start a drag. 150ms hold + 5px tolerance is the @dnd-kit
  // recommended baseline for mobile UX.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  useEffect(() => {
    if (event?.id) save(LAST_EVENT_KEY, event.id)
  }, [event?.id])

  const signupById = useMemo(() => {
    const m = new Map<string, Signup>()
    for (const s of signups) m.set(s.id, s)
    return m
  }, [signups])

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  if (!event) {
    return (
      <div className="text-center text-zinc-400">
        {t('plan.event_not_found')}{' '}
        <Link to="/plan/new" className="text-yellow-400 underline">
          {t('plan.create_new')}
        </Link>
      </div>
    )
  }

  const signupUrl = `${window.location.origin}/signup/${event.id}/${event.signup_token}`
  const boardUrl = `${window.location.origin}/board/${event.id}/${event.board_token}`

  const onDragStart = (e: DragStartEvent) => {
    setDraggingId(String(e.active.id))
  }

  const onDragEnd = async (e: DragEndEvent) => {
    setDraggingId(null)
    if (!e.over) return
    const { signupId, shift: sourceShift } = e.active.data.current as {
      signupId: string
      shift: ShiftNumber
    }
    const { building, shift: targetShift, foreignTarget } = e.over.data.current as {
      building: BuildingType
      shift: ShiftNumber
      foreignTarget?: string | null
    }

    // Per-target Hit-Squad sub-buckets share `building='hit-squad'` so the
    // member-count needs to be scoped to the exact bucket we're dropping into.
    const targetMembers = assignments.filter(
      (a) =>
        a.building === building &&
        a.shift === targetShift &&
        (a.foreign_target ?? null) === (foreignTarget ?? null),
    )
    const wasCaptain = assignments.find(
      (a) => a.signup_id === signupId && a.shift === sourceShift,
    )?.is_captain
    const isCaptain =
      building === 'hub' && targetMembers.length === 0 ? true : Boolean(wasCaptain)

    // Only set foreign_target on hit-squad rows; everywhere else it stays null.
    const targetPatch = building === 'hit-squad' ? { foreign_target: foreignTarget ?? null } : { foreign_target: null }

    if (sourceShift === targetShift) {
      await moveOne(signupId, targetShift, {
        building,
        is_captain: isCaptain,
        position: targetMembers.length,
        ...targetPatch,
      })
    } else {
      await moveAcrossShifts(signupId, sourceShift, targetShift, {
        building,
        // captain status doesn't carry across shifts — different building, fresh slate
        is_captain: building === 'hub' && targetMembers.length === 0,
        position: targetMembers.length,
        ...targetPatch,
      })
    }
  }

  const runAutoSort = async () => {
    if (
      assignments.length > 0 &&
      !confirm(t('plan.confirm_autosort'))
    ) {
      return
    }
    setBusy(true)
    const drafts = autoSort({
      signups,
      turretMode: event.turret_mode,
      shiftCount: Math.max(1, Math.min(4, event.shift_count)) as 1 | 2 | 3 | 4,
      hubDefenderTarget: event.hub_defender_target,
    })
    await applyDraft(drafts)
    setBusy(false)
  }

  const clearAll = async () => {
    if (!confirm(t('plan.confirm_clear_all'))) return
    await removeAll()
  }

  const copySignupUrl = async () => {
    await navigator.clipboard.writeText(signupUrl)
  }

  const copyPlazaForChat = async () => {
    if (!event) return
    const text = formatPlazaAsText(event, signups, assignments, shift)
    await navigator.clipboard.writeText(text)
    setCopiedPlaza(true)
    setTimeout(() => setCopiedPlaza(false), 1500)
  }

  const draggingSignup = draggingId
    ? signupById.get(draggingId.split(':')[1] ?? '')
    : null

  const editingSignup = editingNoteId
    ? signups.find((s) => s.id === editingNoteId) ?? null
    : null

  return (
    <NotesProvider value={{ openNote: setEditingNoteId }}>
    <HeroesEnabledProvider value={event.heroes_enabled}>
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <PageHeader
        title={`Planner · ${event.id}`}
        subtitle={
          <>
            {event.state_grade && (
              <span className="font-semibold text-yellow-400">
                {event.state_grade.toUpperCase()} ·{' '}
              </span>
            )}
            <span>{t('plan.mode_label')}: {event.turret_mode} · {t('plan.server_label')} {event.home_server}</span>
            {event.state_grade &&
              ['gold', 'platinum', 'diamond', 'legend'].includes(event.state_grade) && (
                <span> · {t('plan.trophy_loss_note')}</span>
              )}
            {(event.governor_ign || event.assessor_ign || event.negotiator_ign) && (
              <span className="mt-1 block text-[11px]">
                {event.governor_ign && (
                  <span className="mr-3">
                    <span className="text-zinc-400">{t('plan.role_gov')}</span>{' '}
                    <span className="text-yellow-300">{event.governor_ign}</span>
                  </span>
                )}
                {event.assessor_ign && (
                  <span className="mr-3">
                    <span className="text-zinc-400">{t('plan.role_ass')}</span>{' '}
                    <span className="text-zinc-300">{event.assessor_ign}</span>
                  </span>
                )}
                {event.negotiator_ign && (
                  <span className="mr-3">
                    <span className="text-zinc-400">{t('plan.role_neg')}</span>{' '}
                    <span className="text-zinc-300">{event.negotiator_ign}</span>
                  </span>
                )}
              </span>
            )}
            {event.foreign_targets && event.foreign_targets.length > 0 && (
              <span className="mt-1 block text-[11px]">
                <span className="text-zinc-400">{t('plan.foreign_targets_label')}</span>{' '}
                {event.foreign_targets.map((tgt) => (
                  <span
                    key={tgt}
                    className="ml-1 inline-block rounded border border-orange-500/40 bg-orange-500/10 px-1.5 py-0.5 font-mono text-orange-300"
                  >
                    {tgt}
                  </span>
                ))}
              </span>
            )}
          </>
        }
      >
        <EventPicker currentEventId={event.id} />
        <Button variant="secondary" size="sm" onClick={copySignupUrl} title={signupUrl}>
          <ClipboardCopy className="h-3.5 w-3.5" />
          {t('plan.signup_url_button')}
        </Button>
        <a href={boardUrl} target="_blank" rel="noreferrer">
          <Button variant="secondary" size="sm">
            <Eye className="h-3.5 w-3.5" />
            {t('plan.board_button')}
            <ExternalLink className="h-3 w-3" />
          </Button>
        </a>
        <Link to={`/awards/${event.id}/${event.planner_token}`}>
          <Button variant="secondary" size="sm">
            <Trophy className="h-3.5 w-3.5" />
            {t('plan.awards_button')}
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Pass event row via React Router state so EventSetupPage doesn't
            // have to re-fetch — anon can't read events anymore (RLS).
            navigate('/plan/new', { state: { clonedFrom: event } })
          }}
          title={t('plan.clone_button_title')}
        >
          <Copy className="h-3.5 w-3.5" />
          {t('plan.clone_button')}
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<ShiftNumber>
            options={Array.from({ length: event.shift_count }, (_, i) => ({
              value: (i + 1) as ShiftNumber,
              label: t('shifts.shift_label', { n: i + 1 }),
              hint: shiftWindowLabel(event.starts_at_utc, event.shift_count, (i + 1) as ShiftNumber),
            }))}
            value={shift}
            onChange={setShift}
          />
          <span className="text-[11px] text-zinc-400">
            {shiftWindowLabel(event.starts_at_utc, event.shift_count, shift)}
          </span>
          {event.shift_count >= 2 && (
            <OtherShiftDropzone currentShift={shift} shiftCount={event.shift_count} />
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={refreshSignups} title={t('plan.reload_signups_title')}>
            <RefreshCcw className="h-3.5 w-3.5" />
            {t('plan.reload_button')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyPlazaForChat}
            title={t('plan.copy_plaza_title', { n: shift })}
          >
            {copiedPlaza ? (
              <Check className="h-3.5 w-3.5 text-emerald-300" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            {t('plan.copy_button')}
          </Button>
          <Button variant="primary" size="sm" onClick={runAutoSort} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {t('plan.autosort_button')}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <Eraser className="h-3.5 w-3.5" />
            {t('plan.clear_button')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_280px]">
        <UnassignedPool shift={shift} signups={signups} assignments={assignments} />
        <Plaza
          shift={shift}
          signups={signups}
          assignments={assignments}
          foreignTargets={event.foreign_targets}
          onCaptainPresentChange={setCaptainPresent}
        />
        <div className="flex flex-col gap-3">
          <ConflictBanner shift={shift} signups={signups} assignments={assignments} />
          <HealthCheckPanel
            signups={signups}
            assignments={assignments}
            event={event}
            shift={shift}
          />
          <PreEventStatusPanel eventId={event.id} signups={signups} assignments={assignments} />
          <StatsSidebar shift={shift} signups={signups} />
          <NapPanel eventId={event.id} />
          <HeroesSettings event={event} onChange={() => refreshEvent()} />
          <WebhookSettings />
          <RosterImportExport
            eventId={event.id}
            heroesEnabled={event.heroes_enabled}
            signups={signups}
            onRefresh={refreshSignups}
          />
          <TokenRotation eventId={event.id} />
        </div>
      </div>

      <DragOverlay>
        {draggingSignup ? (
          <PlayerChip signup={draggingSignup} shift={shift} dragId={`overlay`} compact />
        ) : null}
      </DragOverlay>
    </DndContext>
    {editingSignup && (
      <NoteEditor signup={editingSignup} onClose={() => setEditingNoteId(null)} />
    )}
    </HeroesEnabledProvider>
    </NotesProvider>
  )
}
