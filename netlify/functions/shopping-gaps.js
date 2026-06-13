// Netlify Function: POST /.netlify/functions/shopping-gaps
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

  let wardrobe
  try {
    const body = JSON.parse(event.body || '{}')
    wardrobe = body.wardrobe
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  if (!Array.isArray(wardrobe) || wardrobe.length === 0) {
    return { statusCode: 400, body: 'Need a non-empty wardrobe.' }
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

  const prompt = `You are a precise menswear stylist and wardrobe consultant with a refined, \
old-money sensibility, reviewing a client's existing wardrobe to spot gaps worth filling.

CURRENT WARDROBE (${wardrobe.length} pieces):
${inventory}

Look at the wardrobe as a whole: categories present (from tags), color balance, formality \
range, and versatility. Identify 3-5 genuine gaps — things missing or under-represented that \
would meaningfully expand the number of outfits this wardrobe can produce, or that are needed \
to round out key categories (e.g. no formal shoes, very few bottoms relative to tops, no \
outerwear, everything is one color family, no basics like a plain white shirt). Do not suggest \
things the client clearly already has plenty of.

For each gap, give a short title, a one-sentence reason grounded in what's actually in (or \
missing from) the wardrobe above, and 2-4 concrete examples of pieces that would fill it \
(specific enough to shop for, e.g. "charcoal wool trousers" or "brown leather Chelsea boots").

Respond with ONLY valid JSON, no markdown, no backticks, in this exact shape:
{
  "gaps": [
    {
      "title": "<short gap name, e.g. 'Formal footwear'>",
      "reason": "<one sentence grounded in the wardrobe above>",
      "suggestions": ["<specific piece to shop for>", "..."]
    }
  ],
  "note": "<one or two sentences of overall guidance, e.g. what to prioritize first>"
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
