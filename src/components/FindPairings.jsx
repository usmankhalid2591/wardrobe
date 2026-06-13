import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast.jsx'
import { resolveSlots } from '../lib/slots'
import { useSlotCarousels } from '../lib/useSlotCarousels'
import { useEscClose } from '../lib/useEscClose'
import { useSettings } from '../lib/settings'
import SlotCarousels from './SlotCarousels'
import AiDisabledNotice from './AiDisabledNotice'

export default function FindPairings({ item, items, userId, onClose }) {
  const showToast = useToast()
  const { settings } = useSettings()
  const [busy, setBusy] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { selections, trackRefs, handleScroll, selectItem, chosenPiece } = useSlotCarousels()

  useEscClose(onClose)

  const slots = resolveSlots(result?.slots, items)

  useEffect(() => {
    if (!settings.ai_pairings) { setBusy(false); return }
    let cancelled = false
    async function run() {
      setBusy(true); setError(''); setResult(null); setSaved(false)
      try {
        const pool = items.filter(it => it.id === item.id || ((it.status || 'ready') === 'ready' && !it.in_storage))
        const wardrobe = pool.map(it => ({
          name: it.name, brand: it.brand, color: it.color,
          material: it.material, tags: it.tags, notes: it.notes,
        }))
        const anchor = {
          name: item.name, brand: item.brand, color: item.color,
          material: item.material, tags: item.tags, notes: item.notes,
        }
        const res = await fetch('/.netlify/functions/find-pairings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anchor, wardrobe }),
        })
        if (!res.ok) {
          const t = await res.text()
          throw new Error(t || `Request failed (${res.status})`)
        }
        const data = await res.json()
        if (!cancelled) setResult(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not find pairings.')
      } finally {
        if (!cancelled) setBusy(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [item.id])

  async function saveOutfit() {
    if (!slots.length) return
    setSaving(true)
    const pieces = slots.map((slot, i) => {
      const chosen = chosenPiece(slot, i)
      return { role: slot.role, item: chosen.item, why: chosen.why }
    })
    const { error } = await supabase.from('saved_outfits').insert({
      user_id: userId,
      occasion: `Pairings for ${item.name}`,
      pieces,
      note: result?.note || '',
    })
    setSaving(false)
    if (error) {
      showToast(error.message || 'Could not save outfit.', 'err')
      return
    }
    setSaved(true)
    showToast('Outfit saved.')
  }

  if (!settings.ai_pairings) {
    return (
      <div className="scrim" onClick={onClose}>
        <div className="sheet" onClick={e => e.stopPropagation()}>
          <AiDisabledNotice feature="Find pairings" />
          <div className="sheet-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="outfit-head">
          <div className="occasion">Pairings for {item.name}</div>
        </div>

        {busy && <div className="loading-row"><span className="spinner" /> Finding pairings…</div>}
        {error && <div className="notice err">{error}</div>}

        {result && slots.length === 0 && (
          <div className="empty"><h3>Couldn't find pairings</h3><p>Try adding more pieces to your wardrobe.</p></div>
        )}

        {result && slots.length > 0 && (
          <div className="outfit">
            <SlotCarousels slots={slots} selections={selections} trackRefs={trackRefs}
              handleScroll={handleScroll} selectItem={selectItem} />
            {result.note && <div className="outfit-note">{result.note}</div>}
          </div>
        )}

        <div className="sheet-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Close</button>
          {result && slots.length > 0 && (
            <button type="button" className="btn" onClick={saveOutfit} disabled={saving || saved}>
              {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save outfit'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
