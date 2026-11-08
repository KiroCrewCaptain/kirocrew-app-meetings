/**
 * The one download helper the meeting menu's Export items used from the
 * dashboard's `utils/download.ts` (`saveBlob`), restated without its Android
 * in-app-browser hand-off.
 *
 * In a desktop or mobile browser the file is saved through an object-URL click,
 * exactly as the dashboard does, and the desktop shell is told the file name
 * first so it saves only a download the page asked for. An Android WebView drops
 * a `blob:` click; the dashboard then uploads the bytes to its artifact route and
 * downloads them back from a real URL, a route this app's `permissions.api` does
 * not grant (PORTING.md, gap U5). There the promise rejects, so the caller shows
 * its "Download failed" notice instead of a silent no-op.
 */

/** Tell the desktop shell a download is coming. Absent in a plain browser. */
function announceDownload(filename: string): void {
  try {
    ;(window as unknown as { kirocrew?: { expectDownload?: (name: string) => void } })
      .kirocrew?.expectDownload?.(filename)
  } catch {
    // A missing or throwing bridge must never block the download itself.
  }
}

/** True inside an Android app that embeds a WebView: its user agent carries `; wv)`. */
export function isAndroidWebView(
  ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): boolean {
  return /\bAndroid\b/.test(ua) && /;\s*wv\)/.test(ua)
}

/** Save a file the page built. Rejects where the browser cannot save a `blob:` URL. */
export async function saveBlob(blob: Blob, filename: string): Promise<void> {
  if (isAndroidWebView()) {
    throw new Error('this browser cannot save a file the page built')
  }
  announceDownload(filename)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoked a tick later so the click can consume it.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
