// Shared helpers for matching AI-suggested outfit "slots" (role + item name)
// back to actual wardrobe items.

export function findItem(items, name) {
  if (!name) return null
  const norm = s => s.trim().toLowerCase()
  const target = norm(name)
  return items.find(it => norm(it.name) === target)
    || items.find(it => norm(it.name).includes(target) || target.includes(norm(it.name)))
    || null
}

// Resolve AI slot/item names to actual wardrobe items, dropping anything
// that doesn't match and any slot left with no matches.
export function resolveSlots(rawSlots, items) {
  return (rawSlots || [])
    .map(slot => ({
      role: slot.role,
      items: (slot.items || [])
        .map(p => ({ ...p, match: findItem(items, p.item) }))
        .filter(p => p.match),
    }))
    .filter(slot => slot.items.length > 0)
}
