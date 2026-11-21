import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

const SHORTCUTS = [
  ['offer', 'Share an offer', 'Time-bound deal'],
  ['promotion', 'Post a promotion', 'Something new or seasonal'],
  ['collaboration', 'Find a collaborator', 'Team up with a neighbour'],
]

export default function NetworkRail({ children }) {
  return (
    <div className="network-rail">
      <div className="ledger">
        <h2>Padosi businesses</h2>
        {children}
        <Link className="ledger-more" to="/search">
          Explore more businesses <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <h2 className="make-local">
        Make something <em>local.</em>
      </h2>
      <div className="rail-actions">
        {SHORTCUTS.map(([type, label, hint]) => (
          <Link key={type} className={`shop-shortcut shop-${type}`} to={`/create?type=${type}`}>
            <span>
              {label}
              <small>{hint}</small>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
      <p className="rail-note">A good idea starts with a post.</p>
    </div>
  )
}
