import { useEffect, useRef } from 'react'

/**
 * One owner for page-wide Escape, restated from the dashboard's
 * `hooks/useEscapeLayer.ts` for this page's own layers.
 *
 * The highest-priority, most recently opened layer decides first: `take`
 * consumes the key, `pass` lets the next layer decide, `yield` lets the key go
 * on to the page untouched. The dashboard's own layers (a dialog the host opens
 * over this page) are not in this registry; PORTING.md lists the missing seam.
 */

export type EscapeVerdict = 'take' | 'pass' | 'yield'

export const ESCAPE_PRIORITY = { composer: 0, flyout: 10 } as const

interface Layer {
  seq: number
  priority: number
  handle: (e: KeyboardEvent) => EscapeVerdict
}

const layers: Layer[] = []
let nextSeq = 0

function onKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || e.defaultPrevented) return
  const ordered = [...layers].sort((a, b) => b.priority - a.priority || b.seq - a.seq)
  for (const layer of ordered) {
    const verdict = layer.handle(e)
    if (verdict === 'pass') continue
    if (verdict === 'take') {
      e.preventDefault()
      e.stopPropagation()
    }
    return
  }
}

function push(layer: Layer): () => void {
  if (layers.length === 0) document.addEventListener('keydown', onKeyDown, true)
  layers.push(layer)
  return () => {
    const i = layers.indexOf(layer)
    if (i >= 0) layers.splice(i, 1)
    if (layers.length === 0) document.removeEventListener('keydown', onKeyDown, true)
  }
}

export function useEscapeLayer(
  active: boolean,
  onEscape: (e: KeyboardEvent) => EscapeVerdict | void,
  priority = 0,
): void {
  const handler = useRef(onEscape)
  handler.current = onEscape
  useEffect(() => {
    if (!active) return
    return push({ seq: ++nextSeq, priority, handle: e => handler.current(e) ?? 'take' })
  }, [active, priority])
}
