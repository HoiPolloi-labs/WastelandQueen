import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Rocket } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { computeFastComeback } from './fast-comeback'

const fmt = (n: number) => n.toLocaleString('en-US')

export function FastComebackPage() {
  const { t } = useTranslation()
  const [mightStr, setMightStr] = useState('')
  const mightLost = mightStr ? Number(mightStr.replace(/[.\s,]/g, '')) : 0
  const r = computeFastComeback(mightLost)
  const hasInput = r.mightLost > 0

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('tools.fc.title')} subtitle={t('tools.fc.subtitle')}>
        <Link to="/tools">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('tools.back')}
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-4">
        <Input
          label={t('tools.fc.input_label')}
          type="number"
          inputMode="numeric"
          min={0}
          step={1_000_000}
          placeholder={t('tools.fc.input_placeholder')}
          value={mightStr}
          onChange={(e) => setMightStr(e.target.value)}
          hint={t('tools.fc.input_hint')}
        />

        <div className="rounded-lg border border-yellow-600/40 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Rocket className="h-4 w-4 text-yellow-400" />
            {t('tools.fc.result_label')}
          </div>
          <div className="mt-1 font-mono text-3xl font-semibold text-yellow-300">
            {hasInput ? fmt(r.cap) : '—'}
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            {t('tools.fc.result_explain', { boost: r.boostPct })}
          </p>
        </div>

        <ul className="list-inside list-disc space-y-1 text-xs text-zinc-400">
          <li>{t('tools.fc.note_consume')}</li>
          <li>{t('tools.fc.note_exclude')}</li>
        </ul>
      </div>
    </div>
  )
}
