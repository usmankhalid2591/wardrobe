// Netlify Function: POST /.netlify/functions/generate-packing
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

  let destination, days, wardrobe
  try {
    const body = JSON.parse(event.body || '{}')
    destination = body.destination
    days = Number(body.days)
    wardrobe = body.wardrobe
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  if (!destination || !days || days < 1 || !Array.isArray(wardrobe) || wardrobe.length === 0) {
    return { statusCode: 400, body: 'Need a trip description, a number of days, and a non-empty wardrobe.' }
  }
  days = Math.min(Math.max(Math.round(days), 1), 14)

  const inventory = wardrobe.map((it, i) => {
    const bits = [it.name]
    if (it.brand) bits.push(`brand: ${it.brand}`)
    if (it.color) bits.push(`color: ${it.color}`)
    if (it.material) bits.push(`material: ${it.material}`)
    if (it.tags && it.tags.length) bits.push(`tags: ${it.tags.join(', ')}`)
    if (it.notes) bits.push(`notes: ${it.notes}`)
    return `${i + 1}. ${bits.join(' | ')}`
  }).join('\n')

  const prompt = `You are a precise menswear stylist with a refined, old-money sensibility, helping a \
client pack for a trip: "${destination}", lasting ${days} day${days === 1 ? '' : 's'}.

You may ONLY use pieces from this exact wardrobe. Never invent items not listed. \
Use the item names exactly as written.

WARDROBE:
${inventory}

For EACH day of the trip, decide which 3-5 clothing slots/roles are needed (e.g. "Trousers", \
"Shirt", "Outerwear", "Footwear", "Accessory" — pick roles that fit the day's activities and \
the destination's likely weather/season, skipping roles that don't apply).

For each slot on each day, list every wardrobe item that would be a good fit, ordered with the \
single best choice first, then good alternatives. Include at least 1 and at most 6 items per \
slot. Aim for sensible variety across days (don't repeat the exact same outfit every day) while \
reusing versatile pieces like trousers or outerwear where that's realistic for packing light.

Also suggest a short list of non-clothing essentials worth packing for this trip (e.g. \
"sunglasses", "umbrella", "phone charger") — keep this list brief and relevant to the \
destination/activities, not generic.

Respond with ONLY valid JSON, no markdown, no backticks, in this exact shape:
{
  "days": [
    {
      "label": "<short label, e.g. 'Day 1 — arrival'>",
      "slots": [
        {
          "role": "<slot name, e.g. Trousers>",
          "items": [
            { "item": "<exact name from wardrobe>", "why": "<one short sentence on why this works>" }
          ]
        }
      ]
    }
  ],
  "extras": ["<non-clothing essential>", "..."],
  "note": "<one or two sentences of overall packing advice for this trip>"
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
