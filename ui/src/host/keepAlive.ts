/**
 * Keeps the meeting page running, hidden, while it records.
 *
 * The page owns the microphone and the transcription socket, so leaving it for
 * another dashboard page used to stop the recording until the person came back.
 * The SDK's `useKeepAlive` (App Kit level 16) asks the dashboard to keep the page
 * mounted while `busy` is true and names it on every page with Open and Stop.
 * Feature-detected: an older host has no such export, and the page then closes on
 * leave as before.
 */
import * as sdk from '@kirocrew/app-sdk'

// Read through the namespace with `in`, as `SimpleSelect` reads `Select`: a bare
// `sdk.useKeepAlive` may be bundled as a named import, which an older host's
// module would refuse to link.
const hostUseKeepAlive = 'useKeepAlive' in sdk ? sdk.useKeepAlive : undefined

/** Asks the dashboard to keep this page running while *recording* is true. */
export function useKeepPageWhileRecording(recording: boolean): void {
  // The export is fixed for the page's life, so the hook is called on every
  // render or on none, as the rules of hooks require.
  hostUseKeepAlive?.(recording)
}
