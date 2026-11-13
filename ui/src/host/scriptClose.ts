// Restated from the dashboard's `lib/widgetSrcdoc.escapeScriptClose`, which the
// App Kit SDK does not publish. The sketch export inlines the Mermaid runtime
// into a `<script>` element, so its text must not be able to end that element.

/** *js* with every casing of `</script` written `<\/script`, so it cannot end the
 *  inline element it is serialized into. A plain scan, not a pattern. */
export function escapeScriptClose(js: string): string {
  const close = '</script'
  const lower = js.toLowerCase()
  let out = ''
  let from = 0
  for (let at = lower.indexOf(close); at !== -1; at = lower.indexOf(close, at + close.length)) {
    out += js.slice(from, at) + '<\\/' + js.slice(at + 2, at + close.length)
    from = at + close.length
  }
  return out + js.slice(from)
}
