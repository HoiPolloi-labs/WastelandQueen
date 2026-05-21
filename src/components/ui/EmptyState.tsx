interface EmptyStateProps {
  title: string
  description?: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center">
      <p className="text-zinc-300">{title}</p>
      {description && <p className="mt-2 text-sm text-zinc-400">{description}</p>}
    </div>
  )
}
