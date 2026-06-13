import { useRef, useState } from 'react'

// Chip-style tag editor with autocomplete from existing tags.
// value: string[]  onChange: (string[]) => void  suggestions: string[]
export default function TagInput({ value, onChange, suggestions = [] }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  const norm = s => s.trim().toLowerCase()

  function addTag(raw) {
    const t = norm(raw)
    if (!t) return
    if (!value.includes(t)) onChange([...value, t])
    setText('')
    setOpen(false)
  }

  function removeTag(t) {
    onChange(value.filter(x => x !== t))
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(text)
    } else if (e.key === 'Backspace' && !text && value.length) {
      removeTag(value[value.length - 1])
    }
  }

  const matches = text.trim()
    ? suggestions.filter(s => norm(s).includes(norm(text)) && !value.includes(norm(s))).slice(0, 6)
    : []

  return (
    <div className="tag-input">
      <div className="tag-input-chips" onClick={() => inputRef.current?.focus()}>
        {value.map(t => (
          <span className="tag-chip" key={t}>
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => removeTag(t)}>×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          onChange={e => { setText(e.target.value); setOpen(true) }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 100)}
          placeholder={value.length ? '' : 'casual shirt, linen…'}
        />
      </div>
      {open && matches.length > 0 && (
        <div className="tag-suggestions">
          {matches.map(s => (
            <button type="button" key={s} onMouseDown={e => { e.preventDefault(); addTag(s) }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
