// Netlify Function: POST /.netlify/functions/find-pairings
// Keeps the Gemini API key server-side. Never exposed to the browser.

const MODEL = 'gemini-flash-latest'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return { statusCode: 500, body: 'Server missing GEMINI_API_KEY' }
  }

  let anchor, wardrobe
  try {
    const body = JSON.parse(event.body || '{}')
    anchor = body.anchor
    wardrobe = body.wardrobe
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  if (!anchor?.name || !Array.isArray(wardrobe) || wardrobe.length === 0) {
    return { statusCode: 400, body: 'Need an anchor item and a non-empty wardrobe.' }
  }

  const describe = it => {
    const bits = [it.name]
    if (it.brand) bits.push(`brand: ${it.brand}`)
    if (it.color) bits.push(`color: ${it.color}`)
    if (it.material) bits.push(`material: ${it.material}`)
    if (it.tags && it.tags.length) bits.push(`tags: ${it.tags.join(', ')}`)
    if (it.notes) bits.push(`notes: ${it.notes}`)
    return bits.join(' | ')
  }

  const inventory = wardrobe.map((it, i) => `${i + 1}. ${describe(it)}`).join('\n')

  const prompt = `You are a precise menswear stylist with a refined, old-money sensibility. The \
client wants outfit ideas built around this specific piece from their wardrobe:

ANCHOR PIECE: ${describe(anchor)}

You may ONLY use pieces from this exact wardrobe (the anchor piece is included in the list \
below if it's currently in rotation). Never invent items not listed. Use the item names \
exactly as written.

WARDROBE:
${inventory}

Decide 3-5 clothing slots/roles for a complete outfit built around the anchor piece (e.g. \
"Trousers", "Shirt", "Outerwear", "Footwear", "Accessory" — pick roles that fit and skip roles \
that don't apply). The anchor piece MUST be placed in exactly one slot, and that slot's items \
list must contain ONLY the anchor piece (no alternatives).

For every OTHER slot, list wardrobe items that pair well with the anchor piece, ordered with \
the single best choice first, then good alternatives in descending order of fit. Include at \
least 1 and at most 6 items per slot. Consider color harmony, formality, and material.

Respond with ONLY valid JSON, no markdown, no backticks, in this exact shape:
{
  "slots": [
    {
      "role": "<slot name, e.g. Trousers>",
      "items": [
        { "item": "<exact name from wardrobe>", "why": "<one short sentence on why this works>" }
      ]
    }
  ],
  "note": "<one sentence on the overall styling idea>"
}`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return { statusCode: 502, body: `Gemini error: ${t}` }
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    }
  } catch (err) {
    return { statusCode: 500, body: `Failed to generate: ${err.message}` }
  }
}
