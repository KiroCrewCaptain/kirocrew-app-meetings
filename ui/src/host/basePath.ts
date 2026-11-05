/**
 * The dashboard's URL base, read at run time from where the gateway served this
 * bundle.
 *
 * The dashboard knows its base from its own build (`KIROCREW_BASE_PATH`); an app
 * bundle is built once for every install, so it derives the base instead: the
 * gateway serves the bundle at `<base>/apps/meetings/ui/dist/index.mjs`, so the
 * base is whatever precedes `/apps/meetings/` in the bundle's own URL. In the
 * stock dashboard that is `''` and {@link withBase} is the identity.
 */

const APP_MOUNT = '/apps/meetings/'

export function basePathOf(bundleUrl: string): string {
  let pathname: string
  try {
    pathname = new URL(bundleUrl).pathname
  } catch {
    return ''
  }
  const at = pathname.indexOf(APP_MOUNT)
  return at > 0 ? pathname.slice(0, at).replace(/\/+$/, '') : ''
}

export const BASE_PATH: string = basePathOf(import.meta.url)

/**
 * Prefix a root-relative path (`/vendor/x.js`) with the base. Anything else
 * (relative, protocol-relative, absolute URL) and a path already under the base
 * is returned unchanged.
 */
export function withBase(path: string, base: string = BASE_PATH): string {
  if (base === '' || !path.startsWith('/') || path.startsWith('//')) return path
  const end = path.search(/[?#]/)
  const pathname = end === -1 ? path : path.slice(0, end)
  return pathname === base || pathname.startsWith(`${base}/`) ? path : `${base}${path}`
}
