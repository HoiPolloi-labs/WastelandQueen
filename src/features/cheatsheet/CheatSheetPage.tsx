import { Link } from 'react-router'
import {
  Crown,
  Swords,
  Crosshair,
  Zap,
  Shield,
  AlertTriangle,
  Trophy,
  Skull,
  Map,
  ArrowLeft,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { KILL_POINTS, DEATH_POINTS } from '@/types/wk'

export function CheatSheetPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="WK Cheat-Sheet"
        subtitle="Schneller Spickzettel zur Wasteland-King-Mechanik. Volle Doku im Repo unter docs/."
      >
        <Link to="/">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Zurück
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-6">
        <Section icon={Map} title="Geometrie">
          <p>
            <strong>Zenith Plaza</strong> = Mitte mit Hub + 4 Türmen (N/S/E/W).{' '}
            <strong>Mud</strong> = brauner Ring drumrum (angreifbar während WK).{' '}
            <strong>Green</strong> = normaler Map-Teil, in fremdem State unattackable.
          </p>
          <p className="text-xs text-zinc-500">
            Türme die nicht der gleichen Alliance gehören wie der Hub <em>feuern auf den
            Hub</em> → permanente Truppenverluste. Deshalb: alle in <em>eine</em>
            temporäre State-Alliance.
          </p>
        </Section>

        <Section icon={Trophy} title="Win-Conditions">
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>8h consecutive Hub-Hold</strong> → Instant-Win + 30-min Hub-Shield
            </li>
            <li>
              <strong>Sonst</strong>: meiste Total-Hub-Occupation-Time nach 24h
            </li>
            <li>
              Consecutive-8h überschreibt Total-Time. Foreign-Hub-Hold gibt dir
              automatisches Home-Hub-Shield.
            </li>
          </ul>
        </Section>

        <Section icon={Crown} title="Captain-Duties">
          <ol className="list-inside list-decimal space-y-1">
            <li>Als erstes ins Building rein</li>
            <li>Super Reinforcement aktivieren</li>
            <li>Position halten</li>
            <li>Reinforcements im Alliance-Chat callen</li>
          </ol>
          <p className="text-xs text-zinc-500">
            Captain-Rally = Building-Capacity. Captain-Truppen-Stats = jede einlaufende
            March bekommt sie. Stärkster verfügbarer Spieler captained den Hub.
          </p>
        </Section>

        <Section icon={Swords} title="Personal Scoring (10.000 für volle Rewards)">
          <PointTable
            title="Kill Points (Hub/Türme oder Mud/Foreign-RSS-Tiles)"
            data={KILL_POINTS}
          />
          <PointTable
            title="Death Points (NUR Hub oder Türme — Mud-Deaths zählen NICHT)"
            data={DEATH_POINTS}
          />
          <p className="text-xs text-zinc-500">
            <strong>Occupation</strong>: bis zu 2.000 Punkte für kumulative 120 Min auf
            Hub/Turm. Kein Reset wenn du runtergeschmissen wirst.
          </p>
        </Section>

        <Section icon={Shield} title="State Grades & Rewards">
          <ul className="list-inside list-disc space-y-1">
            <li>Starter → Bronze → Silver → Gold → Platinum → Diamond → Legend (Top 15)</li>
            <li>
              <span className="text-yellow-300">Gold+</span>: Nataly-Frags freigeschaltet
              (5 / 8 / 12 Frags pro Event aus der Ruler's-Hand-Box)
            </li>
            <li>
              <span className="text-yellow-300">Gold+</span>: Trophy-VERLUST wenn nur
              defended → musst offensiv foreign-Hub stehlen
            </li>
            <li>
              Governor's-Award-Boxes (King / Rulers / Loyalty / Contribution) für die
              winning Alliance, governor verteilt
            </li>
            <li>
              Foreign-State-Capture verdoppelt den Box-Pool und gibt Coffer-Tax-Stream
            </li>
          </ul>
        </Section>

        <Section icon={Skull} title="Troop-Loss-Flow">
          <p>
            Casualties → Infirmary → Deep Healing → Alliance Infirmary →{' '}
            <strong>PERMANENT</strong>
          </p>
          <ul className="list-inside list-disc space-y-1 text-xs text-zinc-400">
            <li>Ohne Investment: 30% permanent. Maxed Miraculous Survival: ~18%</li>
            <li>Deep Heal = free Nano Potions (slow). Wenn voll → Alliance-Inf-Trap</li>
            <li>
              <strong>Alliance-Infirmary-Trap</strong>: wenn du beim Verlassen der
              State-Alliance noch Truppen drin hast → die sterben permanent
            </li>
            <li>
              <strong>Fast Comeback post-event</strong>: 300% Training-Boost, capped at
              120% of might lost (nur Hub/Turm-Deaths zählen für den Cap, nicht
              Turret-Fire oder Mud-Deaths)
            </li>
          </ul>
        </Section>

        <Section icon={Crosshair} title="Pre-Event Checklist (F2P)">
          <ul className="list-inside list-disc space-y-1">
            <li>Miraculous Survival in Nova/Research auf Max</li>
            <li>First Aid + Instant Heal Commander-Talents geladen</li>
            <li>Trainings-Speedups + Ressourcen stockpilen (für FC-Konsum)</li>
            <li>Infirmary mit T1-Taxis vollfüllen (Hi-Tier-Deaths skippen direkt zu Deep Healing)</li>
            <li>State-Alliance beigetreten</li>
            <li>Wenn Mudsitter: 3-Tage-Schild oder 8h+1d-Stack</li>
          </ul>
        </Section>

        <Section icon={Zap} title="NAP-Begriffe (typisch)">
          <ul className="list-inside list-disc space-y-1 font-mono text-xs text-zinc-300">
            <li>"No T11+ marches into Hub"</li>
            <li>"No attacking on green"</li>
            <li>"Mud-sit RSS gathering allowed both directions"</li>
            <li>"48h statewide NAP" — kickt um Reset auf WK-Tag</li>
          </ul>
        </Section>

        <Section icon={AlertTriangle} title="Trigger-Punkte">
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>State-Take vs NAP</strong>: take, wenn deine Top-3 True-Might je den
              Top-1 des Gegners übertrifft UND genug Taxi-Reserves zuhause für den Home-Hub
            </li>
            <li>
              <strong>Konzedier früh</strong> wenn overmatched — 24h sinnloses Defend kosten
              Wochen Retraining
            </li>
            <li>
              <strong>FC sparsam triggern</strong>: nie mehr FC-Cap als du verbrauchen kannst
              in 2 Wochen
            </li>
          </ul>
        </Section>
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Crown
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-yellow-400">
        <Icon className="h-4 w-4" />
        {title}
      </h2>
      <div className="flex flex-col gap-2 text-sm text-zinc-300">{children}</div>
    </section>
  )
}

function PointTable({
  title,
  data,
}: {
  title: string
  data: Record<number, number>
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-zinc-400">{title}</p>
      <div className="grid grid-cols-6 gap-1 text-center text-[11px] sm:grid-cols-12">
        {Object.entries(data).map(([tier, pts]) => (
          <div
            key={tier}
            className="rounded border border-zinc-800 bg-zinc-900 px-1 py-1 font-mono"
          >
            <div className="text-zinc-500">T{tier}</div>
            <div className="text-zinc-200">{pts}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
