import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast.jsx'
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

export default function OutfitGenerator({ items, userId }) {
  const showToast = useToast()
  const [occasion, setOccasion] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const readyItems = items.filter(it => (it.status || 'ready') === 'ready')

  async function generate(occ) {
    const text = (occ ?? occasion).trim()
    if (!text) return
    setBusy(true); setError(''); setResult(null); setSaved(false)
    try {
      const wardrobe = readyItems.map(it => ({
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

  async function saveOutfit() {
    if (!result) return
    setSaving(true)
    const { error } = await supabase.from('saved_outfits').insert({
      user_id: userId,
      occasion: result.occasion,
      pieces: result.pieces || [],
      note: result.note || '',
    })
    setSaving(false)
    if (error) {
      showToast(error.message || 'Could not save outfit.', 'err')
      return
    }
    setSaved(true)
    showToast('Outfit saved.')
  }

  return (
    <div>
      <p className="gen-intro">Tell me where you're headed. I'll dress you from your own wardrobe.</p>

      <div className="gen-input-row">
        <input value={occasion} onChange={e => setOccasion(e.target.value)}
          placeholder="e.g. outdoor brunch in Islamabad"
          onKeyDown={e => e.key === 'Enter' && generate()} />
        <button className="btn" onClick={() => generate()} disabled={busy || readyItems.length === 0}>
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
      {items.length > 0 && readyItems.length === 0 && (
        <div className="empty"><h3>Nothing ready to wear</h3><p>Everything's in laundry or needs repair. Update a piece's status to bring it back into rotation.</p></div>
      )}

      {busy && <div className="loading-row"><span className="spinner" /> Considering the occasion…</div>}
      {error && <div className="notice err">{error}</div>}

      {result && (
        <div className="outfit">
          <div className="outfit-head">
            <div className="occasion">{result.occasion}</div>
            <button type="button" className="btn ghost" onClick={saveOutfit} disabled={saving || saved}>
              {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save outfit'}
            </button>
          </div>
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
