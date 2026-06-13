// Netlify Function: POST /.netlify/functions/identify-item
// Keeps the Gemini API key server-side. Takes a base64 photo of a clothing
// item and returns a best-guess category tag, color, and material.

const MODEL = 'gemini-flash-latest'

// Category vocabulary kept in sync with src/lib/categoryIcon.jsx so a
// suggested tag maps to a sensible icon/grouping.
const CATEGORIES = [
  'Shirt', 'Polo', 'T-Shirt', 'Henley',
  'Trousers', 'Jeans', 'Loungewear',
  'Jacket', 'Blazer', 'Suit', 'Traditional',
  'Footwear', 'Sneakers', 'Boots', 'Loafers',
  'Belt', 'Watch', 'Hat', 'Sunglasses', 'Jewellery',
]

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return { statusCode: 500, body: 'Server missing GEMINI_API_KEY' }
  }

  let image, mimeType
  try {
    const body = JSON.parse(event.body || '{}')
    image = body.image
    mimeType = body.mimeType || 'image/jpeg'
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  if (!image) {
    return { statusCode: 400, body: 'Need an image (base64).' }
  }

  // Strip a data URL prefix if present.
  const base64 = image.replace(/^data:[^,]+,/, '')

  const prompt = `You are looking at a photo of a single clothing item or accessory from a wardrobe catalog.

Identify three things:
1. "category" — the single best matching tag from this exact list (use the exact spelling/casing given, or "" if nothing fits): ${CATEGORIES.join(', ')}.
2. "color" — the dominant color, as a short common name (e.g. "Navy", "Olive", "Charcoal"). One or two words.
3. "material" — your best guess at the fabric/material (e.g. "Cotton", "Linen", "Wool", "Leather", "Denim"). One word. If you genuinely cannot tell, use "".

Respond with ONLY valid JSON, no markdown, no backticks, in this exact shape:
{ "category": "<tag or empty>", "color": "<color or empty>", "material": "<material or empty>" }`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64 } },
          ],
        }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
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
      body: JSON.stringify({
        category: typeof parsed.category === 'string' ? parsed.category.trim() : '',
        color: typeof parsed.color === 'string' ? parsed.color.trim() : '',
        material: typeof parsed.material === 'string' ? parsed.material.trim() : '',
      }),
    }
  } catch (err) {
    return { statusCode: 500, body: `Failed to identify: ${err.message}` }
  }
}
