/**
 * The dashboard's Settings route for a tab (`website/src/components/settingsPath.ts`,
 * reduced to the tab form this page links to). A dashboard route, not an App Kit
 * seam (PORTING.md).
 */
export function settingsPath(target: { tab: string }): string {
  const tab = target.tab.trim()
  return tab ? `/settings/${encodeURIComponent(tab)}` : '/settings'
}
