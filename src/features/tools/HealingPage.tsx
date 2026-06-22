import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, HeartPulse, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { computeHealing, LOSS_PCT_NONE, LOSS_PCT_MAXED } from './healing'

type Preset = 'none' | 'maxed' | 'custom'
const fmt = (n: number) => n.toLocaleString('en-US')

export function HealingPage() {
  const { t } = useTranslation()
  const [casStr, setCasStr] = useState('')
  const [preset, setPreset] = useState<Preset>('none')
  const [customStr, setCustomStr] = useState('24')

  const casualties = casStr ? Number(casStr.replace(/[.\s,]/g, '')) : 0
  const lossPct =
    preset === 'none' ? LOSS_PCT_NONE : preset === 'maxed' ? LOSS_PCT_MAXED : Number(customStr) || 0
  const r = computeHealing(casualties, lossPct)
  const hasInput = r.casualties > 0

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('tools.healing.title')} subtitle={t('tools.healing.subtitle')}>
        <Link to="/tools">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('tools.back')}
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-4">
        <Input
          label={t('tools.healing.input_label')}
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          placeholder={t('tools.healing.input_placeholder')}
          value={casStr}
          onChange={(e) => setCasStr(e.target.value)}
          hint={t('tools.healing.input_hint')}
        />

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">
            {t('tools.healing.ms_label')}
          </span>
          <Segmented<Preset>
            value={preset}
            onChange={setPreset}
            options={[
              { value: 'none', label: t('tools.healing.ms_none') },
              { value: 'maxed', label: t('tools.healing.ms_maxed') },
              { value: 'custom', label: t('tools.healing.ms_custom') },
            ]}
          />
          {preset === 'custom' && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={customStr}
                onChange={(e) => setCustomStr(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-zinc-400">% {t('tools.healing.custom_suffix')}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-red-600/40 bg-red-500/5 p-4">
            <div className="text-xs text-zinc-400">{t('tools.healing.permanent_label')}</div>
            <div className="mt-1 font-mono text-2xl font-semibold text-red-300">
              {hasInput ? fmt(r.permanent) : '—'}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{r.lossPct}%</div>
          </div>
          <div className="rounded-lg border border-emerald-600/40 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <HeartPulse className="h-3.5 w-3.5 text-emerald-400" />
              {t('tools.healing.healable_label')}
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold text-emerald-300">
              {hasInput ? fmt(r.healable) : '—'}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-600/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
          <ul className="list-inside list-disc space-y-1">
            <li>{t('tools.healing.warn_slow')}</li>
            <li>{t('tools.healing.warn_trap')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
