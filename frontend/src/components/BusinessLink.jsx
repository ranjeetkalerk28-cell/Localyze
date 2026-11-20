import { Link, useLocation } from 'react-router'

export default function BusinessLink({ businessId, ...props }) {
  const { pathname, search, hash, state } = useLocation()
  const to = `/businesses/${encodeURIComponent(businessId)}`
  const currentProfile = pathname === to
  return (
    <Link
      to={currentProfile ? { pathname, search, hash } : to}
      replace={currentProfile}
      state={currentProfile ? state : { fromApp: true }}
      {...props}
    />
  )
}
