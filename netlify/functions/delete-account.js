// Netlify Function: POST /.netlify/functions/delete-account
// Permanently deletes a user's account and all associated data.
// Requires the SUPABASE_SERVICE_ROLE_KEY env var (server-side only, never
// exposed to the browser) in addition to the existing SUPABASE_URL.

import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return { statusCode: 500, body: 'Server missing Supabase service credentials' }
  }

  let token
  try {
    const body = JSON.parse(event.body || '{}')
    token = body.token
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }
  if (!token) return { statusCode: 401, body: 'Missing auth token' }

  const admin = createClient(supabaseUrl, serviceKey)

  // Verify the token belongs to a real, currently-signed-in user before
  // touching anything.
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return { statusCode: 401, body: 'Invalid session' }
  }
  const userId = userData.user.id

  try {
    // Remove uploaded photos.
    const { data: files } = await admin.storage.from('item-photos').list(userId)
    if (files && files.length) {
      const paths = files.map(f => `${userId}/${f.name}`)
      await admin.storage.from('item-photos').remove(paths)
    }

    // Delete data rows (order doesn't matter much, but go child-first).
    await admin.from('wear_log').delete().eq('user_id', userId)
    await admin.from('saved_outfits').delete().eq('user_id', userId)
    await admin.from('items').delete().eq('user_id', userId)
    await admin.from('user_settings').delete().eq('user_id', userId)

    // Finally, remove the auth user itself.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) throw delErr

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    return { statusCode: 500, body: `Failed to delete account: ${err.message}` }
  }
}
