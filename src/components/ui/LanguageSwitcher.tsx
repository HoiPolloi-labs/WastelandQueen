import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { SUPPORTED_LOCALES, type LocaleCode } from '@/i18n'

/**
 * Compact dropdown in the header for picking a UI language. Click on the
 * globe icon to open; preference is stored in localStorage and applied
 * across all pages via i18next.
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onClick)
      return () => document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const current = i18n.resolvedLanguage as LocaleCode

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
        title={i18n.t('common.language')}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="uppercase">{current}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 max-h-96 w-40 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl">
          <ul className="py-1">
            {SUPPORTED_LOCALES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => {
                    void i18n.changeLanguage(l.code)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-1.5 text-xs transition',
                    current === l.code
                      ? 'bg-yellow-500/10 text-yellow-200'
                      : 'text-zinc-300 hover:bg-zinc-800',
                  )}
                >
                  <span>{l.label}</span>
                  {current === l.code && <Check className="h-3 w-3" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
