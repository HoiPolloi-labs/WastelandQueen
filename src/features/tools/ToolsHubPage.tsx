import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Wrench, Rocket, HeartPulse, FlaskConical, Grid3x3, Puzzle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/cn'

interface ToolMeta {
  key: string // i18n sub-key under tools.cards.<key>
  to: string
  Icon: typeof Wrench
  available: boolean
}

// One row per tool. Flip `available` true as each batch ships its page +
// route; not-yet-built tools render dimmed with a "soon" badge (no dead link).
const TOOLS: ToolMeta[] = [
  { key: 'fast_comeback', to: '/tools/fast-comeback', Icon: Rocket, available: true },
  { key: 'healing', to: '/tools/healing', Icon: HeartPulse, available: true },
  { key: 'sorting', to: '/tools/sorting', Icon: FlaskConical, available: true },
  { key: 'bingo', to: '/tools/bingo', Icon: Grid3x3, available: true },
  { key: 'tetramino', to: '/tools/tetramino', Icon: Puzzle, available: true },
]

export function ToolsHubPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('tools.hub.title')} subtitle={t('tools.hub.subtitle')} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TOOLS.map(({ key, to, Icon, available }) => {
          const inner = (
            <div
              className={cn(
                'flex h-full items-start gap-3 rounded-lg border p-4 transition',
                available
                  ? 'border-zinc-800 bg-zinc-900/40 hover:border-yellow-600/60 hover:bg-yellow-500/5'
                  : 'border-zinc-800/60 bg-zinc-900/20 opacity-60',
              )}
            >
              <Icon
                className={cn('mt-0.5 h-5 w-5 flex-shrink-0', available ? 'text-yellow-400' : 'text-zinc-500')}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {t(`tools.cards.${key}.title`)}
                  </h3>
                  {!available && (
                    <span className="rounded border border-zinc-700 px-1 py-px text-[9px] uppercase tracking-wider text-zinc-500">
                      {t('tools.soon')}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-400">{t(`tools.cards.${key}.desc`)}</p>
              </div>
            </div>
          )
          return available ? (
            <Link key={key} to={to} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 rounded-lg">
              {inner}
            </Link>
          ) : (
            <div key={key} aria-disabled>
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
