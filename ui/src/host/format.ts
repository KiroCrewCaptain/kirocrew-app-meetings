/**
 * The two date helpers the page used from the dashboard's `i18n/format.ts`.
 *
 * `fmtTime` is the SDK's own. `fmtDateFields` (a date built from explicit
 * components rather than a style preset) is not in the SDK, so it is restated
 * over the host's active locale: `Intl.DateTimeFormat` with the given fields.
 */

import { activeLocale, fmtTime } from '@kirocrew/app-sdk'

export { fmtTime }

type DateInput = Date | string | number | null | undefined

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function fmtDateFields(value: DateInput, options: Intl.DateTimeFormatOptions): string {
  const d = toDate(value)
  if (!d) return '—'
  let locale = 'en'
  try {
    locale = activeLocale() || 'en'
  } catch {
    /* host without a locale: English */
  }
  return new Intl.DateTimeFormat(locale, { localeMatcher: 'lookup', ...options }).format(d)
}
