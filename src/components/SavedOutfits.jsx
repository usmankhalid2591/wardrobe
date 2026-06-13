import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast.jsx'
import CategoryIcon from '../lib/categoryIcon'
import ConfirmDialog from './ConfirmDialog'

function findItem(items, name) {
  if (!name) return null
  const norm = s => s.trim().toLowerCase()
  const target = norm(name)
  return items.find(it => norm(it.name) === target)
    || items.find(it => norm(it.name).includes(target) || target.includes(norm(it.name)))
    || null
}

export default function SavedOutfits({ items }) {
  const showToast = useToast()
  const [outfits, setOutfits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('saved_outfits').select('*').order('created_at', { ascending: false })
    if (error) {
      setError(error.message || 'Could not load saved outfits.')
    } else {
      setOutfits(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function confirmDelete() {
    if (!confirming) return
    setDeleting(true)
    const { error } = await supabase.from('saved_outfits').delete().eq('id', confirming.id)
    setDeleting(false)
    if (error) {
      showToast(error.message || 'Could not delete.', 'err')
      return
    }
    setOutfits(o => o.filter(x => x.id !== confirming.id))
    setConfirming(null)
    showToast('Outfit removed.')
  }

  if (loading) {
    return <div className="loading-row"><span className="spinner" /> Loading saved outfits…</div>
  }

  if (error) {
    return (
      <div className="notice err load-error">
        <span>{error}</span>
        <button className="btn ghost" onClick={load}>Retry</button>
      </div>
    )
  }

  if (outfits.length === 0) {
    return (
      <div className="empty">
        <h3>Nothing saved yet</h3>
        <p>Generate an outfit in the Stylist tab and tap "Save outfit" to keep it here.</p>
      </div>
    )
  }

  return (
    <>
      <div className="count">{outfits.length} saved {outfits.length === 1 ? 'outfit' : 'outfits'}</div>
      <div className="saved-list">
        {outfits.map(o => (
          <div className="outfit saved-outfit" key={o.id}>
            <div className="saved-head">
              <div>
                <div className="occasion">{o.occasion}</div>
                <div className="saved-date">{new Date(o.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
              <button type="button" className="btn ghost" onClick={() => setConfirming(o)}>Remove</button>
            </div>
            {(o.pieces || []).map((p, i) => {
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
          </div>
        ))}
      </div>

      {confirming && (
        <ConfirmDialog
          title="Remove this outfit?"
          message={`"${confirming.occasion}" will be removed from your saved outfits.`}
          confirmLabel="Remove"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  )
}
