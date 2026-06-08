"use client"

import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { Map } from "@/components/map"
import { MapLocationSearchProvider } from "@/components/map-location-search-bridge"

function renderWithSearchBridge(ui: React.ReactElement) {
  return render(<MapLocationSearchProvider>{ui}</MapLocationSearchProvider>)
}

// Mock the Google Maps API
jest.mock("@react-google-maps/api", () => ({
  GoogleMap: ({ children, onLoad }) => {
    // Call onLoad with a mock map instance
    React.useEffect(() => {
      if (onLoad) {
        onLoad({
          getBounds: () => ({
            contains: () => true,
          }),
          getZoom: () => 14,
          panTo: jest.fn(),
          setZoom: jest.fn(),
        })
      }
    }, [onLoad])

    return <div data-testid="google-map">{children}</div>
  },
  useJsApiLoader: () => ({
    isLoaded: true,
    loadError: null,
  }),
  InfoWindow: ({ children }) => <div data-testid="info-window">{children}</div>,
  MarkerClusterer: ({ children }) => children({ addMarker: jest.fn(), removeMarker: jest.fn() }),
  Marker: ({ onClick }) => <div data-testid="marker" onClick={onClick}></div>,
  Polygon: () => <div data-testid="polygon"></div>,
  Circle: () => <div data-testid="circle"></div>,
}))

// Mock the hooks
jest.mock("@/hooks/use-mobile", () => ({
  useMobile: () => ({
    isMobile: false,
    orientation: "portrait",
    isLowEndDevice: false,
  }),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString()
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
})

// Mock fetch for hydrants data
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve([
        {
          Județ: "Dâmbovița",
          Localitate: "Târgoviște",
          Stradă: "Strada Principală",
          NumărAdministrativ: 1,
          Reper: "Lângă primărie",
          TipHidrant: {
            Suprateran: "Da",
          },
          "Stare hidrant": {
            Funcțional: "Da",
          },
          Localizare: {
            Latitudine: "44.9253",
            Longitudine: "25.4569",
          },
        },
      ]),
  }),
) as jest.Mock

describe("Map Component", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("renders loading skeleton initially", () => {
    // Override isLoaded to false for this test
    const mockUseJsApiLoader = {
      isLoaded: false,
      loadError: null,
    }

    jest.mock("@react-google-maps/api", () => ({
      ...jest.requireActual("@react-google-maps/api"),
      useJsApiLoader: () => mockUseJsApiLoader,
    }))

    renderWithSearchBridge(<Map />)
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  test("renders Google Map when loaded", async () => {
    renderWithSearchBridge(<Map />)

    await waitFor(() => {
      expect(screen.getByTestId("google-map")).toBeInTheDocument()
    })
  })

  test("fetches hydrants data on mount", async () => {
    renderWithSearchBridge(<Map />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://raw.githubusercontent.com/RaduPopescu95/isudb_maps_data/refs/heads/main/hidranti.json",
      )
    })
  })

  test("uses cached hydrants data if available", async () => {
    // Setup mock cached data
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "hydrantsData") {
        return JSON.stringify([{ id: "cached-hydrant" }])
      }
      if (key === "hydrantsTimestamp") {
        return Date.now().toString()
      }
      return null
    })

    renderWithSearchBridge(<Map />)

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  test("renders map controls", async () => {
    renderWithSearchBridge(<Map />)

    await waitFor(() => {
      // Check for map controls
      const buttons = screen.getAllByRole("button")
      expect(buttons.length).toBeGreaterThan(0)
    })
  })
})
