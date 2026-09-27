import { MOTIF_PALETTES } from './A2AConnectionEffects'
import { resolveShuGeneralBanner, SHU_GENERAL_BANNERS, type ShuGeneral } from './shu-general-motifs'

export const SHU_GENERAL_PANE_AURA_CLASS = 'terminal-pane-general-aura'
export const SHU_GENERAL_PANE_AURA_WORKING_CLASS = 'terminal-pane-general-aura-working'

export type ShuGeneralPaneAura = {
  general: ShuGeneral
  style: Record<'--general-aura' | '--general-aura-core', string>
}

const AURA_CACHE = new Map<ShuGeneral, ShuGeneralPaneAura>()

function getGeneralAura(general: ShuGeneral): ShuGeneralPaneAura {
  const cached = AURA_CACHE.get(general)
  if (cached) {
    return cached
  }
  const banner = SHU_GENERAL_BANNERS.find((b) => b.general === general)
  const palette = banner ? MOTIF_PALETTES[banner.motif] : MOTIF_PALETTES.foliage
  const aura: ShuGeneralPaneAura = {
    general,
    style: {
      '--general-aura': palette.flowColor,
      '--general-aura-core': palette.coreColor
    }
  }
  AURA_CACHE.set(general, aura)
  return aura
}

export function resolveShuGeneralPaneAura(
  ...tabTitles: (string | null | undefined)[]
): ShuGeneralPaneAura | null {
  for (const tabTitle of tabTitles) {
    const banner = tabTitle ? resolveShuGeneralBanner({ sourceTitle: tabTitle }) : null
    if (!banner) {
      continue
    }
    return getGeneralAura(banner.general)
  }
  return null
}
