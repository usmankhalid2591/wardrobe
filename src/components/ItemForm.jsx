import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage, blobToDataURL } from '../lib/compressImage'
import { useToast } from '../lib/toast.jsx'
import { useEscClose } from '../lib/useEscClose'
import TagInput from './TagInput'

const blank = { name: '', brand: '', color: '', material: '', notes: '', tags: [], photo_url: '' }

export default function ItemForm({ item, userId, allTags, onClose, onSaved }) {
  const showToast = useToast()
  const [form, setForm] = useState(item
    ? { ...item, tags: item.tags || [] }
    : blank)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(item?.photo_url || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [identifying, setIdentifying] = useState(false)
  const [suggestions, setSuggestions] = useState(null)
  const identifyId = useRef(0)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setSuggestions(null)
    identify(f)
  }

  async function identify(f) {
    const id = ++identifyId.current
    setIdentifying(true)
    try {
      const small = await compressImage(f, { maxDim: 768, quality: 0.7 })
      const dataUrl = await blobToDataURL(small)
      const res = await fetch('/.netlify/functions/identify-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, mimeType: small.type || 'image/jpeg' }),
      })
      if (id !== identifyId.current) return
      if (!res.ok) return
      const data = await res.json()
      if (data.category || data.color || data.material) {
        setSuggestions(data)
      }
    } catch {
      // Identification is a nice-to-have — fail silently.
    } finally {
      if (id === identifyId.current) setIdentifying(false)
    }
  }

  function acceptCategory() {
    if (!suggestions?.category) return
    if (!form.tags.includes(suggestions.category)) {
      set('tags', [...form.tags, suggestions.category])
    }
    setSuggestions(s => ({ ...s, category: '' }))
  }

  function acceptColor() {
    if (!suggestions?.color) return
    set('color', suggestions.color)
    setSuggestions(s => ({ ...s, color: '' }))
  }

  function acceptMaterial() {
    if (!suggestions?.material) return
    set('material', suggestions.material)
    setSuggestions(s => ({ ...s, material: '' }))
  }

  useEscClose(onClose, !busy)

  async function save(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      let photo_url = form.photo_url || ''
      if (file) {
        const blob = await compressImage(file)
        const path = `${userId}/${Date.now()}.jpg`
        const { error: upErr } = await supabase.storage
          .from('item-photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
        if (upErr) throw upErr
        const { data } = supabase.storage.from('item-photos').getPublicUrl(path)
        photo_url = data.publicUrl
      }

      const payload = {
        user_id: userId,
        name: form.name.trim(),
        brand: form.brand.trim(),
        color: form.color.trim(),
        material: form.material.trim(),
        notes: form.notes.trim(),
        tags: form.tags,
        photo_url,
      }

      if (item?.id) {
        const { error } = await supabase.from('items').update(payload).eq('id', item.id)
        if (error) throw error
        showToast('Piece updated.')
      } else {
        const { error } = await supabase.from('items').insert(payload)
        if (error) throw error
        showToast('Piece added.')
      }
      onSaved()
    } catch (err) {
      setError(err.message || 'Could not save.')
      setBusy(false)
    }
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h2>{item ? 'Edit piece' : 'Add a piece'}</h2>
        {error && <div className="notice err">{error}</div>}
        <form onSubmit={save}>
          <div className="field">
            <label>Name</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Maroon Linen Shirt" />
          </div>
          <div className="row">
            <div className="field">
              <label>Brand</label>
              <input value={form.brand} onChange={e => set('brand', e.target.value)} />
            </div>
            <div className="field">
              <label>Color</label>
              <input value={form.color} onChange={e => set('color', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Material</label>
            <input value={form.material} onChange={e => set('material', e.target.value)} />
          </div>
          <div className="field">
            <label>Tags</label>
            <TagInput value={form.tags} onChange={t => set('tags', t)} suggestions={allTags} />
            <div className="hint">Press Enter or comma to add. Used for filters and the stylist.</div>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="field">
            <label>Photo</label>
            <div className="photo-input">
              <div className="photo-preview" style={preview ? { backgroundImage: `url(${preview})` } : {}} />
              <input type="file" accept="image/*" onChange={pickFile} />
            </div>
            <div className="hint">Large photos are resized automatically before upload.</div>

            {identifying && (
              <div className="ai-identifying"><span className="spinner" /> Identifying…</div>
            )}
            {suggestions && (suggestions.category || suggestions.color || suggestions.material) && (
              <div className="ai-suggestions">
                <div className="ai-suggestions-label">Suggested — tap to apply</div>
                <div className="chips">
                  {suggestions.category && (
                    <button type="button" className="chip" onClick={acceptCategory}>
                      + {suggestions.category}
                    </button>
                  )}
                  {suggestions.color && (
                    <button type="button" className="chip" onClick={acceptColor}>
                      Color: {suggestions.color}
                    </button>
                  )}
                  {suggestions.material && (
                    <button type="button" className="chip" onClick={acceptMaterial}>
                      Material: {suggestions.material}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="sheet-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save piece'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
