import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { IndrumatorCauseWizard } from "@/components/indrumator/indrumator-cause-wizard"
import type { IndrumatorCauseSection } from "@/lib/indrumator-data"

const sections: IndrumatorCauseSection[] = Array.from({ length: 5 }, (_, index) => ({
  id: `section-${index + 1}`,
  title: `Etapa ${index + 1}`,
  description: `Descriere ${index + 1}`,
  sourceArrayName: `terms${index}`,
  expectedCount: 2,
  items: [
    {
      id: `section-${index + 1}-match`,
      label: `Potrivire ${index + 1}`,
      code: `${index + 1}`,
      isGroup: false,
    },
    {
      id: `section-${index + 1}-other`,
      label: `Altă opțiune ${index + 1}`,
      code: `${index + 11}`,
      isGroup: false,
    },
  ],
}))

function advanceToLastStep() {
  for (let step = 1; step < sections.length; step += 1) {
    fireEvent.click(screen.getByRole("button", { name: "Continuă" }))
  }
}

function openSummary() {
  advanceToLastStep()
  fireEvent.click(screen.getByRole("button", { name: "Vezi rezumatul" }))
}

describe("IndrumatorCauseWizard", () => {
  it("navigates with Continuă and Anterior, then opens the final summary", () => {
    render(<IndrumatorCauseWizard sections={sections} />)

    const previous = screen.getByRole("button", { name: "Anterior" })
    expect(previous).toBeDisabled()
    expect(screen.getByText("Etapa 1")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Continuă" }))
    expect(screen.getByText("Etapa 2")).toBeInTheDocument()
    expect(previous).toBeEnabled()

    fireEvent.click(previous)
    expect(screen.getByText("Etapa 1")).toBeInTheDocument()

    openSummary()
    expect(screen.getByText("Rezumat final")).toBeInTheDocument()
    expect(screen.getAllByText("Neselectat")).toHaveLength(5)
  })

  it("filters the current list using the search field", async () => {
    render(<IndrumatorCauseWizard sections={sections} />)

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "potrivire" } })

    await waitFor(() => {
      expect(screen.getByText("Potrivire 1")).toBeInTheDocument()
      expect(screen.queryByText("Altă opțiune 1")).not.toBeInTheDocument()
    })
  })

  it("keeps selections when returning from the summary", () => {
    render(<IndrumatorCauseWizard sections={sections} />)

    fireEvent.click(screen.getByText("Potrivire 1"))
    openSummary()
    expect(screen.getByText("Potrivire 1 (1)")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Înapoi" }))
    expect(screen.getByText("Etapa 5")).toBeInTheDocument()
    expect(screen.getByText("1/5")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Vezi rezumatul" }))
    expect(screen.getByText("Potrivire 1 (1)")).toBeInTheDocument()
  })

  it("copies the complete final summary", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    render(<IndrumatorCauseWizard sections={sections} />)

    fireEvent.click(screen.getByText("Potrivire 1"))
    for (let step = 1; step < sections.length; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Continuă" }))
      fireEvent.click(screen.getByText(`Potrivire ${step + 1}`))
    }
    fireEvent.click(screen.getByRole("button", { name: "Vezi rezumatul" }))
    fireEvent.click(screen.getByRole("button", { name: "Copiază" }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toContain("Etapa 1: Potrivire 1 (1)")
    expect(writeText.mock.calls[0][0]).toContain("Etapa 5: Potrivire 5 (5)")
    expect(await screen.findByText("Rezumat copiat.")).toBeInTheDocument()
  })

  it("cancels or confirms restarting from the beginning", async () => {
    render(<IndrumatorCauseWizard sections={sections} />)

    fireEvent.click(screen.getByText("Potrivire 1"))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "potrivire" } })
    openSummary()

    fireEvent.click(screen.getByRole("button", { name: "Reia de la început" }))
    const firstDialog = await screen.findByRole("alertdialog")
    fireEvent.click(within(firstDialog).getByRole("button", { name: "Renunță" }))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(screen.getByText("Potrivire 1 (1)")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Reia de la început" }))
    const secondDialog = await screen.findByRole("alertdialog")
    fireEvent.click(within(secondDialog).getByRole("button", { name: "Reia de la început" }))

    await waitFor(() => expect(screen.getByText("Etapa 1")).toBeInTheDocument())
    expect(screen.getByText("0/5")).toBeInTheDocument()
    expect(screen.getByRole("textbox")).toHaveValue("")
  })
})
