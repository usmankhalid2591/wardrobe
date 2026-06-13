import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ItemList({ items, loading, onEdit, onChanged }) {
  const [q, setQ] = useState('')

  const filtered = items.filter(it => {
    if (!q.trim()) return true
    const hay = [it.name, it.brand, it.color, it.material, (it.tags || []).join(' ')]
      .join(' ').toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  async function remove(it) {
    if (!confirm(`Delete "${it.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('items').delete().eq('id', it.id)
    if (error) { alert(error.message); return }
    onChanged()
  }

  if (loading) {
    return <div className="loading-row"><span className="spinner" /> Loading your wardrobe…</div>
  }

  return (
    <>
      <div className="toolbar">
        <input className="search" placeholder="Search name, brand, color, tag…"
          value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="count">{filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'}</div>

      {filtered.length === 0 ? (
        <div className="empty">
          <h3>{items.length === 0 ? 'Nothing logged yet' : 'No matches'}</h3>
          <p>{items.length === 0 ? 'Add your first piece to begin the ledger.' : 'Try a different search.'}</p>
        </div>
      ) : (
        <div className="grid">
          {filtered.map(it => (
            <div className="card" key={it.id}>
              <div className="card-photo"
                style={it.photo_url ? { backgroundImage: `url(${it.photo_url})` } : {}}>
                {!it.photo_url && 'NO IMAGE'}
              </div>
              <div className="card-body">
                <div className="card-name">{it.name}</div>
                <div className="card-meta">
                  {it.brand || '—'}
                  {it.color && <><span className="dot">·</span>{it.color}</>}
                  {it.material && <><span className="dot">·</span>{it.material}</>}
                </div>
                {(it.tags || []).length > 0 && (
                  <div className="tags">
                    {it.tags.map((t, i) => <span className="tag" key={i}>{t}</span>)}
                  </div>
                )}
              </div>
              <div className="card-actions">
                <button title="Edit" onClick={() => onEdit(it)}>✎</button>
                <button title="Delete" onClick={() => remove(it)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
