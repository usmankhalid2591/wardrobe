import CategoryIcon from '../lib/categoryIcon'

// Renders one swipeable carousel per slot (role), each showing the matched
// wardrobe item photos. Pairs with the useSlotCarousels hook for state.
export default function SlotCarousels({ slots, selections, trackRefs, handleScroll, selectItem }) {
  return (
    <>
      {slots.map((slot, i) => {
        const idx = Math.min(selections[i] ?? 0, slot.items.length - 1)
        const chosen = slot.items[idx]
        return (
          <div className="carousel-row" key={i}>
            <div className="carousel-label">{slot.role}</div>
            <div
              className="carousel-track"
              ref={el => { trackRefs.current[i] = el }}
              onScroll={handleScroll(i, slot.items.length - 1)}
            >
              {slot.items.map((p, j) => (
                <div
                  className={`carousel-item${j === idx ? ' selected' : ''}`}
                  key={j}
                  onClick={() => selectItem(i, j)}
                >
                  <div className="carousel-item-photo"
                    style={p.match?.photo_url ? { backgroundImage: `url(${p.match.photo_url})` } : {}}>
                    {!p.match?.photo_url && <CategoryIcon tags={p.match?.tags} className="tile-icon" />}
                  </div>
                  <div className="carousel-item-name">{p.match?.name || p.item}</div>
                </div>
              ))}
            </div>
            <div className="carousel-name">{chosen.match?.name || chosen.item}</div>
            {chosen.why && <div className="carousel-why">{chosen.why}</div>}
          </div>
        )
      })}
    </>
  )
}
