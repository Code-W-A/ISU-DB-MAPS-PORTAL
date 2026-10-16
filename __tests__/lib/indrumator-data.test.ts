import { getIndrumatorCauseSections } from "@/lib/indrumator-data"

describe("React indrumator data", () => {
  it("loads all five sections from the original indrumator HTML", async () => {
    const sections = await getIndrumatorCauseSections()

    expect(sections).toHaveLength(5)
    expect(sections.map((section) => section.sourceArrayName)).toEqual([
      "terms0",
      "terms1",
      "terms2",
      "terms3",
      "terms4",
    ])
    expect(sections.map((section) => section.items.length)).toEqual(sections.map((section) => section.expectedCount))
  })

  it("repairs source text and keeps codes from the original lists", async () => {
    const sections = await getIndrumatorCauseSections()
    const source = sections.find((section) => section.id === "sursa-probabila")

    expect(source?.items[0]).toMatchObject({ label: "Nu este cazul", code: "0", isGroup: false })
    expect(source?.items.at(-1)).toMatchObject({ label: "Nedeterminata", code: "16", isGroup: false })
  })
})
