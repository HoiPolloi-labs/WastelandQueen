import { cn } from '@/lib/cn'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
}

const variants: Record<Variant, string> = {
  primary: 'bg-yellow-500 text-zinc-950 hover:bg-yellow-400 active:bg-yellow-600',
  secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700',
  ghost: 'bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
  danger: 'bg-red-600 text-zinc-50 hover:bg-red-500',
}

const sizes = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2.5 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
    />
  )
}
