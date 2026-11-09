/**
 * `host/mic.acquireMicStream`: the microphone a meeting records is the one saved
 * in Settings > Voice > Microphone, as dictation records it. A saved device that
 * cannot be opened falls back to the system default; a permission denial is never
 * retried into a different constraint.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acquireMicStream } from '../src/host/mic'

const STREAM = { id: 'stream' } as unknown as MediaStream
let getUserMedia: ReturnType<typeof vi.fn>

function failure(name: string): Error {
  const e = new Error(name)
  e.name = name
  return e
}

beforeEach(() => {
  getUserMedia = vi.fn().mockResolvedValue(STREAM)
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
})

afterEach(() => {
  localStorage.removeItem('mc-mic-device-id')
})

describe('acquireMicStream', () => {
  it('opens the system default when no device is saved', async () => {
    await expect(acquireMicStream()).resolves.toBe(STREAM)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
  })

  it('opens the saved device exactly', async () => {
    localStorage.setItem('mc-mic-device-id', 'usb-mic')
    await expect(acquireMicStream()).resolves.toBe(STREAM)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(getUserMedia).toHaveBeenCalledWith({ audio: { deviceId: { exact: 'usb-mic' } } })
  })

  it.each(['OverconstrainedError', 'NotFoundError', 'NotReadableError', 'AbortError'])(
    'falls back to the system default when the saved device fails with %s',
    async (name) => {
      localStorage.setItem('mc-mic-device-id', 'usb-mic')
      getUserMedia.mockRejectedValueOnce(failure(name))
      await expect(acquireMicStream()).resolves.toBe(STREAM)
      expect(getUserMedia).toHaveBeenNthCalledWith(2, { audio: true })
    },
  )

  it.each(['NotAllowedError', 'SecurityError'])(
    'does not retry a %s into the system default',
    async (name) => {
      localStorage.setItem('mc-mic-device-id', 'usb-mic')
      getUserMedia.mockRejectedValueOnce(failure(name))
      await expect(acquireMicStream()).rejects.toMatchObject({ name })
      expect(getUserMedia).toHaveBeenCalledTimes(1)
    },
  )
})
