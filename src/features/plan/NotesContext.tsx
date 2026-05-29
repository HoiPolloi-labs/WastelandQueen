import { createContext, useContext } from 'react'

interface NotesContextValue {
  openNote: (signupId: string) => void
}

const NotesContext = createContext<NotesContextValue | null>(null)

export const NotesProvider = NotesContext.Provider

export function useOpenNote(): NotesContextValue['openNote'] {
  const ctx = useContext(NotesContext)
  if (!ctx) return () => {}
  return ctx.openNote
}
