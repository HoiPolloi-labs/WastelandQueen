import { Navigate, useParams, Link } from 'react-router'
import { useTranslation, Trans } from 'react-i18next'
import { LinkIcon, ShieldX } from 'lucide-react'

type Kind = 'plan' | 'signup' | 'board' | 'awards'

const ROLE_FOR_KIND: Record<Kind, 'planner' | 'signup' | 'board'> = {
  plan: 'planner',
  signup: 'signup',
  board: 'board',
  awards: 'planner',
}

/**
 * Old `/plan/:eventId` etc. URLs. If we have the token in localStorage from a
 * past visit, redirect transparently. Otherwise show a "this URL needs a
 * token" hint so the visitor knows to ask the planner for the current link.
 */
export function LegacyTokenlessURL({ kind }: { kind: Kind }) {
  const { t } = useTranslation()
  const { eventId } = useParams<{ eventId: string }>()
  const role = ROLE_FOR_KIND[kind]
  const stored = eventId ? localStorage.getItem(`tok:${role}:${eventId}`) : null

  if (eventId && stored) {
    return <Navigate to={`/${kind}/${eventId}/${stored}`} replace />
  }

  const kindLabel = t(`legacy_url.kind_${kind}`)
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <ShieldX className="mx-auto mb-3 h-10 w-10 text-yellow-400" />
      <h2 className="mb-2 text-lg font-semibold text-zinc-100">
        {t('legacy_url.title', { kind: kindLabel })}
      </h2>
      {/* SECURITY: was previously `dangerouslySetInnerHTML` + i18n with
          `escapeValue:false`, which let a crafted `eventId` URL param land
          arbitrary HTML/script in the app origin. `<Trans>` interpolates
          values as React text children (auto-escaped) while still letting
          the translation embed a `<code>` tag for styling. */}
      <p className="mb-4 text-sm text-zinc-400">
        <Trans
          i18nKey="legacy_url.body"
          values={{ kind, eventId }}
          components={{ code: <code className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-[11px] text-yellow-300" /> }}
        />
      </p>
      <p className="mb-2 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
        <LinkIcon className="h-3 w-3" />
        {t('legacy_url.ask_planner', { kind: kindLabel })}
      </p>
      <p className="mt-4 text-xs text-zinc-500">
        <Link to="/" className="text-yellow-400 hover:underline">
          {t('common.back_to_home')}
        </Link>
      </p>
    </div>
  )
}
