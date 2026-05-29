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
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { KILL_POINTS, DEATH_POINTS } from '@/types/wk'

export function CheatSheetPage() {
  const { t } = useTranslation()
  // i18next returns string[] for these keys (returnObjects). Typed helper so
  // the .map() calls below stay clean.
  const list = (key: string): string[] => t(key, { returnObjects: true }) as string[]
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t('cheatsheet.title')}
        subtitle={t('cheatsheet.subtitle')}
      >
        <Link to="/">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('cheatsheet.back_button')}
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-6">
        <Section icon={Map} title={t('cheatsheet.section_geometry')}>
          <p>{t('cheatsheet.geometry.p1')}</p>
          <p className="text-xs text-zinc-400">{t('cheatsheet.geometry.p2')}</p>
        </Section>

        <Section icon={Trophy} title={t('cheatsheet.section_win')}>
          <ul className="list-inside list-disc space-y-1">
            {list('cheatsheet.win.items').map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Section>

        <Section icon={Crown} title={t('cheatsheet.section_captain')}>
          <ol className="list-inside list-decimal space-y-1">
            {list('cheatsheet.captain.steps').map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ol>
          <p className="text-xs text-zinc-400">{t('cheatsheet.captain.note')}</p>
        </Section>

        <Section icon={Swords} title={t('cheatsheet.section_scoring')}>
          <PointTable title={t('cheatsheet.scoring.kill_title')} data={KILL_POINTS} />
          <PointTable title={t('cheatsheet.scoring.death_title')} data={DEATH_POINTS} />
          <p className="text-xs text-zinc-400">{t('cheatsheet.scoring.occupation')}</p>
        </Section>

        <Section icon={Shield} title={t('cheatsheet.section_grades')}>
          <ul className="list-inside list-disc space-y-1">
            {list('cheatsheet.grades.items').map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Section>

        <Section icon={Skull} title={t('cheatsheet.section_loss')}>
          <p>{t('cheatsheet.loss.intro')}</p>
          <ul className="list-inside list-disc space-y-1 text-xs text-zinc-400">
            {list('cheatsheet.loss.items').map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Section>

        <Section icon={Crosshair} title={t('cheatsheet.section_preevent')}>
          <ul className="list-inside list-disc space-y-1">
            {list('cheatsheet.preevent.items').map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Section>

        <Section icon={Zap} title={t('cheatsheet.section_nap')}>
          <ul className="list-inside list-disc space-y-1 font-mono text-xs text-zinc-300">
            {list('cheatsheet.nap.items').map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Section>

        <Section icon={AlertTriangle} title={t('cheatsheet.section_triggers')}>
          <ul className="list-inside list-disc space-y-1">
            {list('cheatsheet.triggers.items').map((x, i) => (
              <li key={i}>{x}</li>
            ))}
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
            <div className="text-zinc-400">T{tier}</div>
            <div className="text-zinc-200">{pts}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
