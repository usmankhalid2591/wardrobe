import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast.jsx'
import CategoryIcon from '../lib/categoryIcon'
import ConfirmDialog from './ConfirmDialog'

function todayStr() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatEntryDate(dateStr) {
  // dateStr is YYYY-MM-DD; parse as local date, not UTC.
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  if (isToday) return 'Today'
  if (isYesterday) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function WearLog({ items, userId, onChanged }) {
  const showToast = useToast()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [date, setDate] = useState(todayStr())
  const [selected, setSelected] = useState([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('wear_log').select('*').order('worn_on', { ascending: false }).order('created_at', { ascending: false })
    if (error) {
      setError(error.message || 'Could not load your log.')
    } else {
      setEntries(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function toggle(id) {
    setSelected(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id])
  }

  async function saveEntry() {
    if (selected.length === 0) return
    setBusy(true)
    const pieces = selected.map(id => {
      const it = items.find(x => x.id === id)
      return { id, name: it?.name || 'Item' }
    })
    const { error } = await supabase.from('wear_log').insert({
      user_id: userId,
      worn_on: date,
      items: pieces,
      note: note.trim(),
    })
    if (error) {
      setBusy(false)
      showToast(error.message || 'Could not save entry.', 'err')
      return
    }
    // Bump wear stats for each logged item.
    const wornAt = new Date(`${date}T12:00:00`).toISOString()
    await Promise.all(selected.map(id => {
      const it = items.find(x => x.id === id)
      const nextCount = (it?.wear_count || 0) + 1
      return supabase.from('items').update({ wear_count: nextCount, last_worn_at: wornAt }).eq('id', id)
    }))
    setBusy(false)
    setSelected([])
    setNote('')
    showToast('Logged.')
    load()
    onChanged()
  }

  async function confirmDelete() {
    if (!confirming) return
    setDeleting(true)
    const { error } = await supabase.from('wear_log').delete().eq('id', confirming.id)
    setDeleting(false)
    if (error) {
      showToast(error.message || 'Could not remove entry.', 'err')
      return
    }
    setEntries(e => e.filter(x => x.id !== confirming.id))
    setConfirming(null)
    showToast('Entry removed.')
  }

  return (
    <>
      <div className="log-new">
        <h3>Log what you wore</h3>
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Items worn</label>
          {items.length === 0 ? (
            <div className="hint">Add some pieces to your wardrobe first.</div>
          ) : (
            <div className="log-picker-grid">
              {items.map(it => (
                <button type="button" key={it.id}
                  className={`log-picker-tile ${selected.includes(it.id) ? 'selected' : ''}`}
                  onClick={() => toggle(it.id)}>
                  <div className="log-picker-photo"
                    style={it.photo_url ? { backgroundImage: `url(${it.photo_url})` } : {}}>
                    {!it.photo_url && <CategoryIcon tags={it.tags} className="tile-icon" />}
                    {selected.includes(it.id) && <span className="log-picker-check">✓</span>}
                  </div>
                  <span className="log-picker-name">{it.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="field">
          <label>Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Where'd you wear this?" />
        </div>
        <button type="button" className="btn" disabled={busy || selected.length === 0} onClick={saveEntry}>
          {busy ? 'Saving…' : `Save entry${selected.length ? ` (${selected.length})` : ''}`}
        </button>
      </div>

      <div className="log-history">
        <h3>History</h3>
        {loading ? (
          <div className="loading-row"><span className="spinner" /> Loading…</div>
        ) : error ? (
          <div className="notice err load-error">
            <span>{error}</span>
            <button className="btn ghost" onClick={load}>Retry</button>
          </div>
        ) : entries.length === 0 ? (
          <div className="empty">
            <h3>Nothing logged yet</h3>
            <p>Save your first entry above to start building a history.</p>
          </div>
        ) : (
          entries.map(e => (
            <div className="log-entry" key={e.id}>
              <div className="log-entry-head">
                <div className="log-entry-date">{formatEntryDate(e.worn_on)}</div>
                <button type="button" className="btn ghost" onClick={() => setConfirming(e)}>Remove</button>
              </div>
              <div className="tags">
                {(e.items || []).map((p, i) => <span className="tag" key={i}>{p.name}</span>)}
              </div>
              {e.note && <p className="detail-notes">{e.note}</p>}
            </div>
          ))
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title="Remove this entry?"
          message="This log entry will be removed. Wear counts already logged from it won't be reversed."
          confirmLabel="Remove"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  )
}
