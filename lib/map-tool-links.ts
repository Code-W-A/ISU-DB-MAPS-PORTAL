export const MAIN_ADMIN_EMAIL = "radu.p1995@yahoo.com"

export const MAP_TOOL_LINK_TAB_LEGACY_INDRUMATOR = "indrumator"
export const MAP_TOOL_LINK_TAB_INDRUMATOR = "indrumatorGuide"
export const MAP_TOOL_LINK_TAB_PROCES_VERBAL = "procesVerbalInterventie"
export const MAP_TOOL_LINK_TAB_ADR = "adr"
export const MAP_TOOL_LINK_TAB_LEGISLATIE = "legislatie"

export type MapToolLinkFlags = {
  showIndrumatorLink: boolean
  showProcesVerbalLink: boolean
  showAdrLink: boolean
  showLegislatieLink: boolean
}

/**
 * Transformă permisiunea veche `indrumator` în cele două permisiuni explicite.
 * Se folosește înaintea primei editări din dashboard, astfel încât accesul să
 * poată fi retras ulterior independent pentru fiecare pagină.
 */
export function expandLegacyIndrumatorTabs(allowedTabs: string[] | undefined): string[] {
  const tabs = allowedTabs ?? []
  if (!tabs.includes(MAP_TOOL_LINK_TAB_LEGACY_INDRUMATOR)) return [...tabs]

  return Array.from(
    new Set([
      ...tabs.filter((tab) => tab !== MAP_TOOL_LINK_TAB_LEGACY_INDRUMATOR),
      MAP_TOOL_LINK_TAB_PROCES_VERBAL,
      MAP_TOOL_LINK_TAB_INDRUMATOR,
    ]),
  )
}

export function hasAllowedTab(allowedTabs: string[] | undefined, tab: string): boolean {
  if (tab === MAP_TOOL_LINK_TAB_INDRUMATOR || tab === MAP_TOOL_LINK_TAB_PROCES_VERBAL) {
    return expandLegacyIndrumatorTabs(allowedTabs).includes(tab)
  }

  return (allowedTabs ?? []).includes(tab)
}

/** Aliniat la coloana "Taburi permise" din dashboard; adminul principal vede toate linkurile. */
export function getMapToolLinkFlags(params: {
  email: string | null
  allowedTabs: string[] | undefined
}): MapToolLinkFlags {
  if (params.email === MAIN_ADMIN_EMAIL) {
    return {
      showIndrumatorLink: true,
      showProcesVerbalLink: true,
      showAdrLink: true,
      showLegislatieLink: true,
    }
  }

  const tabs = expandLegacyIndrumatorTabs(params.allowedTabs)

  return {
    showIndrumatorLink: tabs.includes(MAP_TOOL_LINK_TAB_INDRUMATOR),
    showProcesVerbalLink: tabs.includes(MAP_TOOL_LINK_TAB_PROCES_VERBAL),
    showAdrLink: tabs.includes(MAP_TOOL_LINK_TAB_ADR),
    showLegislatieLink: tabs.includes(MAP_TOOL_LINK_TAB_LEGISLATIE),
  }
}
