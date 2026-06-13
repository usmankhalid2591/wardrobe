import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast.jsx'
import CategoryIcon from '../lib/categoryIcon'

const SUGGESTIONS = [
  'Summer wedding', 'First date', 'Business meeting', 'Casual weekend', 'Eid gathering', 'Evening dinner',
  'Job interview', 'Office day', 'Friends hangout', 'Date night', 'Travel day', 'Religious gathering',
  'Birthday party', 'Outdoor brunch', 'Gym workout', 'Rainy day', 'Winter outing', 'Funeral / condolence',
]

const ITEM_W = 84
const GAP = 10
const STEP = ITEM_W + GAP

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
  const [selections, setSelections] = useState({})
  const trackRefs = useRef({})

  const readyItems = items.filter(it => (it.status || 'ready') === 'ready')

  // Resolve AI slot/item names to actual wardrobe items, dropping anything
  // that doesn't match and any slot left with no matches.
  const slots = (result?.slots || [])
    .map(slot => ({
      role: slot.role,
      items: (slot.items || [])
        .map(p => ({ ...p, match: findItem(items, p.item) }))
        .filter(p => p.match),
    }))
    .filter(slot => slot.items.length > 0)

  async function generate(occ) {
    const text = (occ ?? occasion).trim()
    if (!text) return
    setBusy(true); setError(''); setResult(null); setSaved(false); setSelections({})
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

  function handleScroll(slotIndex, maxIndex) {
    return e => {
      const el = e.currentTarget
      clearTimeout(el._scrollTimer)
      el._scrollTimer = setTimeout(() => {
        let idx = Math.round(el.scrollLeft / STEP)
        idx = Math.max(0, Math.min(maxIndex, idx))
        setSelections(s => (s[slotIndex] === idx ? s : { ...s, [slotIndex]: idx }))
      }, 100)
    }
  }

  function selectItem(slotIndex, itemIndex) {
    const track = trackRefs.current[slotIndex]
    if (track) track.scrollTo({ left: itemIndex * STEP, behavior: 'smooth' })
    setSelections(s => ({ ...s, [slotIndex]: itemIndex }))
  }

  function chosenPiece(slot, slotIndex) {
    const idx = Math.min(selections[slotIndex] ?? 0, slot.items.length - 1)
    return slot.items[idx]
  }

  async function saveOutfit() {
    if (!slots.length) return
    setSaving(true)
    const pieces = slots.map((slot, i) => {
      const chosen = chosenPiece(slot, i)
      return { role: slot.role, item: chosen.item, why: chosen.why }
    })
    const { error } = await supabase.from('saved_outfits').insert({
      user_id: userId,
      occasion: result.occasion,
      pieces,
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

      {result && slots.length === 0 && (
        <div className="empty"><h3>Couldn't match an outfit</h3><p>Try a different occasion or add more pieces to your wardrobe.</p></div>
      )}

      {result && slots.length > 0 && (
        <div className="outfit">
          <div className="outfit-head">
            <div className="occasion">{result.occasion}</div>
            <button type="button" className="btn ghost" onClick={saveOutfit} disabled={saving || saved}>
              {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save outfit'}
            </button>
          </div>

          {slots.map((slot, i) => {
            const idx = Math.min(selections[i] ?? 0, slot.items.length - 1)
            const chosen = slot.items[idx]
            return (
              <div className="carousel-row" key={i}>
                <div className="carousel-label">{slot.role}</div>
                <div
                  className="carousel-track"
                  ref={el => { trackRefs.current[i] = el }}
                  onScroll={handleScroll(i, slot.items.length - 1)}
                >
                  {slot.items.map((p, j) => (
                    <div
                      className={`carousel-item${j === idx ? ' selected' : ''}`}
                      key={j}
                      onClick={() => selectItem(i, j)}
                    >
                      <div className="carousel-item-photo"
                        style={p.match?.photo_url ? { backgroundImage: `url(${p.match.photo_url})` } : {}}>
                        {!p.match?.photo_url && <CategoryIcon tags={p.match?.tags} className="tile-icon" />}
                      </div>
                      <div className="carousel-item-name">{p.match?.name || p.item}</div>
                    </div>
                  ))}
                </div>
                <div className="carousel-name">{chosen.match?.name || chosen.item}</div>
                {chosen.why && <div className="carousel-why">{chosen.why}</div>}
              </div>
            )
          })}

          {result.note && <div className="outfit-note">{result.note}</div>}
        </div>
      )}
    </div>
  )
}
