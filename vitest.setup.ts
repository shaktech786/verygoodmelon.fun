import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock scrollTo
global.scrollTo = vi.fn()

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  setTimeout(callback, 0)
  return 0
})

global.cancelAnimationFrame = vi.fn((id: number) => {
  clearTimeout(id)
})

// Mock performance.now
if (!global.performance) {
  global.performance = {} as Performance
}
global.performance.now = vi.fn(() => Date.now())

// Mock performance.memory (Chrome-specific)
Object.defineProperty(global.performance, 'memory', {
  value: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 20000000,
    jsHeapSizeLimit: 40000000,
  },
  writable: true,
})

// Mock navigation APIs
Object.defineProperty(window, 'navigator', {
  value: {
    ...window.navigator,
    connection: undefined,
    mozConnection: undefined,
    webkitConnection: undefined,
  },
  writable: true,
})

// Mock PerformanceObserver
global.PerformanceObserver = class PerformanceObserver {
  static readonly supportedEntryTypes: ReadonlyArray<string> = []
  constructor(_callback: PerformanceObserverCallback) {}
  observe() {}
  disconnect() {}
  takeRecords(): PerformanceEntryList {
    return []
  }
}

// Mock getEntriesByType
global.performance.getEntriesByType = vi.fn(() => [])
