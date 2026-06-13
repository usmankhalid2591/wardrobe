// Category line-icons used as placeholders for items without a photo.
// Pure SVG, stroke="currentColor" so they inherit tile color.

const ICONS = {
  shirt: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M17 6 L24 11 L31 6 L40 11 L36 19 L31 16 V41 H17 V16 L12 19 L8 11 Z" />
      <path d="M21 6 Q24 10 27 6" />
    </svg>
  ),
  trousers: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M13 6 H35 L37 42 H29 L24 16 L19 42 H11 Z" />
      <path d="M13 6 H35" />
    </svg>
  ),
  jacket: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M18 7 L24 12 L30 7 L40 13 L36 22 L32 19 V41 H16 V19 L12 22 L8 13 Z" />
      <path d="M20 12 L24 41 M28 12 L24 41" />
    </svg>
  ),
  tunic: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M17 5 L24 10 L31 5 L39 12 L35 19 L31 16 V20 L34 44 H14 L17 20 V16 L13 19 L9 12 Z" />
      <path d="M21 5 Q24 9 27 5" />
    </svg>
  ),
  footwear: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M8 33 Q8 27 14 26 L22 24 L30 16 Q33 13 36 16 L38 23 Q42 25 41 31 Q41 35 36 35 H10 Q8 35 8 33 Z" />
      <path d="M14 26 L17 32 M22 24 L25 31" />
    </svg>
  ),
  watch: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M17 8 H31 V15 H17 Z M17 33 H31 V40 H17 Z" />
      <circle cx="24" cy="24" r="9" />
      <path d="M24 19 V24 L27 26" />
    </svg>
  ),
  belt: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <rect x="6" y="20" width="36" height="8" rx="1" />
      <rect x="18" y="17" width="12" height="14" rx="1.5" />
      <circle cx="24" cy="24" r="2" />
    </svg>
  ),
  sunglasses: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="14" cy="24" r="8" />
      <circle cx="34" cy="24" r="8" />
      <path d="M22 22 H26 M6 22 L9 19 M42 22 L39 19" />
    </svg>
  ),
  hat: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="24" cy="30" rx="18" ry="5" />
      <path d="M16 30 Q16 16 24 16 Q32 16 32 30" />
    </svg>
  ),
  ring: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="24" cy="28" r="11" />
      <path d="M18 17 L24 8 L30 17 Z" />
    </svg>
  ),
  hanger: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 8 V12" />
      <circle cx="24" cy="6.5" r="1.6" />
      <path d="M24 12 L40 26 Q42 28 39 30 H9 Q6 28 8 26 Z" />
    </svg>
  ),
}

// Ordered rules: first matching tag (case-insensitive substring) wins.
const RULES = [
  [['sunglasses'], 'sunglasses'],
  [['hat'], 'hat'],
  [['jewellery', 'jewelry', 'ring'], 'ring'],
  [['watch'], 'watch'],
  [['belt'], 'belt'],
  [['footwear', 'sneaker', 'loafer', 'boot', 'shoe', 'driver'], 'footwear'],
  [['blazer', 'suit'], 'jacket'],
  [['traditional'], 'tunic'],
  [['trouser', 'jean', 'pant', 'loungewear'], 'trousers'],
  [['shirt', 'polo', 'henley', 't-shirt', 'gym', 'top'], 'shirt'],
]

export function iconKeyForTags(tags) {
  const hay = (tags || []).join(' ').toLowerCase()
  for (const [needles, key] of RULES) {
    if (needles.some(n => hay.includes(n))) return key
  }
  return 'hanger'
}

export default function CategoryIcon({ tags, className }) {
  const key = iconKeyForTags(tags)
  return <span className={className}>{ICONS[key]}</span>
}
