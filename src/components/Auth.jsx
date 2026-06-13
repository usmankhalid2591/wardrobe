import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('signin') // signin | signup | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError(''); setOk(''); setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setOk('Account created. You can sign in now.')
        setMode('signin')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setOk('If that email is registered, a reset link is on its way. Check your inbox.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">
          <h1>The Wardrobe</h1>
          <div className="sub">Personal Atelier Ledger</div>
        </div>
        {error && <div className="notice err">{error}</div>}
        {ok && <div className="notice ok">{ok}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          {mode !== 'forgot' && (
            <div className="field">
              <label>Password</label>
              <input type="password" required minLength={6} value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
            </div>
          )}
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        {mode === 'signin' && (
          <div className="auth-toggle">
            <button onClick={() => { setMode('forgot'); setError(''); setOk('') }}>Forgot password?</button>
          </div>
        )}

        <div className="auth-toggle">
          {mode === 'signin' && <>No account yet? <button onClick={() => { setMode('signup'); setError(''); setOk('') }}>Create one</button></>}
          {mode === 'signup' && <>Already enrolled? <button onClick={() => { setMode('signin'); setError(''); setOk('') }}>Sign in</button></>}
          {mode === 'forgot' && <>Remembered it? <button onClick={() => { setMode('signin'); setError(''); setOk('') }}>Sign in</button></>}
        </div>
      </div>
    </div>
  )
}
