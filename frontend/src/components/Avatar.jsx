export default function Avatar({ name = 'Business', src, large = false }) {
  if (src)
    return <img className={`avatar avatar-photo ${large ? 'avatar-large' : ''}`} src={src} alt={name} />
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
  return <div className={`avatar ${large ? 'avatar-large' : ''}`}>{initials}</div>
}
