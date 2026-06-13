import { useRef, useState } from 'react'

const ITEM_W = 84
const GAP = 10
export const CAROUSEL_STEP = ITEM_W + GAP

// Shared selection state + handlers for a set of swipeable outfit-piece
// carousels (one per slot/role). Used by the Stylist, Surprise Me, Packing,
// and Find Pairings views.
export function useSlotCarousels() {
  const [selections, setSelections] = useState({})
  const trackRefs = useRef({})

  function reset() { setSelections({}) }

  function handleScroll(slotIndex, maxIndex) {
    return e => {
      const el = e.currentTarget
      clearTimeout(el._scrollTimer)
      el._scrollTimer = setTimeout(() => {
        let idx = Math.round(el.scrollLeft / CAROUSEL_STEP)
        idx = Math.max(0, Math.min(maxIndex, idx))
        setSelections(s => (s[slotIndex] === idx ? s : { ...s, [slotIndex]: idx }))
      }, 100)
    }
  }

  function selectItem(slotIndex, itemIndex) {
    const track = trackRefs.current[slotIndex]
    if (track) track.scrollTo({ left: itemIndex * CAROUSEL_STEP, behavior: 'smooth' })
    setSelections(s => ({ ...s, [slotIndex]: itemIndex }))
  }

  function chosenPiece(slot, slotIndex) {
    const idx = Math.min(selections[slotIndex] ?? 0, slot.items.length - 1)
    return slot.items[idx]
  }

  return { selections, setSelections, trackRefs, reset, handleScroll, selectItem, chosenPiece }
}
