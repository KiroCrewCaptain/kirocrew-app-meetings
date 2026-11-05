/**
 * The overflow menu this page used from the dashboard's
 * `components/ui/dropdown-menu.tsx` (a Radix menu). That component is not part of
 * the App Kit, so this is a small local menu with the same API surface the page
 * uses (`DropdownMenu`, `DropdownMenuTrigger asChild`, `DropdownMenuContent
 * align`, `DropdownMenuItem onSelect disabled`, `DropdownMenuSeparator`) and the
 * same behaviour a user meets: the trigger toggles a `role="menu"` list, focus
 * enters it, the arrow keys move and wrap, Escape and an outside press close it
 * and give focus back to the trigger, and choosing an item closes it.
 */

import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { useMenuKeyboard } from './useMenuKeyboard'
import { useEscapeLayer, ESCAPE_PRIORITY } from './useEscapeLayer'

interface MenuState {
  open: boolean
  setOpen: (open: boolean) => void
  menuId: string
  triggerRef: React.MutableRefObject<HTMLElement | null>
}

const MenuCtx = createContext<MenuState | null>(null)

function useMenu(): MenuState {
  const state = useContext(MenuCtx)
  if (!state) throw new Error('DropdownMenu parts must sit inside <DropdownMenu>')
  return state
}

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const triggerRef = useRef<HTMLElement | null>(null)
  const value = useMemo(() => ({ open, setOpen, menuId, triggerRef }), [open, menuId])
  return (
    <MenuCtx.Provider value={value}>
      <span className="relative inline-flex">{children}</span>
    </MenuCtx.Provider>
  )
}

export function DropdownMenuTrigger({
  asChild,
  children,
}: {
  asChild?: boolean
  children: ReactElement<Record<string, unknown>>
}) {
  const { open, setOpen, menuId, triggerRef } = useMenu()
  const props = {
    'aria-haspopup': 'menu' as const,
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    'data-state': open ? 'open' : 'closed',
    onClick: (e: MouseEvent) => {
      const own = isValidElement(children) ? (children.props.onClick as ((e: MouseEvent) => void) | undefined) : undefined
      own?.(e)
      if (!e.defaultPrevented) setOpen(!open)
    },
    ref: (el: HTMLElement | null) => {
      triggerRef.current = el
    },
  }
  if (asChild && isValidElement(children)) return cloneElement(children, props)
  return (
    <button type="button" {...props}>
      {children}
    </button>
  )
}

export function DropdownMenuContent({
  align = 'start',
  className = '',
  children,
}: {
  align?: 'start' | 'end'
  className?: string
  children: ReactNode
}) {
  const { open, setOpen, menuId, triggerRef } = useMenu()
  const listRef = useRef<HTMLDivElement | null>(null)
  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [setOpen, triggerRef])
  useMenuKeyboard({ enabled: open, containerRef: listRef })
  useEscapeLayer(open, () => {
    close()
    return 'take'
  }, ESCAPE_PRIORITY.flyout)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (listRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open, setOpen, triggerRef])
  if (!open) return null
  return (
    <div
      ref={listRef}
      id={menuId}
      role="menu"
      data-state="open"
      className={`absolute top-full mt-1 z-50 rounded-md border border-border bg-card p-1 shadow-lg ${
        align === 'end' ? 'right-0' : 'left-0'
      } ${className}`}
    >
      <MenuCloseCtx.Provider value={close}>{children}</MenuCloseCtx.Provider>
    </div>
  )
}

const MenuCloseCtx = createContext<() => void>(() => {})

export function DropdownMenuItem({
  disabled,
  onSelect,
  className = '',
  children,
}: {
  disabled?: boolean
  onSelect?: () => void
  className?: string
  children: ReactNode
}) {
  const close = useContext(MenuCloseCtx)
  return (
    <div
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled ? 'true' : undefined}
      data-disabled={disabled ? '' : undefined}
      className={`flex items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none cursor-pointer select-none hover:bg-hover focus:bg-hover ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      } ${className}`}
      onClick={() => {
        if (disabled) return
        close()
        onSelect?.()
      }}
      onKeyDown={e => {
        if (disabled || (e.key !== 'Enter' && e.key !== ' ')) return
        e.preventDefault()
        close()
        onSelect?.()
      }}
    >
      {children}
    </div>
  )
}

export function DropdownMenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />
}
