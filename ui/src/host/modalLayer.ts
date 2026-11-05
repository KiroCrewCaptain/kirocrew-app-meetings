/** Whether *el* is a modal layer: a dialog role, `aria-modal`, or an open `<dialog>`. */
export function isModalLayer(el: Element): boolean {
  const role = el.getAttribute('role')
  if (role === 'dialog' || role === 'alertdialog') return true
  if (el.getAttribute('aria-modal') === 'true') return true
  return el.tagName === 'DIALOG' && (el as HTMLDialogElement).open
}
