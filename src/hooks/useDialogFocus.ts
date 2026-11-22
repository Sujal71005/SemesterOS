import { useEffect, useRef } from 'react'

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

export function useDialogFocus<T extends HTMLElement>(onEscape?: () => void) {
  const dialogRef = useRef<T>(null)
  const escapeRef = useRef(onEscape)
  escapeRef.current = onEscape

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const focusFirst = () => {
      const candidates = dialog?.querySelectorAll<HTMLElement>(focusableSelector)
      ;(candidates?.[0] ?? dialog)?.focus()
    }
    focusFirst()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (escapeRef.current) { event.preventDefault(); escapeRef.current() }
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const candidates = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      if (!candidates.length) { event.preventDefault(); dialog.focus(); return }
      const first = candidates[0]
      const last = candidates[candidates.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  return dialogRef
}
