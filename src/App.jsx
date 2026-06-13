import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import ItemList from './components/ItemList'
import ItemForm from './components/ItemForm'
import OutfitGenerator from './components/OutfitGenerator'

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [tab, setTab] = useState('wardrobe')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const { data, error } = await supabase
      .from('items').select('*').order('created_at', { ascending: false })
    if (!error) setItems(data || [])
    setLoading(false)
  }, [session])

  useEffect(() => { if (session) load() }, [session, load])

  function openAdd() { setEditing(null); setShowForm(true) }
  function openEdit(it) { setEditing(it); setShowForm(true) }
  function onSaved() { setShowForm(false); setEditing(null); load() }

  if (!authReady) return null
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
      </nav>

      {tab === 'wardrobe' && (
        <>
          <div className="toolbar">
            <button className="btn" style={{ marginLeft: 'auto' }} onClick={openAdd}>+ Add piece</button>
          </div>
          <ItemList items={items} loading={loading} onEdit={openEdit} onChanged={load} />
        </>
      )}

      {tab === 'stylist' && <OutfitGenerator items={items} />}

      {showForm && (
        <ItemForm
          item={editing}
          userId={session.user.id}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
