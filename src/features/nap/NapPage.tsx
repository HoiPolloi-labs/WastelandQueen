import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function NapPage() {
  return (
    <>
      <PageHeader
        title="NAP"
        subtitle="Non-Aggression Pact terms negotiated per opposing state in Battle Division chat."
      />
      <EmptyState
        title="No NAP terms recorded"
        description="Track agreed terms (e.g. 'no T10+ marches into Hub') per matched state."
      />
    </>
  )
}
