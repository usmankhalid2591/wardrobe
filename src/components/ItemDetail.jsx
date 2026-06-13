import CategoryIcon from '../lib/categoryIcon'
import { STATUS_ORDER, statusInfo } from '../lib/status'

const STATUS_ACTION_LABEL = {
  ready: 'Mark ready',
  laundry: 'Send to laundry',
  repair: 'Needs repair',
}

function formatLastWorn(dateStr) {
  if (!dateStr) return 'Never worn'
  const then = new Date(dateStr)
  const days = Math.floor((Date.now() - then.getTime()) / 86400000)
  if (days <= 0) return 'Worn today'
  if (days === 1) return 'Worn yesterday'
  if (days < 7) return `Worn ${days} days ago`
  if (days < 30) return `Worn ${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} ago`
  return `Last worn ${then.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export default function ItemDetail({ item, onClose, onEdit, onDelete, onWear, wearing, onStatus, settingStatus }) {
  if (!item) return null

  const status = item.status || 'ready'

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet detail-sheet" onClick={e => e.stopPropagation()}>
        <div className="detail-photo" style={item.photo_url ? { backgroundImage: `url(${item.photo_url})` } : {}}>
          {!item.photo_url && <CategoryIcon tags={item.tags} className="detail-icon" />}
          <span className={`status-badge status-${status}`}>{statusInfo(status).label}</span>
        </div>

        <div className="detail-body">
          <h2>{item.name}</h2>
          <div className="card-meta">
            {item.brand || '—'}
            {item.color && <><span className="dot">·</span>{item.color}</>}
            {item.material && <><span className="dot">·</span>{item.material}</>}
          </div>

          <div className="status-actions">
            {STATUS_ORDER.filter(s => s !== status).map(s => (
              <button key={s} type="button" className="chip" disabled={settingStatus}
                onClick={() => onStatus(item, s)}>
                {STATUS_ACTION_LABEL[s]}
              </button>
            ))}
          </div>

          {(item.tags || []).length > 0 && (
            <div className="tags">
              {item.tags.map((t, i) => <span className="tag" key={i}>{t}</span>)}
            </div>
          )}

          {item.notes && <p className="detail-notes">{item.notes}</p>}

          <div className="wear-row">
            <div className="wear-info">
              <div className="wear-last">{formatLastWorn(item.last_worn_at)}</div>
              <div className="wear-count">
                {item.wear_count ? `Worn ${item.wear_count} time${item.wear_count === 1 ? '' : 's'}` : 'No wears logged'}
              </div>
            </div>
            <button type="button" className="btn ghost" onClick={() => onWear(item)} disabled={wearing}>
              {wearing ? 'Logging…' : 'I wore this today'}
            </button>
          </div>

          <div className="sheet-actions">
            <button type="button" className="btn ghost" onClick={() => onEdit(item)}>Edit</button>
            <button type="button" className="btn danger" onClick={() => onDelete(item)}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  )
}
