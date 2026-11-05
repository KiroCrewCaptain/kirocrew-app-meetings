/**
 * The dashboard's `components/ui` primitives this page uses.
 *
 * Every one but `IconButton` is the SDK's own. `IconButton` (a small square icon
 * button whose `variant` sets the hover colour) is not in the SDK, so it is
 * restated with the dashboard's classes; the dashboard's hover tip for a button
 * with no `title` is left out, and every use here passes a `title`.
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react'

export {
  Badge,
  Btn,
  Card,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  SearchInput,
  SendBtn,
  Skeleton,
  StatCard,
  Toggle,
} from '@kirocrew/app-sdk/ui'

const ICON_BUTTON_VARIANTS: Record<'default' | 'accent' | 'danger' | 'active', string> = {
  default: 'text-muted hover:text-text hover:bg-bg-hover',
  accent: 'text-muted hover:text-accent hover:bg-bg-hover',
  danger: 'text-muted hover:text-danger-text hover:bg-danger-subtle',
  active: 'text-accent hover:bg-bg-hover',
}

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  variant?: keyof typeof ICON_BUTTON_VARIANTS
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'default', className = '', children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={`p-[4px] rounded transition-all active:scale-[0.97] active:duration-75 cursor-pointer bg-transparent border-none disabled:opacity-30 disabled:cursor-not-allowed ${ICON_BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  ),
)
IconButton.displayName = 'IconButton'
