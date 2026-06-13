import CategoryIcon from '../lib/categoryIcon'

export default function ItemDetail({ item, onClose, onEdit, onDelete }) {
  if (!item) return null

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet detail-sheet" onClick={e => e.stopPropagation()}>
        <div className="detail-photo" style={item.photo_url ? { backgroundImage: `url(${item.photo_url})` } : {}}>
          {!item.photo_url && <CategoryIcon tags={item.tags} className="detail-icon" />}
        </div>

        <div className="detail-body">
          <h2>{item.name}</h2>
          <div className="card-meta">
            {item.brand || '—'}
            {item.color && <><span className="dot">·</span>{item.color}</>}
            {item.material && <><span className="dot">·</span>{item.material}</>}
          </div>

          {(item.tags || []).length > 0 && (
            <div className="tags">
              {item.tags.map((t, i) => <span className="tag" key={i}>{t}</span>)}
            </div>
          )}

          {item.notes && <p className="detail-notes">{item.notes}</p>}

          <div className="sheet-actions">
            <button type="button" className="btn ghost" onClick={() => onEdit(item)}>Edit</button>
            <button type="button" className="btn danger" onClick={() => onDelete(item)}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  )
}
