import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import ResetPassword from './components/ResetPassword'
import ItemList from './components/ItemList'
import ItemForm from './components/ItemForm'
import OutfitGenerator from './components/OutfitGenerator'
import SavedOutfits from './components/SavedOutfits'
import WearLog from './components/WearLog'
import PackingList from './components/PackingList'
import ShoppingGaps from './components/ShoppingGaps'
import Insights from './components/Insights'

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [tab, setTab] = useState('wardrobe')
  const [moreTab, setMoreTab] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('items').select('*').order('created_at', { ascending: false })
    if (error) {
      setLoadError(error.message || 'Could not load your wardrobe.')
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }, [session])

  useEffect(() => { if (session) load() }, [session, load])

  const allTags = useMemo(() => {
    const set = new Set()
    items.forEach(it => (it.tags || []).forEach(t => set.add(t)))
    return [...set].sort()
  }, [items])

  function openAdd() { setEditing(null); setShowForm(true) }
  function openEdit(it) { setEditing(it); setShowForm(true) }
  function onSaved() { setShowForm(false); setEditing(null); load() }

  if (!authReady) return null
  if (recovery) return <ResetPassword onDone={() => setRecovery(false)} />
  if (!session) return <Auth />

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>The Wardrobe</h1>
          <div className="sub">{items.length} pieces on record</div>
        </div>
        <button className="signout" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>

      <nav className="tabs">
        <button className={`tab ${tab === 'wardrobe' ? 'active' : ''}`} onClick={() => setTab('wardrobe')}>
          Wardrobe
        </button>
        <button className={`tab ${tab === 'stylist' ? 'active' : ''}`} onClick={() => setTab('stylist')}>
          Stylist
        </button>
        <button className={`tab ${tab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>
          Saved
        </button>
        <button className={`tab ${tab === 'more' ? 'active' : ''}`} onClick={() => setTab('more')}>
          More
        </button>
      </nav>

      {tab === 'wardrobe' && (
        <>
          <div className="toolbar">
            <button className="btn" style={{ marginLeft: 'auto' }} onClick={openAdd}>+ Add piece</button>
          </div>

          {loadError && (
            <div className="notice err load-error">
              <span>{loadError}</span>
              <button className="btn ghost" onClick={load}>Retry</button>
            </div>
          )}

          {!loadError && <ItemList items={items} loading={loading} onEdit={openEdit} onChanged={load} userId={session.user.id} />}
        </>
      )}

      {tab === 'stylist' && (
        <div className="narrow">
          {loadError ? (
            <div className="notice err load-error">
              <span>{loadError}</span>
              <button className="btn ghost" onClick={load}>Retry</button>
            </div>
          ) : (
            <OutfitGenerator items={items} userId={session.user.id} />
          )}
        </div>
      )}

      {tab === 'saved' && (
        <div className="narrow">
          <SavedOutfits items={items} />
        </div>
      )}

      {tab === 'more' && (
        <div className="narrow">
          {loadError ? (
            <div className="notice err load-error">
              <span>{loadError}</span>
              <button className="btn ghost" onClick={load}>Retry</button>
            </div>
          ) : moreTab === null ? (
            <div className="more-grid">
              <button className="more-card" onClick={() => setMoreTab('packing')}>
                <span className="choice-title">Packing</span>
                <span className="choice-sub">Plan outfits for a trip, day by day.</span>
              </button>
              <button className="more-card" onClick={() => setMoreTab('insights')}>
                <span className="choice-title">Insights</span>
                <span className="choice-sub">Wear stats, value, and wardrobe breakdown.</span>
              </button>
              <button className="more-card" onClick={() => setMoreTab('shopping')}>
                <span className="choice-title">Shopping</span>
                <span className="choice-sub">AI suggestions for what to add next.</span>
              </button>
              <button className="more-card" onClick={() => setMoreTab('log')}>
                <span className="choice-title">Log</span>
                <span className="choice-sub">Record what you wore and browse history.</span>
              </button>
            </div>
          ) : (
            <>
              <button className="more-back" onClick={() => setMoreTab(null)}>&larr; More</button>
              {moreTab === 'packing' && <PackingList items={items} />}
              {moreTab === 'insights' && <Insights items={items} />}
              {moreTab === 'shopping' && <ShoppingGaps items={items} />}
              {moreTab === 'log' && <WearLog items={items} userId={session.user.id} onChanged={load} />}
            </>
          )}
        </div>
      )}

      {showForm && (
        <ItemForm
          item={editing}
          userId={session.user.id}
          allTags={allTags}
          items={items}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
