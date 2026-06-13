import { useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react'
import { supabase } from '../lib/supabase'
import CategoryIcon from '../lib/categoryIcon'
import { useToast } from '../lib/toast.jsx'
import { statusInfo } from '../lib/status'
import ItemDetail from './ItemDetail'
import ConfirmDialog from './ConfirmDialog'

const FindPairings = lazy(() => import('./FindPairings'))

function storagePathFromUrl(url) {
  const marker = '/item-photos/'
  const idx = (url || '').indexOf(marker)
  return idx === -1 ? null : url.slice(idx + marker.length)
}

export default function ItemList({ items, loading, onEdit, onChanged, userId }) {
  const showToast = useToast()
  const [q, setQ] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [sort, setSort] = useState('newest')
  const [selected, setSelected] = useState(null)
  const [pairingsFor, setPairingsFor] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [wearing, setWearing] = useState(false)
  const [settingStatus, setSettingStatus] = useState(false)
  const [settingStorage, setSettingStorage] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (e.key !== '/') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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

  function openPairings(it) {
    setSelected(null)
    setPairingsFor(it)
  }

  function startDelete(it) {
    setSelected(null)
    setConfirming(it)
  }

  async function markWorn(it) {
    setWearing(true)
    const now = new Date().toISOString()
    const nextCount = (it.wear_count || 0) + 1
    const { error } = await supabase.from('items')
      .update({ last_worn_at: now, wear_count: nextCount })
      .eq('id', it.id)
    setWearing(false)
    if (error) {
      showToast(error.message || 'Could not log wear.', 'err')
      return
    }
    setSelected(s => s && s.id === it.id ? { ...s, last_worn_at: now, wear_count: nextCount } : s)
    showToast('Logged as worn today.')
    onChanged()
  }

  async function updateStatus(it, status) {
    setSettingStatus(true)
    const { error } = await supabase.from('items')
      .update({ status })
      .eq('id', it.id)
    setSettingStatus(false)
    if (error) {
      showToast(error.message || 'Could not update status.', 'err')
      return
    }
    setSelected(s => s && s.id === it.id ? { ...s, status } : s)
    showToast(`Marked as ${statusInfo(status).short.toLowerCase()}.`)
    onChanged()
  }

  async function updateStorage(it, in_storage) {
    setSettingStorage(true)
    const { error } = await supabase.from('items')
      .update({ in_storage })
      .eq('id', it.id)
    setSettingStorage(false)
    if (error) {
      showToast(error.message || 'Could not update storage.', 'err')
      return
    }
    setSelected(s => s && s.id === it.id ? { ...s, in_storage } : s)
    showToast(in_storage ? 'Moved to storage.' : 'Taken out of storage.')
    onChanged()
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
    showToast('Piece deleted.')
    onChanged()
  }

  if (loading) {
    return (
      <div className="photo-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="tile skeleton-tile" key={i}>
            <div className="tile-photo skeleton-shimmer" />
            <div className="tile-label">
              <div className="skeleton-line skeleton-shimmer" style={{ width: '70%' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '45%' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="toolbar">
        <input ref={searchRef} className="search" placeholder="Search name, brand, color, tag… (press /)"
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
                {it.status && it.status !== 'ready' && (
                  <span className={`tile-status status-${it.status}`}>{statusInfo(it.status).short}</span>
                )}
                {it.in_storage && (
                  <span className="tile-storage">Storage</span>
                )}
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
        <ItemDetail item={selected} onClose={closeDetail} onEdit={startEdit} onDelete={startDelete}
          onWear={markWorn} wearing={wearing} onStatus={updateStatus} settingStatus={settingStatus}
          onStorage={updateStorage} settingStorage={settingStorage} onPairings={openPairings} />
      )}

      {pairingsFor && (
        <Suspense fallback={null}>
          <FindPairings item={pairingsFor} items={items} userId={userId} onClose={() => setPairingsFor(null)} />
        </Suspense>
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
