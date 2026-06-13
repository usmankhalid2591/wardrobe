import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage, blobToDataURL } from '../lib/compressImage'
import { useToast } from '../lib/toast.jsx'
import { useEscClose } from '../lib/useEscClose'
import TagInput from './TagInput'

const blank = { name: '', brand: '', color: '', material: '', notes: '', tags: [], photo_url: '', price: '', in_storage: false }

// Looks for existing pieces that share a category tag and a similar color —
// a lightweight nudge to avoid logging the same item twice from a photo.
function findDuplicates(items, { category, color, excludeId }) {
  const col = (color || '').trim().toLowerCase()
  const cat = (category || '').trim().toLowerCase()
  if (!col || !cat) return []
  return (items || []).filter(it => {
    if (it.id === excludeId) return false
    const tags = (it.tags || []).map(t => t.toLowerCase())
    if (!tags.includes(cat)) return false
    const itColor = (it.color || '').toLowerCase()
    if (!itColor) return false
    return itColor.includes(col) || col.includes(itColor)
  }).slice(0, 4)
}

export default function ItemForm({ item, userId, allTags, items, onClose, onSaved }) {
  const showToast = useToast()
  const [form, setForm] = useState(item
    ? { ...item, tags: item.tags || [], price: item.price ?? '', in_storage: !!item.in_storage }
    : blank)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(item?.photo_url || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [identifying, setIdentifying] = useState(false)
  const [duplicates, setDuplicates] = useState([])
  // 'choice' (new items only) -> 'ai-photo' -> 'form', or straight to 'form'
  const [mode, setMode] = useState(item ? 'form' : 'choice')
  // In-app camera state: null = starting up, true = unavailable (fall back to file picker), false = live
  const [cameraError, setCameraError] = useState(null)
  const [captured, setCaptured] = useState(null) // { blob, url }
  const [facing, setFacing] = useState('environment')
  const identifyId = useRef(0)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  async function startCamera(face) {
    stopCamera()
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(true)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: face },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCameraError(false)
    } catch {
      setCameraError(true)
    }
  }

  // Start/stop the live camera as we enter/leave the ai-photo step.
  useEffect(() => {
    if (mode === 'ai-photo' && !captured) {
      startCamera(facing)
    } else {
      stopCamera()
    }
  }, [mode, captured])

  // Always release the camera if the form unmounts.
  useEffect(() => () => stopCamera(), [])

  function flipCamera() {
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    startCamera(next)
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (!blob) return
      setCaptured({ blob, url: URL.createObjectURL(blob) })
    }, 'image/jpeg', 0.92)
  }

  function retake() {
    setCaptured(c => {
      if (c) URL.revokeObjectURL(c.url)
      return null
    })
  }

  async function identifyPhoto(blob) {
    const id = ++identifyId.current
    setFile(blob)
    setPreview(URL.createObjectURL(blob))
    setIdentifying(true)
    try {
      const small = await compressImage(blob, { maxDim: 768, quality: 0.7 })
      const dataUrl = await blobToDataURL(small)
      const res = await fetch('/.netlify/functions/identify-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, mimeType: small.type || 'image/jpeg' }),
      })
      if (id !== identifyId.current) return
      if (res.ok) {
        const data = await res.json()
        setForm(f0 => {
          const tags = data.category && !f0.tags.includes(data.category)
            ? [...f0.tags, data.category]
            : f0.tags
          return {
            ...f0,
            color: data.color || f0.color,
            material: data.material || f0.material,
            tags,
          }
        })
        setDuplicates(findDuplicates(items, {
          category: data.category,
          color: data.color,
          excludeId: item?.id,
        }))
      }
    } catch {
      // Identification is a nice-to-have — fall through to the form either way.
    } finally {
      if (id === identifyId.current) {
        setIdentifying(false)
        setMode('form')
      }
    }
  }

  function useCapturedPhoto() {
    if (!captured) return
    identifyPhoto(captured.blob)
  }

  function pickAiPhoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    identifyPhoto(f)
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
        price: form.price === '' || form.price === null ? null : Number(form.price),
        in_storage: !!form.in_storage,
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

  if (mode === 'choice') {
    return (
      <div className="scrim" onClick={onClose}>
        <div className="sheet" onClick={e => e.stopPropagation()}>
          <h2>Add a piece</h2>
          <p className="hint">How would you like to add this?</p>
          <div className="add-choice">
            <button type="button" className="choice-btn" onClick={() => setMode('ai-photo')}>
              <span className="choice-title">Take a photo — let AI fill it in</span>
              <span className="choice-sub">Snap or choose a photo and I'll suggest the color, material, and category. You'll review everything before saving.</span>
            </button>
            <button type="button" className="choice-btn" onClick={() => setMode('form')}>
              <span className="choice-title">Enter details manually</span>
              <span className="choice-sub">Fill in the details yourself, and add a photo if you'd like.</span>
            </button>
          </div>
          <div className="sheet-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'ai-photo') {
    return (
      <div className="scrim" onClick={onClose}>
        <div className="sheet" onClick={e => e.stopPropagation()}>
          <h2>Take a photo</h2>
          <p className="hint">I'll suggest the color, material, and category from the photo — you can review and edit everything on the next screen.</p>

          {cameraError === false && !captured && (
            <div className="camera-view">
              <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
              <button type="button" className="camera-flip" onClick={flipCamera} aria-label="Switch camera">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </button>
              <button type="button" className="camera-shutter" onClick={capturePhoto} aria-label="Take photo" />
            </div>
          )}

          {cameraError === false && captured && (
            <div className="camera-view">
              <img src={captured.url} className="camera-video" alt="Captured" />
            </div>
          )}

          {captured && (
            <div className="camera-actions">
              <button type="button" className="btn ghost" onClick={retake} disabled={identifying}>Retake</button>
              <button type="button" className="btn" onClick={useCapturedPhoto} disabled={identifying}>
                {identifying ? 'Identifying…' : 'Use this photo'}
              </button>
            </div>
          )}

          {cameraError === true && (
            <>
              <div className="photo-input">
                <div className="photo-preview" style={preview ? { backgroundImage: `url(${preview})` } : {}} />
                <input type="file" accept="image/*" capture="environment" onChange={pickAiPhoto} disabled={identifying} />
              </div>
              <label className="photo-alt-link">
                or choose an existing photo
                <input type="file" accept="image/*" onChange={pickAiPhoto} disabled={identifying} />
              </label>
            </>
          )}

          {cameraError === null && (
            <div className="loading-row"><span className="spinner" /> Starting camera…</div>
          )}

          {identifying && (
            <div className="ai-identifying"><span className="spinner" /> Identifying…</div>
          )}

          <div className="sheet-actions">
            <button type="button" className="btn ghost" onClick={onClose} disabled={identifying}>Cancel</button>
            <button type="button" className="btn ghost" onClick={() => setMode('form')} disabled={identifying}>
              Skip, enter manually
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h2>{item ? 'Edit piece' : 'Add a piece'}</h2>
        {error && <div className="notice err">{error}</div>}
        {duplicates.length > 0 && (
          <div className="notice warn dup-notice">
            <div>You may already have something like this:</div>
            <ul className="dup-list">
              {duplicates.map(d => (
                <li key={d.id}>{d.name}{d.color ? ` — ${d.color}` : ''}{d.brand ? ` (${d.brand})` : ''}</li>
              ))}
            </ul>
            <button type="button" className="btn ghost dup-dismiss" onClick={() => setDuplicates([])}>
              It's different, dismiss
            </button>
          </div>
        )}
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
            <label>Price (Rs)</label>
            <input type="number" min="0" inputMode="decimal" value={form.price}
              onChange={e => set('price', e.target.value)} placeholder="Optional — for cost-per-wear" />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={!!form.in_storage}
              onChange={e => set('in_storage', e.target.checked)} />
            In seasonal storage (hidden from the Stylist)
          </label>
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
