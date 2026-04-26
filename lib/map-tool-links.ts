const MAIN_ADMIN_EMAIL = "radu.p1995@yahoo.com"

export const MAP_TOOL_LINK_TAB_INDRUMATOR = "indrumator"
export const MAP_TOOL_LINK_TAB_ADR = "adr"

/** Aliniat la coloana „Taburi permise” din dashboard; main admin vede ambele linkuri pe hartă. */
export function getMapToolLinkFlags(params: {
  email: string | null
  allowedTabs: string[] | undefined
}): { showIndrumatorLink: boolean; showAdrLink: boolean } {
  if (params.email === MAIN_ADMIN_EMAIL) {
    return { showIndrumatorLink: true, showAdrLink: true }
  }
  const tabs = params.allowedTabs ?? []
  return {
    showIndrumatorLink: tabs.includes(MAP_TOOL_LINK_TAB_INDRUMATOR),
    showAdrLink: tabs.includes(MAP_TOOL_LINK_TAB_ADR),
  }
}
