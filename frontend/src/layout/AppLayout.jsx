import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router'
import {
  Bell,
  Bookmark,
  Compass,
  Ellipsis,
  Handshake,
  Heart,
  Home,
  LogOut,
  Pencil,
  PlusSquare,
  Search,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useAccount } from '../account/AccountContext'
import SidebarIdentity from './SidebarIdentity'

function Navigation() {
  const { isBusiness, profilePath, onLogout } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const [menu, setMenu] = useState(null)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const items = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Explore', path: '/explore', icon: Compass },
    { label: 'Notifications', path: '/notifications', icon: isBusiness ? Bell : Heart, secondary: true },
    ...(isBusiness
      ? [
          { label: 'Create', path: '/create', icon: PlusSquare, secondary: true },
          { label: 'Collaborations', path: '/collaborations', icon: Handshake, secondary: true },
        ]
      : [{ label: 'Saved', path: '/saved', icon: Bookmark, secondary: true, moreOnly: true }]),
    { label: 'Profile', path: profilePath, icon: UserRound },
  ]

  useEffect(() => {
    if (!menu) return
    function dismiss(event) {
      if (!menuRef.current?.contains(event.target)) setMenu(null)
    }
    function handleKey(event) {
      if (event.key === 'Escape') {
        setMenu(null)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menu])

  const moreDestination =
    items.some((item) => item.secondary && item.path === location.pathname) || location.pathname === '/about'

  function toggleMenu(name, event) {
    triggerRef.current = event.currentTarget
    setMenu((current) => (current === name ? null : name))
  }

  function logout() {
    onLogout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar">
      <Link className="brand" to="/" aria-label="Localyze home">
        <span>Localyze</span>
      </Link>
      <p className="sidebar-tagline" lang="hi">
        दुकान से दिल तक
      </p>
      <p className="sidebar-label">{isBusiness ? 'Business account' : 'Your neighbourhood'}</p>
      <nav className="main-nav" aria-label="Main navigation">
        {items.filter((item) => !item.moreOnly).map(({ label, path, icon: Icon, secondary }) => (
          <NavLink
            end
            key={path}
            to={path}
            state={location.pathname === path ? location.state : { fromApp: true }}
            className={({ isActive }) =>
              `nav-item${isActive ? ' active' : ''}${secondary ? ' secondary-nav' : ''}`
            }
          >
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {isBusiness && (
        <Link to="/create" className="primary-button sidebar-create">
          <Pencil size={18} />
          Create a post
        </Link>
      )}
      <div className="sidebar-bottom" ref={menuRef}>
        <SidebarIdentity />
        <button
          className="nav-item settings-toggle"
          aria-expanded={menu === 'settings'}
          onClick={(event) => toggleMenu('settings', event)}
        >
          <Settings size={21} />
          <span>Settings</span>
        </button>
        <button
          className={`nav-item more-toggle${menu === 'more' ? ' active' : ''}${moreDestination ? ' has-current-page' : ''}`}
          aria-expanded={menu === 'more'}
          onClick={(event) => toggleMenu('more', event)}
        >
          <Ellipsis size={22} />
          <span>More</span>
        </button>
        {menu && (
          <div className="more-menu">
            {menu === 'more' && (
              <>
                {items
                  .filter((item) => item.secondary)
                  .map(({ label, path, icon: Icon }) => (
                    <NavLink
                      end
                      key={path}
                      to={path}
                      onClick={() => setMenu(null)}
                      className={label === 'Saved' ? '' : 'mobile-menu-item'}
                    >
                      <Icon size={17} />
                      {label}
                    </NavLink>
                  ))}
                <Link to="/about" onClick={() => setMenu(null)}>
                  <Sparkles size={17} />
                  About Localyze
                </Link>
              </>
            )}
            <button className={menu === 'more' ? 'mobile-menu-item' : ''} onClick={logout}>
              <LogOut size={17} />
              Log out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

export default function AppLayout() {
  const { isBusiness } = useAccount()
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  useEffect(() => {
    if (navigationType === 'PUSH') window.scrollTo(0, 0)
  }, [pathname, navigationType])
  return (
    <div
      className={`app-shell desktop-ui ${isBusiness ? 'business-ui' : 'consumer-ui'} ${isBusiness && pathname === '/' ? 'business-home' : ''}`}
    >
      <Navigation key={pathname} />
      <main className="main-content">
        <div className="toran" aria-hidden="true" />
        <header className="mobile-header">
          <Link className="brand" to="/" aria-label="Localyze home">
            <span>Localyze</span>
          </Link>
          <span className="mobile-account-role">{isBusiness ? 'Business account' : 'Consumer account'}</span>
          <NavLink className="icon-button" to="/notifications" aria-label="Notifications">
            <Bell size={22} />
          </NavLink>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
