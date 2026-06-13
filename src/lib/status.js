// Item availability status: ready | laundry | repair
export const STATUSES = {
  ready: { label: 'Ready to wear', short: 'Ready' },
  laundry: { label: 'In laundry', short: 'Laundry' },
  repair: { label: 'Needs repair', short: 'Repair' },
}

export const STATUS_ORDER = ['ready', 'laundry', 'repair']

export function statusInfo(status) {
  return STATUSES[status] || STATUSES.ready
}
