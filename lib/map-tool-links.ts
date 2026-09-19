export const MAIN_ADMIN_EMAIL = "radu.p1995@yahoo.com"

export const MAP_TOOL_LINK_TAB_INDRUMATOR = "indrumator"
export const MAP_TOOL_LINK_TAB_ADR = "adr"
export const MAP_TOOL_LINK_TAB_ISU_NOTES = "isuNotes"

export type MapToolLinkFlags = {
  showIndrumatorLink: boolean
  showAdrLink: boolean
  showIsuNotesLink: boolean
}

/** Aliniat la coloana „Taburi permise” din dashboard; main admin vede toate linkurile pe hartă. */
export function getMapToolLinkFlags(params: {
  email: string | null
  allowedTabs: string[] | undefined
}): MapToolLinkFlags {
  if (params.email === MAIN_ADMIN_EMAIL) {
    return { showIndrumatorLink: true, showAdrLink: true, showIsuNotesLink: true }
  }
  const tabs = params.allowedTabs ?? []
  return {
    showIndrumatorLink: tabs.includes(MAP_TOOL_LINK_TAB_INDRUMATOR),
    showAdrLink: tabs.includes(MAP_TOOL_LINK_TAB_ADR),
    showIsuNotesLink: tabs.includes(MAP_TOOL_LINK_TAB_ISU_NOTES),
  }
}
