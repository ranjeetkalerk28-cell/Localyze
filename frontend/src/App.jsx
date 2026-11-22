import { useCallback, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router'
import { AccountProvider, useAccount } from './account/AccountContext'
import { readSession, saveSession, clearSession } from './account/session'
import AppLayout from './layout/AppLayout'
import AuthPage from './pages/auth/AuthPage'
import HomePage from './pages/home/HomePage'
import SearchPage from './pages/search/SearchPage'
import ExplorePage from './pages/explore/ExplorePage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import MyProfilePage from './pages/profile/MyProfilePage'
import BusinessProfilePage from './pages/profile/BusinessProfilePage'
import CreatePostPage from './pages/create/CreatePostPage'
import CollaborationsPage from './pages/collaborations/CollaborationsPage'
import SavedPage from './pages/saved/SavedPage'
import AboutPage from './pages/about/AboutPage'
import SettingsPage from './pages/settings/SettingsPage'
import EventsPage from './pages/events/EventsPage'
import EventFormPage from './pages/events/EventFormPage'

function ProtectedLayout({ session, onLogout }) {
  const location = useLocation()
  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: location.pathname + location.search + location.hash }}
      />
    )
  }
  return (
    <AccountProvider key={session.token} session={session} onLogout={onLogout}>
      <AppLayout />
    </AccountProvider>
  )
}

function LoginRoute({ session, onLogin }) {
  const { state } = useLocation()
  return session ? <Navigate replace to={state?.returnTo || '/'} /> : <AuthPage onAuthenticated={onLogin} />
}

function MyProfileRoute() {
  const { isBusiness, profilePath } = useAccount()
  const { state } = useLocation()
  return isBusiness ? <Navigate replace to={profilePath} state={state} /> : <MyProfilePage />
}

function BusinessProfileRoute() {
  const { businessId } = useParams()
  return <BusinessProfilePage key={businessId} businessId={businessId} />
}

function CreateRoute() {
  const [params] = useSearchParams()
  const type = params.get('type')
  const initialType = ['offer', 'promotion', 'collaboration'].includes(type) ? type : null
  return <CreatePostPage key={initialType || 'choose'} initialType={initialType} />
}

export default function App() {
  const [session, setSession] = useState(() => readSession())
  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])
  const home = <Navigate replace to="/" />
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<LoginRoute session={session} onLogin={(token) => setSession(saveSession(token))} />}
        />
        <Route element={<ProtectedLayout session={session} onLogout={logout} />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/new" element={session?.isBusiness ? <EventFormPage /> : home} />
          <Route path="events/:eventId/edit" element={session?.isBusiness ? <EventFormPage /> : home} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<MyProfileRoute />} />
          <Route path="businesses/:businessId" element={<BusinessProfileRoute />} />
          <Route path="saved" element={session?.isBusiness ? home : <SavedPage />} />
          <Route path="create" element={session?.isBusiness ? <CreateRoute /> : home} />
          <Route path="collaborations" element={session?.isBusiness ? <CollaborationsPage /> : home} />
          <Route path="about" element={<AboutPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="*"
            element={
              <section className="empty-state">
                <h1>Page not found</h1>
                <Link className="primary-button" to="/">
                  Return home
                </Link>
              </section>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
