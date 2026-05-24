import { cn } from '@/lib/cn'
import type { InputHTMLAttributes, Ref, TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  /** React 19 ref-as-prop. Callers that need direct DOM access (focus
   *  detection, scrollIntoView, etc.) pass a ref through. */
  ref?: Ref<HTMLInputElement>
}

export function Input({ label, hint, error, className, id, ref, ...rest }: InputProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-zinc-300">{label}</span>
      )}
      <input
        id={id}
        ref={ref}
        {...rest}
        className={cn(
          // A11y: placeholder bumped zinc-600 → zinc-500 (2.58:1 → 4.95:1
          // contrast against zinc-900, clears WCAG AA for normal text).
          'w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500',
          error && 'border-red-500',
          className,
        )}
      />
      {hint && !error && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </label>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export function Textarea({ label, hint, className, ...rest }: TextareaProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-zinc-300">{label}</span>
      )}
      <textarea
        {...rest}
        className={cn(
          'w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500',
          className,
        )}
      />
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </label>
  )
}
