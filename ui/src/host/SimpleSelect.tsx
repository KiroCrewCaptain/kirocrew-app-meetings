/**
 * The dashboard's `components/SimpleSelect`, as the props this page passes.
 *
 * The SDK's `Select` (App Kit level 1) is the host's own select narrowed to a
 * published contract. It is read off a namespace import, because a named import
 * of an export an older host lacks would fail the whole bundle at load; on such a
 * host a native `<select>` stands in. `style` (which the SDK contract leaves out)
 * goes on a wrapper.
 */

import type { CSSProperties } from 'react'
import * as ui from '@kirocrew/app-sdk/ui'

interface Props {
  options: string[]
  optionLabels?: string[]
  value: string
  onChange: (value: string) => void
  clearLabel?: string
  disabled?: boolean
  'aria-label'?: string
  title?: string
  className?: string
  style?: CSSProperties
}

type SdkSelect = (props: Omit<Props, 'style'>) => JSX.Element
const HostSelect: SdkSelect | undefined = 'Select' in ui ? (ui.Select as unknown as SdkSelect) : undefined

export default function SimpleSelect({ style, ...props }: Props) {
  if (HostSelect) {
    return (
      <span className="inline-flex min-w-0" style={style}>
        <HostSelect {...props} />
      </span>
    )
  }
  const { options, optionLabels, value, onChange, clearLabel, disabled, title, className } = props
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={props['aria-label']}
      title={title}
      className={`rounded-md border border-border bg-input px-2 py-1 text-[13px] ${className ?? ''}`}
      style={style}
      onChange={e => onChange(e.target.value)}
    >
      {clearLabel !== undefined && <option value="">{clearLabel}</option>}
      {options.map((option, i) => (
        <option key={option} value={option}>
          {optionLabels?.[i] ?? option}
        </option>
      ))}
    </select>
  )
}
