import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast.jsx'
import { resolveSlots } from '../lib/slots'
import { useSlotCarousels } from '../lib/useSlotCarousels'
import { getWeather } from '../lib/weather'
import { useSettings } from '../lib/settings'
import SlotCarousels from './SlotCarousels'
import AiDisabledNotice from './AiDisabledNotice'

const SUGGESTIONS = [
  'Summer wedding', 'First date', 'Business meeting', 'Casual weekend', 'Eid gathering', 'Evening dinner',
  'Job interview', 'Office day', 'Friends hangout', 'Date night', 'Travel day', 'Religious gathering',
  'Birthday party', 'Outdoor brunch', 'Gym workout', 'Rainy day', 'Winter outing', 'Funeral / condolence',
]

export default function OutfitGenerator({ items, userId }) {
  const showToast = useToast()
  const { settings } = useSettings()
  const [occasion, setOccasion] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [weather, setWeather] = useState(null)
  const [surprising, setSurprising] = useState(false)
  const { selections, trackRefs, reset, handleScroll, selectItem, chosenPiece } = useSlotCarousels()

  const readyItems = items.filter(it => (it.status || 'ready') === 'ready' && !it.in_storage)

  const slots = resolveSlots(result?.slots, items)

  useEffect(() => {
    getWeather().then(setWeather)
  }, [])

  if (!settings.ai_stylist) return <AiDisabledNotice feature="The stylist" />

  async function generate(occ, opts = {}) {
    const { surprise = false } = opts
    const text = (occ ?? occasion).trim()
    if (!text && !surprise) return
    setBusy(true); setError(''); setResult(null); setSaved(false); reset()
    try {
      const wardrobe = readyItems.map(it => ({
        name: it.name, brand: it.brand, color: it.color,
        material: it.material, tags: it.tags, notes: it.notes,
      }))
      const res = await fetch('/.netlify/functions/generate-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occasion: text, wardrobe, weather, surprise }),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || `Request failed (${res.status})`)
      }
      const data = await res.json()
      setResult({ ...data, occasion: text || data.occasion || 'Surprise outfit' })
    } catch (err) {
      setError(err.message || 'Could not generate an outfit.')
    } finally {
      setBusy(false)
      setSurprising(false)
    }
  }

  function surpriseMe() {
    setSurprising(true)
    generate('', { surprise: true })
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

      {weather && (
        <div className="weather-chip">
          {weather.tempC}°C, {weather.description} — I'll factor this in.
        </div>
      )}

      <div className="gen-input-row">
        <input value={occasion} onChange={e => setOccasion(e.target.value)}
          placeholder="e.g. outdoor brunch in Islamabad"
          onKeyDown={e => e.key === 'Enter' && generate()} />
        <button className="btn" onClick={() => generate()} disabled={busy || readyItems.length === 0}>
          {busy && !surprising ? '…' : 'Style me'}
        </button>
      </div>

      <button type="button" className="btn ghost surprise-btn" onClick={surpriseMe}
        disabled={busy || readyItems.length === 0}>
        {surprising ? 'Thinking…' : '✨ Surprise me'}
      </button>

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

          <SlotCarousels slots={slots} selections={selections} trackRefs={trackRefs}
            handleScroll={handleScroll} selectItem={selectItem} />

          {result.note && <div className="outfit-note">{result.note}</div>}
        </div>
      )}
    </div>
  )
}
