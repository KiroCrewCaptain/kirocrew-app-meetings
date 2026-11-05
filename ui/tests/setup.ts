import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { resetStubSdk } from './stubs/app-sdk'

// The two DOM gaps the dashboard's own test setup fills (integration/setup.ts):
// pointer capture and `matchMedia`.
if (typeof window !== 'undefined' && !HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = function () { return false }
  HTMLElement.prototype.setPointerCapture = function () {}
  HTMLElement.prototype.releasePointerCapture = function () {}
}
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// happy-dom has no blocking dialogs; a test spies on `confirm` to answer one.
if (typeof window !== 'undefined' && typeof window.confirm !== 'function') {
  Object.defineProperty(window, 'confirm', { writable: true, configurable: true, value: () => false })
}

afterEach(() => {
  cleanup()
  resetStubSdk()
})
