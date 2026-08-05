import { fireEvent, render, screen } from "@testing-library/react"
import { FilterPopup } from "@/components/filter-popup"
import { DEFAULT_HYDRANT_ATTRIBUTE_FILTERS } from "@/lib/hydrant-attribute-filters"

describe("FilterPopup", () => {
  const defaultProps = {
    showHydrants: true,
    showPrimarii: true,
    showSubunitati: true,
    showSeveso: true,
    showSevesoCircles: true,
    hydrantAttrFilters: DEFAULT_HYDRANT_ATTRIBUTE_FILTERS,
    onHydrantAttrFiltersChange: jest.fn(),
    toggleHydrants: jest.fn(),
    togglePrimarii: jest.fn(),
    toggleSubunitati: jest.fn(),
    toggleSeveso: jest.fn(),
    toggleSevesoCircles: jest.fn(),
  }

  beforeEach(() => jest.clearAllMocks())

  test("opens the desktop filter modal", () => {
    render(<FilterPopup {...defaultProps} />)

    fireEvent.click(screen.getByTitle("Filtrează markeri"))

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Hidranți")).toBeInTheDocument()
    expect(screen.getByText("Primării")).toBeInTheDocument()
    expect(screen.getByText("Subunități ISU")).toBeInTheDocument()
    expect(screen.getByText("Obiective SEVESO")).toBeInTheDocument()
  })

  test("keeps the same marker-layer controls as mobile", () => {
    render(<FilterPopup {...defaultProps} />)
    fireEvent.click(screen.getByTitle("Filtrează markeri"))

    fireEvent.click(screen.getByLabelText("Hidranți"))
    fireEvent.click(screen.getByLabelText("Primării"))
    fireEvent.click(screen.getByLabelText("Subunități ISU"))
    fireEvent.click(screen.getByLabelText("Obiective SEVESO"))
    fireEvent.click(screen.getByLabelText("Zone de impact (cercuri)"))

    expect(defaultProps.toggleHydrants).toHaveBeenCalledTimes(1)
    expect(defaultProps.togglePrimarii).toHaveBeenCalledTimes(1)
    expect(defaultProps.toggleSubunitati).toHaveBeenCalledTimes(1)
    expect(defaultProps.toggleSeveso).toHaveBeenCalledTimes(1)
    expect(defaultProps.toggleSevesoCircles).toHaveBeenCalledTimes(1)
  })

  test("closes the modal", () => {
    render(<FilterPopup {...defaultProps} />)
    fireEvent.click(screen.getByTitle("Filtrează markeri"))
    fireEvent.click(screen.getByRole("button", { name: "Închide" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
