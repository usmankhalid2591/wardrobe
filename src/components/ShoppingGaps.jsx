import { useState } from 'react'
import { useSettings } from '../lib/settings'
import AiDisabledNotice from './AiDisabledNotice'

export default function ShoppingGaps({ items }) {
  const { settings } = useSettings()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  if (!settings.ai_shopping_gaps) return <AiDisabledNotice feature="Shopping gap suggestions" />

  async function generate() {
    setBusy(true); setError(''); setResult(null)
    try {
      const wardrobe = items.map(it => ({
        name: it.name, brand: it.brand, color: it.color,
        material: it.material, tags: it.tags, notes: it.notes,
      }))
      const res = await fetch('/.netlify/functions/shopping-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardrobe }),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || `Request failed (${res.status})`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Could not analyze your wardrobe.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="gen-intro">I'll look at what you own and suggest a few pieces worth adding.</p>

      <button type="button" className="btn" onClick={generate} disabled={busy || items.length === 0}>
        {busy ? 'Looking…' : 'Find gaps'}
      </button>

      {items.length === 0 && (
        <div className="empty"><h3>Add pieces first</h3><p>I need a wardrobe to find gaps in.</p></div>
      )}

      {busy && <div className="loading-row"><span className="spinner" /> Reviewing your wardrobe…</div>}
      {error && <div className="notice err">{error}</div>}

      {result && (!result.gaps || result.gaps.length === 0) && (
        <div className="empty"><h3>Looking solid</h3><p>Nothing obvious is missing right now.</p></div>
      )}

      {result?.gaps?.length > 0 && (
        <div className="gap-list">
          {result.gaps.map((g, i) => (
            <div className="outfit gap-card" key={i}>
              <div className="outfit-head">
                <div className="occasion">{g.title}</div>
              </div>
              {g.reason && <p className="detail-notes gap-reason">{g.reason}</p>}
              {g.suggestions?.length > 0 && (
                <div className="tags">
                  {g.suggestions.map((s, j) => <span className="tag" key={j}>{s}</span>)}
                </div>
              )}
            </div>
          ))}

          {result.note && <div className="outfit-note">{result.note}</div>}
        </div>
      )}
    </div>
  )
}
