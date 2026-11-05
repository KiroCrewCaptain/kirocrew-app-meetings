/**
 * The dashboard router's `Link`, for a link to another dashboard page. An app
 * page navigates through the SDK's `useNavigate`, which runs the host router; the
 * anchor keeps its `href` so it can still be opened in a new tab.
 */

import type { MouseEvent, ReactNode } from 'react'
import { useNavigate } from '@kirocrew/app-sdk'
import { withBase } from './basePath'

export function Link({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const navigate = useNavigate()
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return (
    <a href={withBase(to)} className={className} onClick={onClick}>
      {children}
    </a>
  )
}
