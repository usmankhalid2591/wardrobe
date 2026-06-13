import { useEffect } from 'react'

// Calls onClose when the Escape key is pressed. Pass `enabled = false`
// to temporarily disable (e.g. while a nested overlay like a lightbox is open).
export function useEscClose(onClose, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    function handler(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, enabled])
}
