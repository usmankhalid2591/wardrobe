import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('signin')
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
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setOk('Account created. You can sign in now.')
        setMode('signin')
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
          <div className="field">
            <label>Password</label>
            <input type="password" required minLength={6} value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <div className="auth-toggle">
          {mode === 'signin' ? "No account yet? " : 'Already enrolled? '}
          <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setOk('') }}>
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
