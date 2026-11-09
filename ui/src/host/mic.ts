/**
 * The two microphone helpers the transcription hook uses from the dashboard's
 * `hooks/mic.ts`, restated:
 *
 * - `acquireMicStream` opens the microphone saved in Settings > Voice > Microphone,
 *   the device dictation records, and falls back to the system default only when
 *   that device is gone or busy;
 * - `reportIfMicDenied` reports a permission denial to the desktop shell so it can
 *   show the OS privacy pane (macOS asks for the microphone once). A no-op in a
 *   plain browser, and best-effort everywhere: telling the user why must never be
 *   what throws.
 *
 * Neither the saved device id nor the shell bridge is an App Kit seam (PORTING.md,
 * "UI gaps", U3).
 */

/** The dashboard's localStorage key for the saved input device (`hooks/mic.ts`). */
const MIC_DEVICE_KEY = 'mc-mic-device-id'

/** The saved input deviceId; empty means "system default". */
function preferredMicId(): string {
  try {
    return localStorage.getItem(MIC_DEVICE_KEY) || ''
  } catch {
    return ''
  }
}

/**
 * True when a getUserMedia rejection means "this device could not be opened"
 * (gone, held by another app, or a driver failure), not "the user or OS refused".
 * The same four names the dashboard falls back on.
 */
function isDeviceUnavailable(name: string): boolean {
  switch (name) {
    case 'OverconstrainedError':
    case 'NotFoundError':
    case 'NotReadableError':
    case 'AbortError':
      return true
    default:
      return false
  }
}

/**
 * Open the saved microphone with `exact`, so the chosen device is either the one
 * recorded or the failure is visible; when it cannot be opened, the system
 * default. A permission denial always propagates: it is never retried into a
 * different constraint.
 */
export async function acquireMicStream(): Promise<MediaStream> {
  const id = preferredMicId()
  if (!id) return navigator.mediaDevices.getUserMedia({ audio: true })
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: id } } })
  } catch (e) {
    if (isDeviceUnavailable((e as { name?: string } | null)?.name || '')) {
      return navigator.mediaDevices.getUserMedia({ audio: true })
    }
    throw e
  }
}

function reportMicDenied(): void {
  try {
    ;(window as { electronAPI?: { reportMicDenied?: () => void } }).electronAPI?.reportMicDenied?.()
  } catch {
    /* no shell bridge (browser), or IPC unavailable */
  }
}

/** True when a getUserMedia rejection means "the user/OS refused", not "no device". */
function isPermissionDenial(e: unknown): boolean {
  const name = (e as { name?: string } | null)?.name || ''
  return name === 'NotAllowedError' || name === 'SecurityError'
}

/** Report a mic failure to the shell when, and only when, it was a denial. */
export function reportIfMicDenied(e: unknown): void {
  if (isPermissionDenial(e)) reportMicDenied()
}
