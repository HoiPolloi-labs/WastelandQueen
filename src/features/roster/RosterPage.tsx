import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function RosterPage() {
  return (
    <>
      <PageHeader
        title="Roster"
        subtitle="Player profiles — rally size, troop type, hero stacks (Agent X, Dr. J, Nataly)."
      />
      <EmptyState
        title="No players yet"
        description="Add players with their rally size and main troop type to feed shift planning."
      />
    </>
  )
}
