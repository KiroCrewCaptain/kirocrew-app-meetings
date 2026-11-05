import { useEffect } from 'react'

/**
 * The keyboard contract for `role="menu"` surfaces (WAI-ARIA menu pattern),
 * restated from the dashboard's `hooks/useMenuKeyboard.ts`: ArrowDown/ArrowUp
 * move focus between the enabled items and wrap, Home/End jump to the ends, and
 * Tab/Shift-Tab are contained in the items. Escape is the host's own.
 *
 * The dashboard's version shares a document-level IME latch; here a key that is
 * part of a composition (`isComposing`, or the 229 key code a WebKit IME sends)
 * is left alone, which is the same outcome for the keys this contract handles.
 */

/** The enabled, keyboard-reachable rows of a menu container. */
export function menuItemsOf(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  const sel = '[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"],[role="button"],button'
  return Array.from(container.querySelectorAll<HTMLElement>(sel)).filter(
    el => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true',
  )
}

function composing(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}

/** Handle one keydown against the menu contract; true when the key was consumed. */
export function handleMenuKeydown(e: KeyboardEvent, getItems: () => HTMLElement[]): boolean {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
    if (e.altKey || e.ctrlKey || e.metaKey) return false
    const focusable = getItems()
    if (focusable.length === 0) return false
    if (composing(e)) return true
    e.preventDefault()
    if (e.key === 'Home') { focusable[0].focus(); return true }
    if (e.key === 'End') { focusable[focusable.length - 1].focus(); return true }
    const idx = focusable.indexOf(document.activeElement as HTMLElement)
    const next = idx === -1
      ? (e.key === 'ArrowDown' ? 0 : focusable.length - 1)
      : (idx + (e.key === 'ArrowDown' ? 1 : -1) + focusable.length) % focusable.length
    focusable[next].focus()
    return true
  }
  if (e.key !== 'Tab') return false
  const focusable = getItems()
  if (focusable.length === 0) return false
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    if (composing(e)) return true
    e.preventDefault()
    last.focus()
    return true
  }
  if (!e.shiftKey && document.activeElement === last) {
    if (composing(e)) return true
    e.preventDefault()
    first.focus()
    return true
  }
  return false
}

function isEditableElement(el: Element | null): boolean {
  if (!el) return false
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLInputElement) return !['button', 'checkbox', 'radio', 'submit', 'reset'].includes(el.type)
  return (el as HTMLElement).isContentEditable === true
}

/** Wire an open `role="menu"` container onto the menu keyboard contract. */
export function useMenuKeyboard(opts: {
  enabled: boolean
  containerRef: React.RefObject<HTMLElement | null>
  focusFirstOnOpen?: boolean
}): void {
  const { enabled, containerRef, focusFirstOnOpen = true } = opts
  useEffect(() => {
    if (!enabled) return
    const items = () => menuItemsOf(containerRef.current)
    if (focusFirstOnOpen) items()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (active && !containerRef.current?.contains(active) && isEditableElement(active)) return
      handleMenuKeydown(e, items)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled, focusFirstOnOpen, containerRef])
}
