import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function ShiftsPage() {
  return (
    <>
      <PageHeader
        title="Shifts"
        subtitle="Hub, 4 turrets (N/S/E/W), mudsitters, hit-squad. Captain per building drives Super Reinforcement."
      />
      <EmptyState
        title="No shifts scheduled"
        description="Plan 2–4h shifts across the 24h event window. Sort defenders by troop type per turret."
      />
    </>
  )
}
