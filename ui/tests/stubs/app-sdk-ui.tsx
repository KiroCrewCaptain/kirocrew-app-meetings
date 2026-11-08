/**
 * A light stand-in for the host's `@kirocrew/app-sdk/ui`, at App Kit level 1:
 * plain elements with the roles and labels the host components render, so a
 * test can find them the way a user would.
 */

import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import type { SelectProps } from '@kirocrew/app-sdk/ui'
import { micromark } from 'micromark'

type Loose = { className?: string; children?: ReactNode; [prop: string]: unknown }

export const Btn = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean; primary?: boolean }
>(function Btn({ danger: _danger, primary: _primary, type = 'button', ...rest }, ref) {
  return <button ref={ref} type={type} {...rest} />
})

export const SendBtn = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function SendBtn({ type = 'button', ...rest }, ref) {
    return <button ref={ref} type={type} {...rest} />
  },
)

export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function SearchInput(props, ref) {
    return <input ref={ref} type="search" {...props} />
  },
)

export function SegmentedControl({
  segments,
  value,
  onChange,
}: {
  segments: Array<{ key: string; label: ReactNode }>
  value: string
  onChange: (key: string) => void
  layoutId?: string
  collapse?: boolean
}) {
  return (
    <div role="tablist">
      {segments.map((seg) => (
        <button
          key={seg.key}
          type="button"
          role="tab"
          aria-selected={seg.key === value}
          onClick={() => onChange(seg.key)}
        >
          {seg.label}
        </button>
      ))}
    </div>
  )
}

/** The host renders CommonMark; micromark is a CommonMark renderer that escapes raw HTML. */
export function MarkdownRenderer({ content }: { content: string }) {
  return <div data-testid="markdown" dangerouslySetInnerHTML={{ __html: micromark(content) }} />
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return <input ref={ref} {...props} />
  },
)

/** The host's Card carries the `card-glow` treatment (an `overflow: hidden` glow). */
export function Card({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-glow border border-border bg-card rounded-lg ${className}`} {...rest}>{children}</div>
}

export function CardTitle({ children }: Loose) {
  return <h2>{children}</h2>
}

export function ContentSkeleton() {
  return <div role="status" aria-busy="true" />
}

export function StatCard({ label, value }: Loose) {
  return (
    <div data-testid="stat-card">
      <span data-testid="stat-card-label">{label as ReactNode}</span>
      <span data-testid="stat-card-value">{value as ReactNode}</span>
    </div>
  )
}

export function EmptyState({ title, subtitle, action, testId = 'empty-state' }: { icon: ReactNode; title: string; subtitle?: string; action?: ReactNode; testId?: string }) {
  return (
    <div data-testid={testId}>
      <div data-testid={`${testId}-title`}>{title}</div>
      {subtitle ? <div data-testid={`${testId}-subtitle`}>{subtitle}</div> : null}
      {action ? <div data-testid={`${testId}-action`}>{action}</div> : null}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: string; actions?: ReactNode }) {
  return (
    <header data-testid="page-header">
      <h1 data-testid="page-title">{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
      {actions}
    </header>
  )
}

export function Clickable({ children, onClick, className, ...rest }: HTMLAttributes<HTMLElement> & Loose) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={className}
      onClick={onClick}
      onKeyDown={e => {
        // The host's Clickable activates on Enter and Space, like a button.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          ;(onClick as ((ev: unknown) => void) | undefined)?.(e)
        }
      }}
      {...(rest as HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </div>
  )
}

export function InfoTip({ text }: { text: string }) {
  return <span title={text}>ⓘ</span>
}

export function ErrorNotice({ message, title, onDismiss, footer }: { message?: string | null; title?: string; onDismiss?: () => void; footer?: ReactNode }) {
  if (!message) return null
  return (
    <div role="alert">
      {title ? <strong>{title}</strong> : null}
      {message}
      {footer ? <div>{footer}</div> : null}
      {onDismiss ? <button type="button" onClick={onDismiss}>Dismiss</button> : null}
    </div>
  )
}

export function Modal({ open, title, footer, children }: { open: boolean; onClose: () => void; title?: ReactNode; footer?: ReactNode; children?: ReactNode }) {
  if (!open) return null
  return (
    <div role="dialog" aria-label={typeof title === 'string' ? title : undefined}>
      <h2>{title}</h2>
      {children}
      {footer}
    </div>
  )
}

/**
 * Stands in for the host's themed dropdown, with the roles the host's own select
 * exposes: a `combobox` trigger naming the current choice, and a list of
 * `option`s once it is open. Marked so a test can tell it from the fallback.
 */
export function Select({ options, optionLabels, value, onChange, clearLabel, disabled, 'aria-label': ariaLabel, title }: SelectProps) {
  const [open, setOpen] = useState(false)
  const label = (o: string, i: number) => optionLabels?.[i] ?? o
  const current = options.indexOf(value)
  const shown = current >= 0 ? label(value, current) : (clearLabel ?? '')
  const rows: Array<{ value: string; text: string }> = [
    ...(clearLabel !== undefined ? [{ value: '', text: clearLabel }] : []),
    ...options.map((o, i) => ({ value: o, text: label(o, i) })),
  ]
  return (
    <span data-host-select="">
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        title={title}
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
      >
        {shown}
      </button>
      {open ? (
        <div role="listbox" aria-label={ariaLabel}>
          {rows.map(row => (
            <div
              key={row.value}
              role="option"
              aria-selected={row.value === value}
              onClick={() => {
                setOpen(false)
                onChange(row.value)
              }}
            >
              {row.text}
            </div>
          ))}
        </div>
      ) : null}
    </span>
  )
}

export const guideCaution = { 'data-guide-caution': '' } as const

/** The host's Badge: `variant` picks the tone class, as the dashboard's does. */
export function Badge({ variant, children, className = '', ...rest }: HTMLAttributes<HTMLSpanElement> & Loose & { variant?: string }) {
  const tone =
    variant === 'ok' ? 'bg-ok-subtle text-ok-text'
    : variant === 'err' ? 'bg-danger-subtle text-danger-text'
    : variant === 'aim' ? 'bg-aim-subtle text-aim'
    : variant === 'muted' ? 'bg-[var(--bg-hover)] text-[var(--muted)]'
    : 'bg-warn-subtle text-warn-text'
  return <span className={`${tone} ${className}`} {...(rest as HTMLAttributes<HTMLSpanElement>)}>{children}</span>
}

export function Skeleton({ className }: Loose) {
  return <div className={className} data-testid="skeleton" aria-busy="true" />
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
  describedBy,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  label?: string
  describedBy?: string
  tone?: 'accent' | 'muted'
}) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      aria-label={label}
      aria-describedby={describedBy}
      tabIndex={disabled ? -1 : 0}
      onClick={() => { if (!disabled) onChange(!checked) }}
      onKeyDown={e => {
        if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault()
          onChange(!checked)
        }
      }}
    />
  )
}
