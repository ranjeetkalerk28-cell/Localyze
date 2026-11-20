import { useEffect, useState } from 'react'

function getCountdownParts(targetDate) {
  if (!targetDate) return null
  const diff = new Date(targetDate).getTime() - Date.now()
  if (diff <= 0) return null
  const totalMinutes = Math.floor(diff / 60000)
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  }
}

export default function Countdown({ targetDate, compact = false }) {
  const [parts, setParts] = useState(() => getCountdownParts(targetDate))

  useEffect(() => {
    setParts(getCountdownParts(targetDate))
    const interval = setInterval(() => setParts(getCountdownParts(targetDate)), 60000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (!targetDate) return null
  if (!parts)
    return (
      <span className={`countdown countdown-expired ${compact ? 'countdown-compact' : ''}`}>
        Offer expired
      </span>
    )

  const label =
    parts.days > 0
      ? `${parts.days}d ${parts.hours}h`
      : parts.hours > 0
        ? `${parts.hours}h ${parts.minutes}m`
        : `${parts.minutes}m`
  return <span className={`countdown ${compact ? 'countdown-compact' : ''}`}>Offer ends in {label}</span>
}
