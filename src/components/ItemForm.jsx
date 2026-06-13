import { useState } from 'react'
import { supabase } from '../lib/supabase'

const blank = { name: '', brand: '', color: '', material: '', notes: '', tags: '', photo_url: '' }

export default function ItemForm({ item, userId, onClose, onSaved }) {
  const [form, setForm] = useState(item
    ? { ...item, tags: (item.tags || []).join(', ') }
    : blank)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(item?.photo_url || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function save(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      let photo_url = form.photo_url || ''
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${userId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('item-photos').upload(path, file, { upsert: true })
        if (upErr) throw upErr
        const { data } = supabase.storage.from('item-photos').getPublicUrl(path)
        photo_url = data.publicUrl
      }

      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      const payload = {
        user_id: userId,
        name: form.name.trim(),
        brand: form.brand.trim(),
        color: form.color.trim(),
        material: form.material.trim(),
        notes: form.notes.trim(),
        tags,
        photo_url,
      }

      if (item?.id) {
        const { error } = await supabase.from('items').update(payload).eq('id', item.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('items').insert(payload)
        if (error) throw error
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
            <input value={form.tags} onChange={e => set('tags', e.target.value)}
              placeholder="casual, shirt, summer" />
            <div className="hint">Comma-separated. Used by the stylist to find pieces.</div>
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
