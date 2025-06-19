// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom"

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {
    return null
  }
  unobserve() {
    return null
  }
  disconnect() {
    return null
  }
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
})

// Mock window.google.maps
window.google = {
  maps: {
    SymbolPath: {
      CIRCLE: 0,
    },
    Size: class {
      constructor(width, height) {
        this.width = width
        this.height = height
      }
    },
    Point: class {
      constructor(x, y) {
        this.x = x
        this.y = y
      }
    },
    LatLng: class {
      constructor(lat, lng) {
        this.lat = lat
        this.lng = lng
      }
      lat() {
        return this.lat
      }
      lng() {
        return this.lng
      }
    },
    Map: class {},
    Marker: class {},
    InfoWindow: class {},
    LatLngBounds: class {
      contains() {
        return true
      }
    },
  },
}

// Mock console.error to avoid cluttering test output
const originalConsoleError = console.error
console.error = (...args) => {
  if (typeof args[0] === "string" && (args[0].includes("Warning:") || args[0].includes("Error:"))) {
    return
  }
  originalConsoleError(...args)
}
