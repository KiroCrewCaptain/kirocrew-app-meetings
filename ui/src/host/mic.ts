/**
 * The one microphone helper the transcription hook used from the dashboard's
 * `hooks/mic.ts`, restated: report a permission denial to the desktop shell so it
 * can show the OS privacy pane (macOS asks for the microphone once). A no-op in a
 * plain browser, and best-effort everywhere: telling the user why must never be
 * what throws. The shell bridge is not an App Kit seam (PORTING.md, "UI gaps").
 */

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
