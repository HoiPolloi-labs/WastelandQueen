import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { PERSONAL_REWARD_TARGET } from '@/types/wk'

export function ScoringPage() {
  return (
    <>
      <PageHeader
        title="Scoring"
        subtitle={`Track kill / death / occupation points per player toward the ${PERSONAL_REWARD_TARGET.toLocaleString()}-point reward bar.`}
      />
      <EmptyState
        title="No score entries"
        description="Occupation caps at 2,000 points (120 min). Mud deaths don't count — only Hub/turret."
      />
    </>
  )
}
