interface PageHeaderProps {
  title: string
  subtitle?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-zinc-400">{subtitle}</div>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  )
}
