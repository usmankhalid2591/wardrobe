// Netlify Function: POST /.netlify/functions/generate-outfit
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

  let occasion, wardrobe
  try {
    const body = JSON.parse(event.body || '{}')
    occasion = body.occasion
    wardrobe = body.wardrobe
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  if (!occasion || !Array.isArray(wardrobe) || wardrobe.length === 0) {
    return { statusCode: 400, body: 'Need an occasion and a non-empty wardrobe.' }
  }

  const inventory = wardrobe.map((it, i) => {
    const bits = [it.name]
    if (it.brand) bits.push(`brand: ${it.brand}`)
    if (it.color) bits.push(`color: ${it.color}`)
    if (it.material) bits.push(`material: ${it.material}`)
    if (it.tags && it.tags.length) bits.push(`tags: ${it.tags.join(', ')}`)
    if (it.notes) bits.push(`notes: ${it.notes}`)
    return `${i + 1}. ${bits.join(' | ')}`
  }).join('\n')

  const prompt = `You are a precise menswear stylist with a refined, old-money sensibility. \
The client is dressing for: "${occasion}".

You may ONLY use pieces from this exact wardrobe. Never invent items not listed. \
Use the item names exactly as written.

WARDROBE:
${inventory}

Build one cohesive outfit. Consider color harmony, formality, material and the weather/setting \
implied by the occasion. Choose a top, bottom, footwear, and layering/accessories where appropriate.

Respond with ONLY valid JSON, no markdown, no backticks, in this exact shape:
{
  "pieces": [
    { "role": "Shirt", "item": "<exact name from wardrobe>", "why": "<one short sentence>" }
  ],
  "note": "<one sentence on why the overall look works for the occasion>"
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
