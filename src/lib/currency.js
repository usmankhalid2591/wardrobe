// Cost-per-wear formatting (Pakistani Rupees)
export function formatRs(value) {
  if (value === '' || value === null || value === undefined) return ''
  const n = Number(value)
  if (Number.isNaN(n)) return ''
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
}

export function costPerWear(price, wearCount) {
  const p = Number(price)
  if (!price || Number.isNaN(p) || p <= 0) return null
  if (!wearCount) return null
  return p / wearCount
}
