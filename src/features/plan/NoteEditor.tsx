import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import type { Signup } from '@/types/wk'

interface NoteEditorProps {
  signup: Signup
  onClose: () => void
}

export function NoteEditor({ signup, onClose }: NoteEditorProps) {
  const [text, setText] = useState(signup.planner_notes ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = async () => {
    setSaving(true)
    const value = text.trim() || null
    await supabase.from('signups').update({ planner_notes: value }).eq('id', signup.id)
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Notes für {signup.ign}</h2>
            <p className="text-xs text-zinc-400">
              Nur für den Planner sichtbar. Beispiele: „nur erste 2h", „spielt Sub-Account", „immer mit Y rallyen".
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          autoFocus
          placeholder="Anmerkung…"
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Speichern'}
          </Button>
        </div>
      </div>
    </div>
  )
}
