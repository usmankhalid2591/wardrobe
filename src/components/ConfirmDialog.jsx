import { useEscClose } from '../lib/useEscClose'

// Small in-app confirmation dialog, styled to match the ledger aesthetic.
// Replaces window.confirm().
export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', busy, onConfirm, onCancel }) {
  useEscClose(onCancel, !busy)

  return (
    <div className="scrim" onClick={onCancel}>
      <div className="sheet confirm-sheet" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        {message && <p className="confirm-message">{message}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
