import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import CategoryIcon from '../lib/categoryIcon'
import ItemDetail from './ItemDetail'
import ConfirmDialog from './ConfirmDialog'

function storagePathFromUrl(url) {
  const marker = '/item-photos/'
  const idx = (url || '').indexOf(marker)
  return idx === -1 ? null : url.slice(idx + marker.length)
}

export default function ItemList({ items, loading, onEdit, onChanged }) {
  const [q, setQ] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [sort, setSort] = useState('newest')
  const [selected, setSelected] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const allTags = useMemo(() => {
    const set = new Set()
    items.forEach(it => (it.tags || []).forEach(t => set.add(t)))
    return [...set].sort()
  }, [items])

  function toggleTag(t) {
    setActiveTags(cur => cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t])
  }

  const filtered = useMemo(() => {
    let list = items.filter(it => {
      if (q.trim()) {
        const hay = [it.name, it.brand, it.color, it.material, (it.tags || []).join(' ')]
          .join(' ').toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      if (activeTags.length) {
        const tags = it.tags || []
        if (!activeTags.every(t => tags.includes(t))) return false
      }
      return true
    })

    if (sort === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    } else if (sort === 'category') {
      list = [...list].sort((a, b) => {
        const ca = (a.tags || [])[0] || ''
        const cb = (b.tags || [])[0] || ''
        return ca.localeCompare(cb) || a.name.localeCompare(b.name)
      })
    }
    return list
  }, [items, q, activeTags, sort])

  function openDetail(it) { setSelected(it) }
  function closeDetail() { setSelected(null) }

  function startEdit(it) {
    setSelected(null)
    onEdit(it)
  }

  function startDelete(it) {
    setSelected(null)
    setConfirming(it)
  }

  async function confirmDelete() {
    if (!confirming) return
    setDeleting(true)
    const { error } = await supabase.from('items').delete().eq('id', confirming.id)
    if (error) {
      setDeleting(false)
      alert(error.message)
      return
    }
    const path = storagePathFromUrl(confirming.photo_url)
    if (path) {
      await supabase.storage.from('item-photos').remove([path])
    }
    setDeleting(false)
    setConfirming(null)
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
        <select className="sort" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="category">By category</option>
        </select>
      </div>

      {allTags.length > 0 && (
        <div className="chip-row">
          {allTags.map(t => (
            <button key={t}
              className={`chip ${activeTags.includes(t) ? 'active' : ''}`}
              onClick={() => toggleTag(t)}>
              {t}
            </button>
          ))}
          {activeTags.length > 0 && (
            <button className="chip clear" onClick={() => setActiveTags([])}>Clear ×</button>
          )}
        </div>
      )}

      <div className="count">{filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'}</div>

      {filtered.length === 0 ? (
        <div className="empty">
          <h3>{items.length === 0 ? 'Nothing logged yet' : 'No matches'}</h3>
          <p>{items.length === 0 ? 'Add your first piece to begin the ledger.' : 'Try a different search or filter.'}</p>
        </div>
      ) : (
        <div className="photo-grid">
          {filtered.map(it => (
            <button className="tile" key={it.id} onClick={() => openDetail(it)}>
              <div className="tile-photo"
                style={it.photo_url ? { backgroundImage: `url(${it.photo_url})` } : {}}>
                {!it.photo_url && <CategoryIcon tags={it.tags} className="tile-icon" />}
              </div>
              <div className="tile-label">
                <div className="tile-name">{it.name}</div>
                <div className="tile-meta">
                  {[it.color, it.brand].filter(Boolean).join(' · ') || ' '}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ItemDetail item={selected} onClose={closeDetail} onEdit={startEdit} onDelete={startDelete} />
      )}

      {confirming && (
        <ConfirmDialog
          title="Delete this piece?"
          message={`"${confirming.name}" will be removed permanently, including its photo. This cannot be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  )
}
