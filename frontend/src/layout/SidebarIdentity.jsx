import { Link, useLocation } from 'react-router'
import { useAccount } from '../account/AccountContext'

export default function SidebarIdentity() {
  const { profile, isBusiness, profilePath } = useAccount()
  const location = useLocation()
  const name = profile?.businessName || profile?.name || (isBusiness ? 'Your business' : 'Your profile')
  const photo = profile?.logoUrl || profile?.avatarUrl
  return (
    <div className="sidebar-identity">
      <Link
        to={profilePath}
        state={location.pathname === profilePath ? location.state : { fromApp: true }}
        className="identity-button"
      >
        {photo ? <img src={photo} alt="" /> : <span className="identity-initial">{name.slice(0, 1)}</span>}
        <span>
          <strong>{name}</strong>
          <small>{profile?.username ? `@${profile.username}` : 'View your profile'}</small>
        </span>
      </Link>
    </div>
  )
}
