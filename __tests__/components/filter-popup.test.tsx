import { render, screen, fireEvent } from "@testing-library/react"
import { FilterPopup } from "@/components/filter-popup"

describe("FilterPopup", () => {
  const defaultProps = {
    showHydrants: true,
    showPrimarii: true,
    showSubunitati: true,
    showSeveso: true,
    showSevesoCircles: true,
    toggleHydrants: jest.fn(),
    togglePrimarii: jest.fn(),
    toggleSubunitati: jest.fn(),
    toggleSeveso: jest.fn(),
    toggleSevesoCircles: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("renders filter button", () => {
    render(<FilterPopup {...defaultProps} />)
    expect(screen.getByTitle("Filtrează markeri")).toBeInTheDocument()
  })

  test("opens popup when button is clicked", () => {
    render(<FilterPopup {...defaultProps} />)

    const button = screen.getByTitle("Filtrează markeri")
    fireEvent.click(button)

    expect(screen.getByText("Filtrează markeri")).toBeInTheDocument()
    expect(screen.getByText("Hidranți")).toBeInTheDocument()
    expect(screen.getByText("Primării")).toBeInTheDocument()
    expect(screen.getByText("Subunități ISU")).toBeInTheDocument()
    expect(screen.getByText("Obiective SEVESO")).toBeInTheDocument()
  })

  test("calls toggle functions when checkboxes are clicked", () => {
    render(<FilterPopup {...defaultProps} />)

    const button = screen.getByTitle("Filtrează markeri")
    fireEvent.click(button)

    const hydrantsCheckbox = screen.getByLabelText("Hidranți")
    fireEvent.click(hydrantsCheckbox)
    expect(defaultProps.toggleHydrants).toHaveBeenCalledTimes(1)

    const primariiCheckbox = screen.getByLabelText("Primării")
    fireEvent.click(primariiCheckbox)
    expect(defaultProps.togglePrimarii).toHaveBeenCalledTimes(1)

    const subunitatiCheckbox = screen.getByLabelText("Subunități ISU")
    fireEvent.click(subunitatiCheckbox)
    expect(defaultProps.toggleSubunitati).toHaveBeenCalledTimes(1)

    const sevesoCheckbox = screen.getByLabelText("Obiective SEVESO")
    fireEvent.click(sevesoCheckbox)
    expect(defaultProps.toggleSeveso).toHaveBeenCalledTimes(1)
  })

  test("shows SEVESO circles option when SEVESO is enabled", () => {
    render(<FilterPopup {...defaultProps} showSeveso={true} />)

    const button = screen.getByTitle("Filtrează markeri")
    fireEvent.click(button)

    expect(screen.getByText("Zone de impact SEVESO")).toBeInTheDocument()

    const sevesoCirclesCheckbox = screen.getByLabelText("Zone de impact SEVESO")
    fireEvent.click(sevesoCirclesCheckbox)
    expect(defaultProps.toggleSevesoCircles).toHaveBeenCalledTimes(1)
  })

  test("closes popup when close button is clicked", () => {
    render(<FilterPopup {...defaultProps} />)

    const openButton = screen.getByTitle("Filtrează markeri")
    fireEvent.click(openButton)

    const closeButton = screen.getByRole("button", { name: "" })
    fireEvent.click(closeButton)

    expect(screen.queryByText("Filtrează markeri")).not.toBeInTheDocument()
  })
})
