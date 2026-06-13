// Currency formatting — supports a small set of currencies, chosen in Settings.
export const CURRENCIES = {
  PKR: { symbol: 'Rs', locale: 'en-PK', label: 'Pakistani Rupee (Rs)' },
  INR: { symbol: '₹', locale: 'en-IN', label: 'Indian Rupee (₹)' },
  USD: { symbol: '$', locale: 'en-US', label: 'US Dollar ($)' },
  GBP: { symbol: '£', locale: 'en-GB', label: 'British Pound (£)' },
  EUR: { symbol: '€', locale: 'de-DE', label: 'Euro (€)' },
  AED: { symbol: 'AED', locale: 'en-AE', label: 'UAE Dirham (AED)' },
}

export function formatCurrency(value, code = 'PKR') {
  if (value === '' || value === null || value === undefined) return ''
  const n = Number(value)
  if (Number.isNaN(n)) return ''
  const c = CURRENCIES[code] || CURRENCIES.PKR
  return `${c.symbol} ${n.toLocaleString(c.locale, { maximumFractionDigits: 0 })}`
}

// Back-compat helper (defaults to PKR) — prefer formatCurrency with a settings code.
export function formatRs(value) {
  return formatCurrency(value, 'PKR')
}

export function costPerWear(price, wearCount) {
  const p = Number(price)
  if (!price || Number.isNaN(p) || p <= 0) return null
  if (!wearCount) return null
  return p / wearCount
}
