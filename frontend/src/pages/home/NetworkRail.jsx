import { ArrowRight, Megaphone, Tag, UsersRound } from 'lucide-react'
import { Link } from 'react-router'

export default function NetworkRail({ children }) {
  return (
    <div className="network-rail">
      <h2>Recommended connections</h2>
      {children}
      <Link className="primary-button explore-businesses" to="/search">
        Explore businesses <ArrowRight aria-hidden="true" />
      </Link>
      <svg className="rail-wave" viewBox="0 0 360 16" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0 8 Q20 -3 40 8 T80 8 T120 8 T160 8 T200 8 T240 8 T280 8 T320 8 T360 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      </svg>
      <h2 className="make-local">
        Make something <em>local.</em>
      </h2>
      <div className="rail-actions">
        {[
          [Tag, 'Share an offer', 'offer'],
          [Megaphone, 'Post a promotion', 'promotion'],
          [UsersRound, 'Find a collaborator', 'collaboration'],
        ].map(([Icon, label, type]) => (
          <Link key={type} to={`/create?type=${type}`}>
            <Icon />
            {label}
          </Link>
        ))}
      </div>
      <p className="rail-note">A good idea starts with a post.</p>
    </div>
  )
}
