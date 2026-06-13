import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Shown after the user follows a "reset password" email link.
export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) { setError(error.message); return }
    setOk(true)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">
          <h1>The Wardrobe</h1>
          <div className="sub">Set a new password</div>
        </div>
        {error && <div className="notice err">{error}</div>}
        {ok ? (
          <>
            <div className="notice ok">Password updated. You're signed in.</div>
            <button className="btn" style={{ width: '100%' }} onClick={onDone}>Continue</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label>New password</label>
              <input type="password" required minLength={6} value={password}
                onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input type="password" required minLength={6} value={confirm}
                onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            <button className="btn" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
