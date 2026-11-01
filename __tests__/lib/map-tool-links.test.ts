import {
  MAIN_ADMIN_EMAIL,
  MAP_TOOL_LINK_TAB_ADR,
  MAP_TOOL_LINK_TAB_INDRUMATOR,
  MAP_TOOL_LINK_TAB_ISU_NOTES,
  MAP_TOOL_LINK_TAB_PROCES_VERBAL,
  expandLegacyIndrumatorTabs,
  getMapToolLinkFlags,
  hasAllowedTab,
} from "@/lib/map-tool-links"

describe("map tool permissions", () => {
  it("grants both separated pages to users with the legacy indrumator permission", () => {
    const flags = getMapToolLinkFlags({
      email: "user@example.com",
      allowedTabs: ["indrumator"],
    })

    expect(flags.showIndrumatorLink).toBe(true)
    expect(flags.showProcesVerbalLink).toBe(true)
  })

  it("keeps the two new permissions independent", () => {
    const indrumatorOnly = getMapToolLinkFlags({
      email: "user@example.com",
      allowedTabs: [MAP_TOOL_LINK_TAB_INDRUMATOR],
    })
    const processOnly = getMapToolLinkFlags({
      email: "user@example.com",
      allowedTabs: [MAP_TOOL_LINK_TAB_PROCES_VERBAL],
    })

    expect(indrumatorOnly.showIndrumatorLink).toBe(true)
    expect(indrumatorOnly.showProcesVerbalLink).toBe(false)
    expect(processOnly.showIndrumatorLink).toBe(false)
    expect(processOnly.showProcesVerbalLink).toBe(true)
  })

  it("expands the legacy permission before the first dashboard edit", () => {
    const expanded = expandLegacyIndrumatorTabs(["users", "indrumator", "adr"])

    expect(expanded).toEqual([
      "users",
      "adr",
      MAP_TOOL_LINK_TAB_PROCES_VERBAL,
      MAP_TOOL_LINK_TAB_INDRUMATOR,
    ])
    expect(expanded).not.toContain("indrumator")
    expect(hasAllowedTab(["indrumator"], MAP_TOOL_LINK_TAB_INDRUMATOR)).toBe(true)
    expect(hasAllowedTab(["indrumator"], MAP_TOOL_LINK_TAB_PROCES_VERBAL)).toBe(true)
  })

  it("shows every tool link to the main administrator", () => {
    const flags = getMapToolLinkFlags({ email: MAIN_ADMIN_EMAIL, allowedTabs: [] })

    expect(flags).toEqual({
      showIndrumatorLink: true,
      showProcesVerbalLink: true,
      showAdrLink: true,
      showLegislatieLink: true,
      showCatdLink: true,
      showIsuNotesLink: true,
    })
  })

  it("shows ISU Notes only to users with the isuNotes permission", () => {
    expect(
      getMapToolLinkFlags({ email: "user@example.com", allowedTabs: [MAP_TOOL_LINK_TAB_ISU_NOTES] })
        .showIsuNotesLink,
    ).toBe(true)
    expect(
      getMapToolLinkFlags({ email: "user@example.com", allowedTabs: [MAP_TOOL_LINK_TAB_ADR] })
        .showIsuNotesLink,
    ).toBe(false)
  })
})

 test("CATD is independent and denied by default", () => {
  expect(getMapToolLinkFlags({ email: "reader@test.ro", allowedTabs: ["catd"] }).showCatdLink).toBe(true)
  expect(getMapToolLinkFlags({ email: "reader@test.ro", allowedTabs: ["hydrants"] }).showCatdLink).toBe(false)
  expect(getMapToolLinkFlags({ email: "reader@test.ro", allowedTabs: undefined }).showCatdLink).toBe(false)
})
