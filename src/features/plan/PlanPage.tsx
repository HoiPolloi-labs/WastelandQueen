import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
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
} from 'lucide-react'
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

export function PlanPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { event, loading: eventLoading } = useEvent(eventId)
  const { signups, refresh: refreshSignups } = useSignups(eventId)
  const { assignments, moveOne, moveAcrossShifts, applyDraft, removeAll } =
    useAssignments(eventId)
  const [shift, setShift] = useState<ShiftNumber>(1)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

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
        Event nicht gefunden.{' '}
        <Link to="/plan/new" className="text-yellow-400 underline">
          Neues anlegen
        </Link>
      </div>
    )
  }

  const signupUrl = `${window.location.origin}/signup/${event.id}`

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
    const { building, shift: targetShift } = e.over.data.current as {
      building: BuildingType
      shift: ShiftNumber
    }

    const targetMembers = assignments.filter(
      (a) => a.building === building && a.shift === targetShift,
    )
    const wasCaptain = assignments.find(
      (a) => a.signup_id === signupId && a.shift === sourceShift,
    )?.is_captain
    const isCaptain =
      building === 'hub' && targetMembers.length === 0 ? true : Boolean(wasCaptain)

    if (sourceShift === targetShift) {
      await moveOne(signupId, targetShift, {
        building,
        is_captain: isCaptain,
        position: targetMembers.length,
      })
    } else {
      await moveAcrossShifts(signupId, sourceShift, targetShift, {
        building,
        // captain status doesn't carry across shifts — different building, fresh slate
        is_captain: building === 'hub' && targetMembers.length === 0,
        position: targetMembers.length,
      })
    }
  }

  const runAutoSort = async () => {
    if (
      assignments.length > 0 &&
      !confirm('Auto-Sort überschreibt alle aktuellen Zuweisungen. Trotzdem fortfahren?')
    ) {
      return
    }
    setBusy(true)
    const drafts = autoSort({
      signups,
      turretMode: event.turret_mode,
      shiftCount: event.shift_count >= 2 ? 2 : 1,
    })
    await applyDraft(drafts)
    setBusy(false)
  }

  const clearAll = async () => {
    if (!confirm('Alle Zuweisungen löschen?')) return
    await removeAll()
  }

  const copySignupUrl = async () => {
    await navigator.clipboard.writeText(signupUrl)
  }

  const draggingSignup = draggingId
    ? signupById.get(draggingId.split(':')[1] ?? '')
    : null

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <PageHeader title={`Planner · ${event.id}`} subtitle={`Modus: ${event.turret_mode} · Server ${event.home_server}`}>
        <Button variant="secondary" size="sm" onClick={copySignupUrl} title={signupUrl}>
          <ClipboardCopy className="h-3.5 w-3.5" />
          Sign-up URL
        </Button>
        <Link to={`/board/${event.id}`} target="_blank" rel="noreferrer">
          <Button variant="secondary" size="sm">
            <Eye className="h-3.5 w-3.5" />
            Board
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Segmented<ShiftNumber>
            options={
              event.shift_count >= 2
                ? [
                    { value: 1, label: 'Shift 1' },
                    { value: 2, label: 'Shift 2' },
                  ]
                : [{ value: 1, label: 'Shift 1' }]
            }
            value={shift}
            onChange={setShift}
          />
          {event.shift_count >= 2 && <OtherShiftDropzone currentShift={shift} />}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={refreshSignups} title="Sign-ups neu laden">
            <RefreshCcw className="h-3.5 w-3.5" />
            Reload
          </Button>
          <Button variant="primary" size="sm" onClick={runAutoSort} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            Auto-Sort
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <Eraser className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr_280px] gap-4">
        <UnassignedPool shift={shift} signups={signups} assignments={assignments} />
        <Plaza shift={shift} signups={signups} assignments={assignments} />
        <div className="flex flex-col gap-3">
          <ConflictBanner shift={shift} signups={signups} assignments={assignments} />
          <StatsSidebar shift={shift} signups={signups} />
        </div>
      </div>

      <DragOverlay>
        {draggingSignup ? (
          <PlayerChip signup={draggingSignup} shift={shift} dragId={`overlay`} compact />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
