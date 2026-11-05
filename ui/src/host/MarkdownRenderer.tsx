/**
 * The dashboard's `components/MarkdownRenderer`, from the SDK.
 *
 * The dashboard also exports `BasePathCtx`, the context that makes a RELATIVE
 * image (`![10:23](images/x.png)`) resolve against a file's own folder. The SDK
 * does not, so the note preview hands the renderer absolute image paths instead
 * ({@link resolveRelativeImages}); an absolute local path is served through the
 * dashboard's own file route exactly as a context-resolved one is.
 */
export { MarkdownRenderer as default } from '@kirocrew/app-sdk/ui'

/** The folder of *filePath*, with forward slashes. */
function folderOf(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const cut = normalized.lastIndexOf('/')
  return cut > 0 ? normalized.slice(0, cut) : normalized
}

const RELATIVE_IMAGE = /(!\[[^\]\n]*\]\()(<)?(?![a-zA-Z][a-zA-Z0-9+.-]*:|\/|~|#)([^)\s>]+)(>)?/g

/**
 * *markdown* with every relative image destination made absolute against the
 * folder of *filePath*. URLs, root and home paths, and fragments are untouched.
 */
export function resolveRelativeImages(markdown: string, filePath: string): string {
  if (!filePath) return markdown
  const folder = folderOf(filePath)
  return markdown.replace(RELATIVE_IMAGE, (_whole, head: string, open = '', dest: string, close = '') => {
    const clean = dest.startsWith('./') ? dest.slice(2) : dest
    return `${head}${open}${folder}/${clean}${close}`
  })
}
