import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast.jsx'
import { useSettings } from '../lib/settings'
import { CURRENCIES } from '../lib/currency'
import { exportData, importData } from '../lib/dataBackup'
import ConfirmDialog from './ConfirmDialog'

const AI_TOGGLES = [
  { key: 'ai_identify', label: 'AI photo identification', desc: 'Suggest color, material, and category from a photo when adding a piece.' },
  { key: 'ai_stylist', label: 'Stylist', desc: 'Generate outfits for an occasion in the Stylist tab.' },
  { key: 'ai_pairings', label: 'Find pairings', desc: 'Suggest pairings for a single piece from your wardrobe.' },
  { key: 'ai_packing', label: 'Packing list generator', desc: 'Plan day-by-day outfits for a trip.' },
  { key: 'ai_shopping_gaps', label: 'Shopping gap suggestions', desc: 'Suggest pieces worth adding to your wardrobe.' },
]

export default function Settings({ userId, onDataChanged }) {
  const showToast = useToast()
  const { settings, update } = useSettings()
  const fileInputRef = useRef(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwOk, setPwOk] = useState('')

  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function changePassword(e) {
    e.preventDefault()
    setPwError(''); setPwOk('')
    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.')
      return
    }
    setPwBusy(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwBusy(false)
    if (error) {
      setPwError(error.message || 'Could not update password.')
      return
    }
    setNewPassword(''); setConfirmPassword('')
    setPwOk('Password updated.')
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportData(userId)
      showToast('Backup downloaded.')
    } catch (err) {
      showToast(err.message || 'Could not export your data.', 'err')
    } finally {
      setExporting(false)
    }
  }

  function pickImportFile() {
    fileInputRef.current?.click()
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const counts = await importData(userId, text)
      const parts = []
      if (counts.items) parts.push(`${counts.items} piece${counts.items === 1 ? '' : 's'}`)
      if (counts.saved_outfits) parts.push(`${counts.saved_outfits} saved outfit${counts.saved_outfits === 1 ? '' : 's'}`)
      if (counts.wear_log) parts.push(`${counts.wear_log} log entr${counts.wear_log === 1 ? 'y' : 'ies'}`)
      if (counts.settings) parts.push('settings')
      showToast(parts.length ? `Imported ${parts.join(', ')}.` : 'Nothing to import.')
      onDataChanged?.()
    } catch (err) {
      showToast(err.message || 'Could not import that file.', 'err')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  async function confirmDeleteAccount() {
    setDeleting(true)
    setDeleteError('')
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) throw new Error('Not signed in.')
      const res = await fetch('/.netlify/functions/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || `Request failed (${res.status})`)
      }
      await supabase.auth.signOut()
    } catch (err) {
      setDeleting(false)
      setDeleteError(err.message || 'Could not delete your account.')
    }
  }

  return (
    <div className="settings">
      <section className="settings-section">
        <h3>Appearance</h3>
        <div className="row">
          <div className="field">
            <label>Currency</label>
            <select value={settings.currency} onChange={e => update({ currency: e.target.value })}>
              {Object.entries(CURRENCIES).map(([code, c]) => (
                <option key={code} value={code}>{code} — {c.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Theme</label>
            <select value={settings.theme} onChange={e => update({ theme: e.target.value })}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3>AI features</h3>
        <p className="hint settings-section-hint">
          Each of these calls an AI model to help with the task. Turn any off if you'd rather work without it.
        </p>
        {AI_TOGGLES.map(t => (
          <label className="checkbox-row settings-toggle" key={t.key}>
            <input type="checkbox" checked={!!settings[t.key]}
              onChange={e => update({ [t.key]: e.target.checked })} />
            <span>
              <span className="settings-toggle-label">{t.label}</span>
              <span className="settings-toggle-desc">{t.desc}</span>
            </span>
          </label>
        ))}
      </section>

      <section className="settings-section">
        <h3>Wear reminders</h3>
        <label className="checkbox-row settings-toggle">
          <input type="checkbox" checked={!!settings.reminders_enabled}
            onChange={e => update({ reminders_enabled: e.target.checked })} />
          <span>
            <span className="settings-toggle-label">Remind me about neglected pieces</span>
            <span className="settings-toggle-desc">Show a banner on the Wardrobe tab for pieces that haven't been worn recently.</span>
          </span>
        </label>
        {settings.reminders_enabled && (
          <div className="field" style={{ maxWidth: 160 }}>
            <label>Remind after (days)</label>
            <input type="number" min="1" max="365" value={settings.reminder_days}
              onChange={e => update({ reminder_days: Number(e.target.value) || 14 })} />
          </div>
        )}
      </section>

      <section className="settings-section">
        <h3>Your data</h3>
        <p className="hint settings-section-hint">
          Download a backup of your pieces, saved outfits, wear log, and settings as a JSON file —
          or restore from one.
        </p>
        <div className="settings-actions">
          <button type="button" className="btn ghost" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export backup'}
          </button>
          <button type="button" className="btn ghost" onClick={pickImportFile} disabled={importing}>
            {importing ? 'Importing…' : 'Import backup'}
          </button>
          <input ref={fileInputRef} type="file" accept="application/json"
            style={{ display: 'none' }} onChange={handleImportFile} />
        </div>
        <p className="hint">Importing adds to your existing data — it doesn't replace it.</p>
      </section>

      <section className="settings-section">
        <h3>Account</h3>
        {pwError && <div className="notice err">{pwError}</div>}
        {pwOk && <div className="notice ok">{pwOk}</div>}
        <form onSubmit={changePassword}>
          <div className="row">
            <div className="field">
              <label>New password</label>
              <input type="password" minLength={6} value={newPassword}
                onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input type="password" minLength={6} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </div>
          </div>
          <button type="submit" className="btn ghost" disabled={pwBusy || !newPassword}>
            {pwBusy ? 'Updating…' : 'Change password'}
          </button>
        </form>

        <div className="settings-danger">
          <h3>Delete account</h3>
          <p className="hint settings-section-hint">
            Permanently deletes your account, every piece, saved outfit, wear log entry, photo, and setting.
            This cannot be undone.
          </p>
          {deleteError && <div className="notice err">{deleteError}</div>}
          <button type="button" className="btn danger" onClick={() => setConfirmingDelete(true)}>
            Delete my account
          </button>
        </div>
      </section>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete your account?"
          message="This permanently deletes your account and all of your wardrobe data. This cannot be undone."
          confirmLabel="Delete everything"
          busy={deleting}
          onConfirm={confirmDeleteAccount}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
