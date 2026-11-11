import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { LocationSearch } from "@/components/location-search"

describe("LocationSearch", () => {
  const mockOnLocationSelect = jest.fn()
  const photonResponse = {
    features: [{
      geometry: { coordinates: [25.4569, 44.9253] },
      properties: { name: "Târgoviște", city: "Târgoviște", country: "România" },
    }],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => photonResponse })
  })

  test("renders search input", () => {
    render(<LocationSearch onLocationSelect={mockOnLocationSelect} />)
    expect(screen.getByPlaceholderText("Caută o locație...")).toBeInTheDocument()
  })

  test("shows Photon suggestions when typing", async () => {
    render(<LocationSearch onLocationSelect={mockOnLocationSelect} />)
    fireEvent.change(screen.getByPlaceholderText("Caută o locație..."), { target: { value: "Târgoviște" } })
    expect(await screen.findByText("Târgoviște")).toBeInTheDocument()
    expect(screen.getByText("România")).toBeInTheDocument()
  })

  test("returns normalized location coordinates when a suggestion is selected", async () => {
    render(<LocationSearch onLocationSelect={mockOnLocationSelect} />)
    fireEvent.change(screen.getByPlaceholderText("Caută o locație..."), { target: { value: "Târgoviște" } })
    await waitFor(() => expect(screen.getByText("Târgoviște")).toBeInTheDocument())
    fireEvent.click(screen.getByText("Târgoviște"))
    expect(mockOnLocationSelect).toHaveBeenCalledWith({ name: "Târgoviște", address: "Târgoviște, România", lat: 44.9253, lng: 25.4569 })
  })
})
