import { useState } from 'react'
import { resolveSlots } from '../lib/slots'
import { useSlotCarousels } from '../lib/useSlotCarousels'
import SlotCarousels from './SlotCarousels'

function DayPlan({ day, items }) {
  const { selections, trackRefs, handleScroll, selectItem } = useSlotCarousels()
  const slots = resolveSlots(day.slots, items)
  if (slots.length === 0) return null
  return (
    <div className="outfit">
      <div className="outfit-head">
        <div className="occasion">{day.label}</div>
      </div>
      <SlotCarousels slots={slots} selections={selections} trackRefs={trackRefs}
        handleScroll={handleScroll} selectItem={selectItem} />
    </div>
  )
}

export default function PackingList({ items }) {
  const [destination, setDestination] = useState('')
  const [days, setDays] = useState(3)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const readyItems = items.filter(it => (it.status || 'ready') === 'ready' && !it.in_storage)

  async function generate() {
    const text = destination.trim()
    if (!text) return
    setBusy(true); setError(''); setResult(null)
    try {
      const wardrobe = readyItems.map(it => ({
        name: it.name, brand: it.brand, color: it.color,
        material: it.material, tags: it.tags, notes: it.notes,
      }))
      const res = await fetch('/.netlify/functions/generate-packing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: text, days: Number(days) || 1, wardrobe }),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || `Request failed (${res.status})`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Could not build a packing list.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="gen-intro">Tell me about the trip and I'll plan outfits day by day from your wardrobe.</p>

      <div className="field">
        <label>Trip</label>
        <input value={destination} onChange={e => setDestination(e.target.value)}
          placeholder="e.g. wedding weekend in Lahore"
          onKeyDown={e => e.key === 'Enter' && generate()} />
      </div>

      <div className="field" style={{ maxWidth: 120 }}>
        <label>Days</label>
        <input type="number" min="1" max="14" value={days}
          onChange={e => setDays(e.target.value)} />
      </div>

      <button type="button" className="btn" onClick={generate}
        disabled={busy || readyItems.length === 0 || !destination.trim()}>
        {busy ? 'Planning…' : 'Plan my packing'}
      </button>

      {items.length === 0 && (
        <div className="empty"><h3>Add pieces first</h3><p>The packing planner needs a wardrobe to work with.</p></div>
      )}
      {items.length > 0 && readyItems.length === 0 && (
        <div className="empty"><h3>Nothing ready to wear</h3><p>Everything's in laundry, repair, or storage. Update a piece's status to bring it back into rotation.</p></div>
      )}

      {busy && <div className="loading-row"><span className="spinner" /> Planning the trip…</div>}
      {error && <div className="notice err">{error}</div>}

      {result && (
        <div className="packing-result">
          {(result.days || []).map((d, i) => <DayPlan key={i} day={d} items={items} />)}

          {result.extras?.length > 0 && (
            <div className="outfit">
              <div className="outfit-head"><div className="occasion">Don't forget</div></div>
              <div className="tags">
                {result.extras.map((e, i) => <span className="tag" key={i}>{e}</span>)}
              </div>
            </div>
          )}

          {result.note && <div className="outfit-note">{result.note}</div>}
        </div>
      )}
    </div>
  )
}
