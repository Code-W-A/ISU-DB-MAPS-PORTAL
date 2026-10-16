import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { LocationSearch } from "@/components/location-search"

// Mock Google Maps API
const mockGoogleMaps = {
  maps: {
    places: {
      AutocompleteService: jest.fn().mockImplementation(() => ({
        getPlacePredictions: jest.fn((request, callback) => {
          callback(
            [
              {
                place_id: "place123",
                description: "Târgoviște, România",
                structured_formatting: {
                  main_text: "Târgoviște",
                  secondary_text: "România",
                },
              },
            ],
            "OK",
          )
        }),
      })),
      PlacesService: jest.fn().mockImplementation(() => ({
        getDetails: jest.fn((request, callback) => {
          callback(
            {
              place_id: "place123",
              name: "Târgoviște",
              formatted_address: "Târgoviște, România",
              geometry: {
                location: {
                  lat: () => 44.9253,
                  lng: () => 25.4569,
                },
              },
            },
            "OK",
          )
        }),
      })),
    },
  },
}

// Mock window.google
Object.defineProperty(window, "google", {
  value: mockGoogleMaps,
  writable: true,
})

describe("LocationSearch", () => {
  const mockOnLocationSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("renders search input", () => {
    render(<LocationSearch onLocationSelect={mockOnLocationSelect} />)
    expect(screen.getByPlaceholderText("Caută o locație...")).toBeInTheDocument()
  })

  test("shows predictions when typing", async () => {
    render(<LocationSearch onLocationSelect={mockOnLocationSelect} />)

    const input = screen.getByPlaceholderText("Caută o locație...")
    fireEvent.change(input, { target: { value: "Târgoviște" } })

    await waitFor(() => {
      expect(screen.getByText("Târgoviște")).toBeInTheDocument()
      expect(screen.getByText("România")).toBeInTheDocument()
    })
  })

  test("calls onLocationSelect when prediction is clicked", async () => {
    render(<LocationSearch onLocationSelect={mockOnLocationSelect} />)

    const input = screen.getByPlaceholderText("Caută o locație...")
    fireEvent.change(input, { target: { value: "Târgoviște" } })

    await waitFor(() => {
      const prediction = screen.getByText("Târgoviște")
      fireEvent.click(prediction)
    })

    expect(mockOnLocationSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        place_id: "place123",
        name: "Târgoviște",
        formatted_address: "Târgoviște, România",
        geometry: expect.anything(),
      }),
    )
  })
})
