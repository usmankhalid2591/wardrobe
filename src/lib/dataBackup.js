// JSON export/import of a user's wardrobe data: items, saved outfits, wear
// log, and settings. Used by the Settings page for backup/restore.

import { supabase } from './supabase'

const VERSION = 1

export async function exportData(userId) {
  const [itemsRes, outfitsRes, wearLogRes, settingsRes] = await Promise.all([
    supabase.from('items').select('*').eq('user_id', userId),
    supabase.from('saved_outfits').select('*').eq('user_id', userId),
    supabase.from('wear_log').select('*').eq('user_id', userId),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  ])

  for (const r of [itemsRes, outfitsRes, wearLogRes]) {
    if (r.error) throw r.error
  }

  const strip = rows => (rows || []).map(({ id, user_id, ...rest }) => rest)
  const settings = settingsRes.data
    ? (({ user_id, ...rest }) => rest)(settingsRes.data)
    : null

  const payload = {
    app: 'the-wardrobe',
    version: VERSION,
    exported_at: new Date().toISOString(),
    items: strip(itemsRes.data),
    saved_outfits: strip(outfitsRes.data),
    wear_log: strip(wearLogRes.data),
    settings,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `wardrobe-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function importData(userId, jsonText) {
  let data
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (!data || typeof data !== 'object') throw new Error('Unrecognized backup file.')

  const counts = { items: 0, saved_outfits: 0, wear_log: 0, settings: false }

  const prep = rows => (rows || []).map(({ id, user_id, created_at, ...rest }) => ({ ...rest, user_id: userId }))

  if (Array.isArray(data.items) && data.items.length) {
    const rows = prep(data.items)
    const { error } = await supabase.from('items').insert(rows)
    if (error) throw error
    counts.items = rows.length
  }

  if (Array.isArray(data.saved_outfits) && data.saved_outfits.length) {
    const rows = prep(data.saved_outfits)
    const { error } = await supabase.from('saved_outfits').insert(rows)
    if (error) throw error
    counts.saved_outfits = rows.length
  }

  if (Array.isArray(data.wear_log) && data.wear_log.length) {
    const rows = prep(data.wear_log)
    const { error } = await supabase.from('wear_log').insert(rows)
    if (error) throw error
    counts.wear_log = rows.length
  }

  if (data.settings && typeof data.settings === 'object') {
    const { user_id, ...settingsPatch } = data.settings
    const { error } = await supabase.from('user_settings')
      .upsert({ user_id: userId, ...settingsPatch, updated_at: new Date().toISOString() })
    if (error) throw error
    counts.settings = true
  }

  return counts
}
