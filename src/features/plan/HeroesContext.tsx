/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'

/**
 * Carries the `event.heroes_enabled` flag down to deep descendants
 * (PlayerChip's tooltip in particular) without prop-drilling through
 * Plaza → Building → PlayerChip / UnassignedPool → PlayerChip /
 * OtherShiftDropzone → PlayerChip.
 *
 * Defaults to false so any out-of-provider use silently hides hero info.
 */
const HeroesEnabledContext = createContext(false)

export const HeroesEnabledProvider = HeroesEnabledContext.Provider

export function useHeroesEnabled(): boolean {
  return useContext(HeroesEnabledContext)
}
