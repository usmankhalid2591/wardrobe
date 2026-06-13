import { useState } from 'react'
import CategoryIcon from '../lib/categoryIcon'

const SUGGESTIONS = ['Summer wedding', 'First date', 'Business meeting', 'Casual weekend', 'Eid gathering', 'Evening dinner']

function findItem(items, name) {
  if (!name) return null
  const norm = s => s.trim().toLowerCase()
  const target = norm(name)
  return items.find(it => norm(it.name) === target)
    || items.find(it => norm(it.name).includes(target) || target.includes(norm(it.name)))
    || null
}

export default function OutfitGenerator({ items }) {
  const [occasion, setOccasion] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function generate(occ) {
    const text = (occ ?? occasion).trim()
    if (!text) return
    setBusy(true); setError(''); setResult(null)
    try {
      const wardrobe = items.map(it => ({
        name: it.name, brand: it.brand, color: it.color,
        material: it.material, tags: it.tags, notes: it.notes,
      }))
      const res = await fetch('/.netlify/functions/generate-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occasion: text, wardrobe }),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || `Request failed (${res.status})`)
      }
      const data = await res.json()
      setResult({ ...data, occasion: text })
    } catch (err) {
      setError(err.message || 'Could not generate an outfit.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="gen-intro">Tell me where you're headed. I'll dress you from your own wardrobe.</p>

      <div className="gen-input-row">
        <input value={occasion} onChange={e => setOccasion(e.target.value)}
          placeholder="e.g. outdoor brunch in Islamabad"
          onKeyDown={e => e.key === 'Enter' && generate()} />
        <button className="btn" onClick={() => generate()} disabled={busy || items.length === 0}>
          {busy ? '…' : 'Style me'}
        </button>
      </div>

      <div className="chips">
        {SUGGESTIONS.map(s => (
          <button key={s} className="chip" onClick={() => { setOccasion(s); generate(s) }}>{s}</button>
        ))}
      </div>

      {items.length === 0 && (
        <div className="empty"><h3>Add pieces first</h3><p>The stylist needs a wardrobe to work with.</p></div>
      )}

      {busy && <div className="loading-row"><span className="spinner" /> Considering the occasion…</div>}
      {error && <div className="notice err">{error}</div>}

      {result && (
        <div className="outfit">
          <div className="occasion">{result.occasion}</div>
          {(result.pieces || []).map((p, i) => {
            const match = findItem(items, p.item)
            return (
              <div className="outfit-piece" key={i}>
                <div className="outfit-piece-photo"
                  style={match?.photo_url ? { backgroundImage: `url(${match.photo_url})` } : {}}>
                  {!match?.photo_url && <CategoryIcon tags={match?.tags} className="tile-icon" />}
                </div>
                <div className="outfit-piece-body">
                  <div className="role">{p.role}</div>
                  <div className="item">{p.item}</div>
                  <div className="why">{p.why}</div>
                </div>
              </div>
            )
          })}
          {result.note && <div className="outfit-note">{result.note}</div>}
        </div>
      )}
    </div>
  )
}
