// Helpers for showing events. Event dates are plain "YYYY-MM-DD" strings and
// times are "HH:mm" strings (India time, as the organiser typed them), so they
// are formatted from their parts rather than through Date's timezone logic.

export const EVENT_CATEGORIES = ['fair', 'show', 'festival', 'party', 'tournament', 'workshop', 'market', 'other']

export function categoryLabel(category) {
  return category ? category.charAt(0).toUpperCase() + category.slice(1) : ''
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parts(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return { year, month: month - 1, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() }
}

export function dayOfMonth(dateString) {
  return String(parts(dateString).day)
}

export function monthShort(dateString) {
  return MONTHS[parts(dateString).month].toUpperCase()
}

export function formatEventDay(dateString, { weekday = false } = {}) {
  const { year, month, day, weekday: weekdayIndex } = parts(dateString)
  const base = `${day} ${MONTHS[month]}`
  const withYear = year === new Date().getFullYear() ? base : `${base} ${year}`
  return weekday ? `${WEEKDAYS[weekdayIndex]}, ${withYear}` : withYear
}

export function formatDateRange(startDate, endDate) {
  if (!endDate || endDate === startDate) return formatEventDay(startDate, { weekday: true })
  const start = parts(startDate)
  const end = parts(endDate)
  if (start.year === end.year && start.month === end.month) {
    return `${start.day} – ${formatEventDay(endDate)}`
  }
  return `${formatEventDay(startDate)} – ${formatEventDay(endDate)}`
}

export function formatTime12(time) {
  const [hours, minutes] = time.split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour = hours % 12 || 12
  return minutes ? `${hour}:${String(minutes).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`
}

// A daily window whose end is not after its start runs past midnight.
export function isOvernight(startTime, endTime) {
  return endTime <= startTime
}

export function formatEventTime(event) {
  if (event.timeMode !== 'daily_hours') return 'All day'
  const range = `${formatTime12(event.startTime)} – ${formatTime12(event.endTime)}`
  const overnight = isOvernight(event.startTime, event.endTime) ? ' (ends next morning)' : ''
  const multiDay = event.endDate && event.endDate !== event.startDate ? 'Every day, ' : ''
  return `${multiDay}${range}${overnight}`
}

export function formatPrice(price) {
  return price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`
}

// Short entry summary for lists: "Free", "₹299" or "From ₹299".
export function formatEntry(event) {
  if (event.entryType !== 'paid' || !event.passes?.length) return 'Free'
  const prices = event.passes.map((pass) => pass.price)
  const lowest = Math.min(...prices)
  return prices.length > 1 && Math.max(...prices) !== lowest ? `From ${formatPrice(lowest)}` : formatPrice(lowest)
}
