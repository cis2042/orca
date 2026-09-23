import { MOTIF_PALETTES } from './A2AConnectionEffects'
import { resolveShuGeneralBanner, type ShuGeneral } from './shu-general-motifs'

export const SHU_GENERAL_PANE_AURA_CLASS = 'terminal-pane-general-aura'

export type ShuGeneralPaneAura = {
  general: ShuGeneral
  style: Record<'--general-aura' | '--general-aura-core', string>
}

export function resolveShuGeneralPaneAura(
  tabTitle: string | null | undefined
): ShuGeneralPaneAura | null {
  const banner = resolveShuGeneralBanner({ sourceTitle: tabTitle })
  if (!banner) {
    return null
  }
  const palette = MOTIF_PALETTES[banner.motif]
  return {
    general: banner.general,
    style: {
      '--general-aura': palette.flowColor,
      '--general-aura-core': palette.coreColor
    }
  }
}
