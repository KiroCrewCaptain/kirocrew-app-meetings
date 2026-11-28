// On a host older than App Kit level 16 the SDK has no `useKeepAlive`: the page
// must still render and record, closing on leave as it always did.

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@kirocrew/app-sdk', async importOriginal => {
  const { useKeepAlive: _absent, stubUseKeepAlive: _control, ...olderHost } =
    await importOriginal<typeof import('./stubs/app-sdk')>()
  return olderHost
})

import { useKeepPageWhileRecording } from '../src/host/keepAlive'

describe('keep-alive on a host without useKeepAlive', () => {
  it('does nothing and does not throw, recording or not', () => {
    const view = renderHook(({ recording }) => useKeepPageWhileRecording(recording), {
      initialProps: { recording: true },
    })
    expect(() => view.rerender({ recording: false })).not.toThrow()
    expect(() => view.rerender({ recording: true })).not.toThrow()
  })
})
