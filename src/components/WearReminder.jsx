import { useMemo, useState } from 'react'
import { useSettings } from '../lib/settings'

// A gentle nudge on the Wardrobe tab pointing at pieces that haven't been
// worn recently (or ever). Dismissible for the session.
export default function WearReminder({ items }) {
  const { settings } = useSettings()
  const [dismissed, setDismissed] = useState(false)

  const neglected = useMemo(() => {
    const days = Number(settings.reminder_days) || 14
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return items.filter(it => {
      if ((it.status || 'ready') !== 'ready' || it.in_storage) return false
      if (!it.last_worn_at) return true
      return new Date(it.last_worn_at).getTime() < cutoff
    })
  }, [items, settings.reminder_days])

  if (!settings.reminders_enabled || dismissed || neglected.length === 0) return null

  const names = neglected.slice(0, 3).map(it => it.name)
  const extra = neglected.length - names.length

  return (
    <div className="notice warn reminder-banner">
      <span>
        {neglected.length} piece{neglected.length === 1 ? '' : 's'} haven't been worn in a while
        {': '}{names.join(', ')}{extra > 0 ? `, and ${extra} more` : ''}.
        {' '}Maybe give {neglected.length === 1 ? 'it' : 'one'} a turn?
      </span>
      <button type="button" className="btn ghost" onClick={() => setDismissed(true)}>Dismiss</button>
    </div>
  )
}
