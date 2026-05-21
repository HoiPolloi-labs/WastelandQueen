import { Navigate, useParams, Link } from 'react-router'
import { LinkIcon, ShieldX } from 'lucide-react'

type Kind = 'plan' | 'signup' | 'board' | 'awards'

const ROLE_FOR_KIND: Record<Kind, 'planner' | 'signup' | 'board'> = {
  plan: 'planner',
  signup: 'signup',
  board: 'board',
  awards: 'planner',
}

const KIND_LABEL: Record<Kind, string> = {
  plan: 'Planner',
  signup: 'Sign-up',
  board: 'Board',
  awards: 'Awards',
}

/**
 * Old `/plan/:eventId` etc. URLs. If we have the token in localStorage from a
 * past visit, redirect transparently. Otherwise show a "this URL needs a
 * token" hint so the visitor knows to ask the planner for the current link.
 */
export function LegacyTokenlessURL({ kind }: { kind: Kind }) {
  const { eventId } = useParams<{ eventId: string }>()
  const role = ROLE_FOR_KIND[kind]
  const stored = eventId ? localStorage.getItem(`tok:${role}:${eventId}`) : null

  if (eventId && stored) {
    return <Navigate to={`/${kind}/${eventId}/${stored}`} replace />
  }

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <ShieldX className="mx-auto mb-3 h-10 w-10 text-yellow-400" />
      <h2 className="mb-2 text-lg font-semibold text-zinc-100">
        {KIND_LABEL[kind]}-URL veraltet
      </h2>
      <p className="mb-4 text-sm text-zinc-400">
        Seit dem Token-Refactor brauchen{' '}
        <span className="font-mono text-zinc-300">/{kind}/{eventId}</span> URLs
        einen zusätzlichen Token-Suffix.
      </p>
      <p className="mb-2 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
        <LinkIcon className="h-3 w-3" />
        Frage den Organisator nach dem aktuellen {KIND_LABEL[kind]}-Link.
      </p>
      <p className="mt-4 text-xs text-zinc-500">
        <Link to="/" className="text-yellow-400 hover:underline">
          Zur Startseite
        </Link>
      </p>
    </div>
  )
}
