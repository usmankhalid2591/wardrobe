import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

export const DEFAULT_SETTINGS = {
  currency: 'PKR',
  theme: 'light',
  ai_identify: true,
  ai_stylist: true,
  ai_packing: true,
  ai_pairings: true,
  ai_shopping_gaps: true,
  reminders_enabled: true,
  reminder_days: 14,
}

const LOCAL_KEY = 'wardrobe.settings'

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function writeLocal(settings) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(settings)) } catch { /* ignore */ }
}

const SettingsContext = createContext(null)

// Wrap the signed-in app with <SettingsProvider userId={...}>. Settings are
// cached in localStorage for instant load and synced to Supabase per-user.
export function SettingsProvider({ userId, children }) {
  const [settings, setSettings] = useState(readLocal)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme === 'dark' ? 'dark' : 'light'
  }, [settings.theme])

  useEffect(() => {
    if (!userId) { setLoaded(true); return }
    let active = true
    ;(async () => {
      const { data, error } = await supabase
        .from('user_settings').select('*').eq('user_id', userId).maybeSingle()
      if (!active) return
      if (data) {
        const merged = { ...DEFAULT_SETTINGS, ...data }
        setSettings(merged)
        writeLocal(merged)
      } else if (!error) {
        const seed = { user_id: userId, ...DEFAULT_SETTINGS }
        await supabase.from('user_settings').insert(seed)
      }
      setLoaded(true)
    })()
    return () => { active = false }
  }, [userId])

  const update = useCallback(async (patch) => {
    setSettings(s => {
      const next = { ...s, ...patch }
      writeLocal(next)
      return next
    })
    if (userId) {
      await supabase.from('user_settings')
        .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() })
    }
  }, [userId])

  return (
    <SettingsContext.Provider value={{ settings, update, loaded }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  return ctx || { settings: DEFAULT_SETTINGS, update: async () => {}, loaded: true }
}
