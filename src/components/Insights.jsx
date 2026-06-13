import { formatRs, costPerWear } from '../lib/currency'

function BarRow({ label, count, max }) {
  const pct = max ? Math.round((count / max) * 100) : 0
  return (
    <div className="bar-row">
      <div className="bar-label">{label}</div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
      <div className="bar-count">{count}</div>
    </div>
  )
}

export default function Insights({ items }) {
  if (items.length === 0) {
    return <div className="empty"><h3>Nothing to show yet</h3><p>Add pieces and log wears to see insights here.</p></div>
  }

  const totalWears = items.reduce((sum, it) => sum + (it.wear_count || 0), 0)
  const pricedItems = items.filter(it => it.price != null && it.price !== '' && Number(it.price) > 0)
  const totalValue = pricedItems.reduce((sum, it) => sum + Number(it.price), 0)
  const neverWorn = items.filter(it => !it.wear_count)

  const mostWorn = [...items]
    .filter(it => (it.wear_count || 0) > 0)
    .sort((a, b) => (b.wear_count || 0) - (a.wear_count || 0))
    .slice(0, 5)

  const cpwItems = items
    .map(it => ({ it, cpw: costPerWear(it.price, it.wear_count) }))
    .filter(x => x.cpw != null)
    .sort((a, b) => a.cpw - b.cpw)
    .slice(0, 5)

  const tagCounts = {}
  items.forEach(it => (it.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 }))
  const tagEntries = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])
  const maxTag = tagEntries[0]?.[1] || 0

  const colorCounts = {}
  items.forEach(it => {
    const c = (it.color || '').trim()
    if (c) colorCounts[c] = (colorCounts[c] || 0) + 1
  })
  const colorEntries = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])
  const maxColor = colorEntries[0]?.[1] || 0

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{items.length}</div>
          <div className="stat-label">{items.length === 1 ? 'Piece' : 'Pieces'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalWears}</div>
          <div className="stat-label">Wears logged</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatRs(totalValue) || '—'}</div>
          <div className="stat-label">Wardrobe value</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{neverWorn.length}</div>
          <div className="stat-label">Never worn</div>
        </div>
      </div>

      {mostWorn.length > 0 && (
        <div className="insight-section">
          <h3>Most worn</h3>
          <ol className="rank-list">
            {mostWorn.map(it => (
              <li key={it.id}>
                <span>{it.name}</span>
                <span className="rank-count">{it.wear_count} {it.wear_count === 1 ? 'wear' : 'wears'}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {cpwItems.length > 0 && (
        <div className="insight-section">
          <h3>Best value per wear</h3>
          <ol className="rank-list">
            {cpwItems.map(({ it, cpw }) => (
              <li key={it.id}>
                <span>{it.name}</span>
                <span className="rank-count">{formatRs(cpw)} / wear</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tagEntries.length > 0 && (
        <div className="insight-section">
          <h3>By category</h3>
          {tagEntries.map(([tag, count]) => <BarRow key={tag} label={tag} count={count} max={maxTag} />)}
        </div>
      )}

      {colorEntries.length > 0 && (
        <div className="insight-section">
          <h3>By color</h3>
          {colorEntries.map(([color, count]) => <BarRow key={color} label={color} count={count} max={maxColor} />)}
        </div>
      )}

      {neverWorn.length > 0 && (
        <div className="insight-section">
          <h3>Never worn ({neverWorn.length})</h3>
          <div className="tags">
            {neverWorn.map(it => <span className="tag" key={it.id}>{it.name}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}
