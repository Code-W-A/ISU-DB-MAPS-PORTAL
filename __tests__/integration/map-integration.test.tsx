"use client"

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { Map } from "@/components/map"

// Mock the Google Maps API
jest.mock("@react-google-maps/api", () => {
  const originalModule = jest.requireActual("@react-google-maps/api")

  return {
    ...originalModule,
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
    InfoWindow: ({ children, onCloseClick }) => (
      <div data-testid="info-window">
        {children}
        <button onClick={onCloseClick}>Close</button>
      </div>
    ),
    MarkerClusterer: ({ children }) => children({ addMarker: jest.fn(), removeMarker: jest.fn() }),
    Marker: ({ onClick, position }) => (
      <div data-testid="marker" data-lat={position?.lat} data-lng={position?.lng} onClick={onClick}></div>
    ),
    Polygon: () => <div data-testid="polygon"></div>,
    Circle: () => <div data-testid="circle"></div>,
  }
})

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn().mockImplementation((success) => {
    success({
      coords: {
        latitude: 44.9253,
        longitude: 25.4569,
      },
    })
  }),
}
Object.defineProperty(global.navigator, "geolocation", {
  value: mockGeolocation,
  writable: true,
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
        {
          Județ: "Dâmbovița",
          Localitate: "Moreni",
          Stradă: "Strada Secundară",
          NumărAdministrativ: 2,
          Reper: "Lângă școală",
          TipHidrant: {
            Subteran: "Da",
          },
          "Stare hidrant": {
            Nefuncțional: "Da",
          },
          Localizare: {
            Latitudine: "45.0000",
            Longitudine: "25.5000",
          },
        },
      ]),
  }),
) as jest.Mock

describe("Map Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("should load and display hydrants", async () => {
    render(<Map hasAccess={true} />)

    await waitFor(() => {
      const markers = screen.getAllByTestId("marker")
      expect(markers.length).toBeGreaterThan(0)
    })
  })

  test("should show hydrant info when marker is clicked", async () => {
    render(<Map hasAccess={true} />)

    await waitFor(() => {
      const markers = screen.getAllByTestId("marker")
      fireEvent.click(markers[0])
    })

    expect(screen.getByTestId("info-window")).toBeInTheDocument()
    expect(screen.getByText("Hidrant 1")).toBeInTheDocument()
    expect(screen.getByText("Dâmbovița, Târgoviște")).toBeInTheDocument()
  })

  test("should close info window when close button is clicked", async () => {
    render(<Map hasAccess={true} />)

    await waitFor(() => {
      const markers = screen.getAllByTestId("marker")
      fireEvent.click(markers[0])
    })

    expect(screen.getByTestId("info-window")).toBeInTheDocument()

    const closeButton = screen.getByText("Close")
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByTestId("info-window")).not.toBeInTheDocument()
    })
  })

  test("should get user location when location button is clicked", async () => {
    render(<Map hasAccess={true} />)

    await waitFor(() => {
      const locationButton = screen.getByTitle("Locație")
      fireEvent.click(locationButton)
    })

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()
  })

  test("should toggle map type when map type button is clicked", async () => {
    render(<Map hasAccess={true} />)

    let mapTypeButton
    await waitFor(() => {
      mapTypeButton = screen.getByTitle("Hartă")
      expect(mapTypeButton).toBeInTheDocument()
    })

    fireEvent.click(mapTypeButton)

    await waitFor(() => {
      expect(screen.getByTitle("Satelit")).toBeInTheDocument()
    })
  })

  test("should toggle filters when filter button is clicked", async () => {
    render(<Map hasAccess={true} />)

    await waitFor(() => {
      const filterButton = screen.getByTitle("Filtrează markeri")
      fireEvent.click(filterButton)
    })

    expect(screen.getByText("Hidranți")).toBeInTheDocument()
    expect(screen.getByText("Primării")).toBeInTheDocument()
    expect(screen.getByText("Subunități ISU")).toBeInTheDocument()
    expect(screen.getByText("Obiective SEVESO")).toBeInTheDocument()
  })
})
