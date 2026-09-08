# Project State

> This is a shared support file used to track project progress across all AI agents and models working on this project (Claude, GPT,Copilot, local models, etc.).
> It exists so that any agent — regardless of which model or tool is being used — can pick up work without needing to re-scan the entire codebase or ask the user to re-explain context.
> Any AI assistant working on this project must:
> 1. Read this file first, before making any changes.
> 2. Update it immediately after completing any task that adds, removes, or changes a feature — including which agent/model made the change and when.
> 3. Never assume prior context beyond what's written here — if something isn't documented in this file, treat it as unknown rather than guessing.

## Directory Structure

```text
localyze review 1/
├── .gitignore
├── PROJECT_STATE.md
├── atlas-credentials.env
├── backend.zip
├── Claude Setup.exe
├── credentials.txt
├── backend/
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   └── db.js
│       ├── controllers/
│       │   ├── businessAuthController.js
│       │   ├── businessController.js
│       │   ├── collaborationController.js
│       │   ├── connectionController.js
│       │   ├── discoverController.js
│       │   ├── followController.js
│       │   ├── notificationController.js
│       │   ├── postController.js
│       │   └── userAuthController.js
│       ├── middleware/
│       │   ├── authMiddleware.js
│       │   └── errorHandler.js
│       ├── models/
│       │   ├── Business.js
│       │   ├── Collaboration.js
│       │   ├── Connection.js
│       │   ├── Follow.js
│       │   ├── Notification.js
│       │   ├── Post.js
│       │   └── User.js
│       ├── routes/
│       │   ├── businessAuthRoutes.js
│       │   ├── businessRoutes.js
│       │   ├── collaborationRoutes.js
│       │   ├── connectionRoutes.js
│       │   ├── discoverRoutes.js
│       │   ├── followRoutes.js
│       │   ├── index.js
│       │   ├── notificationRoutes.js
│       │   ├── postRoutes.js
│       │   └── userAuthRoutes.js
│       └── utils/
│           └── generateToken.js
└── frontend/
    ├── .gitignore
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── README.md
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        └── styles.css
```

`node_modules/`, `dist/`, `build/`, and `.git/` are intentionally excluded from this tree.

## Module Summary

### Backend

- `src/server.js` — Loads environment variables, connects to MongoDB, then starts Express on port 5000 by default.
- `src/app.js` — Configures CORS and JSON parsing, mounts `/api` routes, and provides the health response at `/`.
- `src/config/db.js` — Opens the Mongoose connection using `MONGO_URI` and terminates startup on failure.
- `src/utils/generateToken.js` — Creates JWTs containing the account ID and `user` or `business` role.
- `src/middleware/authMiddleware.js` — Verifies Bearer JWTs, loads the matching account, and enforces roles.
- `src/middleware/errorHandler.js` — Formats unhandled Express errors as JSON responses.
- `src/models/User.js` — Consumer account schema with name, email, password hash, interests, bio, and avatar URL.
- `src/models/Business.js` — Business account schema with business name, email, password hash, industry, description, and logo URL.
- `src/models/Post.js` — Business-owned categorized post schema with title, content, image URL, tags, expiry, visibility, likes, and timestamps.
- `src/models/Collaboration.js` — Business-to-business collaboration request schema with message and status.
- `src/models/Notification.js` — Consumer offer notification schema with read state and post reference.
- `src/models/Follow.js` — Unique consumer-to-business relationship with indexes for follower and following lookups.
- `src/models/Connection.js` — Bidirectional business-to-business relationship (`requester`/`recipient`/`status` enum `pending|accepted|rejected`), mirroring `Collaboration.js`'s shape rather than `Follow.js`'s unique-index trick (which doesn't generalize to a symmetric pair).
- `src/controllers/userAuthController.js` — Registers, logs in, and returns the profile (`/me`) of consumer accounts.
- `src/controllers/businessAuthController.js` — Registers, logs in, and returns the profile (`/me`) of business accounts.
- `src/controllers/businessController.js` — Returns a business's public profile (with follower/connection/collaboration counts), plus its followers list, connections list, and visibility-aware posts-by-type list, for viewing any business's profile page (self or others).
- `src/controllers/postController.js` — Creates, reads, updates, deletes, and likes posts according to account role; also serves a business's connections feed (with same-industry backfill when under-filled).
- `src/controllers/notificationController.js` — Lists consumer offer notifications and marks them read.
- `src/controllers/followController.js` — Creates, removes, checks, and lists consumer follows for businesses.
- `src/controllers/collaborationController.js` — Sends, lists, and accepts/rejects business collaboration requests; accepting one auto-creates (or upgrades) a Connection between the two businesses.
- `src/controllers/connectionController.js` — Sends connection requests, checks status relative to the caller, lists received pending requests, accepts/rejects, and disconnects an existing accepted connection.
- `src/controllers/discoverController.js` — Returns interest-matched posts and businesses for consumers.
- `src/routes/index.js` — Mounts authentication, posts, collaboration, connection, business-profile, and discovery route groups.
- `src/routes/userAuthRoutes.js` — Consumer register/login/me route definitions.
- `src/routes/businessAuthRoutes.js` — Business register/login/me route definitions.
- `src/routes/businessRoutes.js` — Public business profile, followers, connections, and posts-by-type lookups (`GET /:id`, `/:id/followers`, `/:id/connections`, `/:id/posts`), any logged-in role.
- `src/routes/postRoutes.js` — Post CRUD, consumer like, and business connections-feed route definitions.
- `src/routes/collaborationRoutes.js` — Business collaboration route definitions.
- `src/routes/connectionRoutes.js` — Business connection request/status/accept-reject/disconnect route definitions.
- `src/routes/discoverRoutes.js` — Consumer discovery route definitions.
- `src/routes/notificationRoutes.js` — Consumer notification route definitions.
- `src/routes/followRoutes.js` — Consumer follow, unfollow, status, and following-list route definitions.

### Frontend

- `src/main.jsx` — React entry point that mounts the app and global stylesheet.
- `src/App.jsx` — Auth flow, account type selection, registration forms, a unified feed-based homepage (consumer discovery feed or business connections feed), sidebar navigation (always visible for any authenticated screen, including Create and viewing a business profile), post interactions, a unified `BusinessProfilePage` (self and others — stats row, followers/connections lists, tabbed post grid, connect/disconnect/follow/edit actions), a Collaborations page, and placeholder pages. No more standalone Business Dashboard.
- `src/styles.css` — Responsive visual system for authentication, feed, sidebar, cards, mobile navigation, and coming-soon screens.
- `vite.config.js` — Vite React configuration and `/api` proxy to `http://localhost:5000`.
- `index.html` — Browser document shell and page metadata.
- `README.md` — Frontend run instructions and structure notes.

## Tech Stack

- Runtime: Node.js
- Backend: Express 4, CommonJS JavaScript
- Frontend: React, Vite, JSX
- UI icons: `lucide-react`
- Database: MongoDB, accessed through Mongoose 8
- Authentication: bcryptjs password hashing plus JWT Bearer tokens via `jsonwebtoken`
- Middleware/tools: CORS, dotenv, Nodemon
- Frontend development proxy: Vite proxies `/api` to backend port 5000
- Database environment: Current `.env` is configured for MongoDB Atlas; the backend connection was verified successfully during this session.

## Features & Status

| Feature | Status | Notes |
|---|---|---|
| MongoDB connection | Done | Mongoose connection succeeds and backend starts after connecting. |
| Consumer registration | Done | Frontend calls `POST /api/user/auth/register`; backend persists a hashed account and returns JWT. |
| Business registration | Done | Frontend collects business details and calls `POST /api/business/auth/register`. |
| Consumer login | Done | Frontend calls the consumer login endpoint and enters Home/Discovery. |
| Business login | Done | Frontend calls the business login endpoint and enters Business Dashboard. |
| JWT role protection | Done | Backend verifies JWT and restricts routes by `user` or `business` role. |
| Consumer discovery feed | Done | Feed loads live matched posts when authenticated and uses demo content as fallback. |
| Business homepage feed | Done | Business "Home" is a real feed of posts from the business's accepted connections; falls back to posts from other businesses in the same industry when there are none, then to demo content if the API is unreachable. Replaces the old static Business Dashboard entirely. |
| Business-to-business connections | Done | `Connection` model (`requester`/`recipient`/`status`); send/status/accept-reject/list-received endpoints under `/api/connections`; sent from a business's profile page, accepted/rejected from the business's Notifications page. |
| Collaboration → connection auto-link | Done | Accepting a collaboration request (`PUT /api/collaborations/:id`) automatically creates (or upgrades) a `Connection` between the two businesses if one doesn't already exist — idempotent. |
| Business profile page (self & others) | Done | Unified `BusinessProfilePage` for both a business's own profile and any other business's profile, opened via the Profile nav item (self) or clicking a business's name on a post (others). Shows follower/connection/collaboration counts (`GET /api/businesses/:id`), a Followers list and a Connections list that swap in-page (`/:id/followers`, `/:id/connections` — no navigation, sidebar always usable), and a tabbed post grid (Collaborations/Promotions/Offers via `/:id/posts?postType=`, visibility-aware). Self view shows a placeholder "Edit Profile" button (not yet functional); others show Connect/Disconnect (business viewers, with a confirmation before disconnecting) or Follow (consumer viewers — previously missing entirely). No back button. |
| Collaborations page (frontend) | Done | New business-only sidebar item lists received (with accept/reject) and sent collaboration requests, using the previously-unwired `/api/collaborations` endpoints. |
| Categorized business posts | Done | Offer, promotion, and business-only collaboration posts are persisted with expiry and visibility rules. |
| Business post publishing workflow | Done | Category selection, category-specific details, review/edit, publish, and API persistence are wired. |
| Business post CRUD | In Progress | Create is wired; frontend edit/delete/manage-stats screens remain. |
| Offer notifications | Done | Publishing an offer creates notifications for existing consumers; consumer Notifications loads them from the API. |
| Consumer follows business | Done | Unique Follow records, follow/unfollow/status APIs, discovery status, and UI Follow buttons are implemented. |
| Post likes | Done | Frontend like button calls `PUT /api/posts/:id/like`, reflects server like count/state, and initializes from the logged-in consumer's existing like. |
| Collaboration requests | Done | Backend send/list/respond endpoints exist and now have a frontend (Collaborations page) plus the auto-connect side effect on accept. |
| Search | Coming Soon / Placeholder | Sidebar item shows a coming-soon screen; no search backend exists. |
| Explore | Coming Soon / Placeholder | Sidebar item shows a coming-soon screen; discovery feed is the current consumer home. |
| Notifications | Done | For consumers: persisted offer notifications (read action endpoint exists but no UI mark-read control). For businesses: this page now shows pending received connection requests with inline Accept/Reject instead of offer notifications. |
| Profile | Done | `GET /api/user/auth/me` and `GET /api/business/auth/me` return the logged-in account's profile; frontend Profile page shows name/bio/interests (consumer) or businessName/industry/description (business), plus a consumer following list (via `GET /api/follows`) with unfollow support. Reached from the sidebar. No profile *update* API yet. |
| Settings | Done (minimal) | Clicking Settings in the sidebar opens a small popover (reusing the same dropdown styling as the "More" menu) with a Log out action — not a full page. This is the only logout control in the app, for both roles. |
| Saved posts | Coming Soon / Placeholder | More menu item exists; no persistence or backend endpoint exists. |
| About Localyze | Coming Soon / Placeholder | More menu item exists; informational page is not implemented. |
| Reels | Not Started | Removed from the sidebar by product request. |
| Messages | Not Started | Removed from the sidebar by product request; no messaging backend exists. |

## API Endpoints

All protected endpoints require `Authorization: Bearer <JWT>`. Role restrictions are enforced by backend middleware.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/business/auth/register` | Public | Register a business and return a business JWT. |
| POST | `/api/business/auth/login` | Public | Authenticate a business and return a business JWT. |
| POST | `/api/user/auth/register` | Public | Register a consumer and return a consumer JWT. |
| POST | `/api/user/auth/login` | Public | Authenticate a consumer and return a consumer JWT. |
| GET | `/api/user/auth/me` | Consumer | Return the logged-in consumer's profile (name, email, interests, bio, avatarUrl). |
| GET | `/api/business/auth/me` | Business | Return the logged-in business's profile (businessName, email, industry, description, logoUrl). |
| GET | `/api/businesses/:id` | Any logged-in account | Return one business's public profile (businessName, industry, description, logoUrl — no email) plus followersCount/connectionsCount/collaborationsCount. |
| GET | `/api/businesses/:id/followers` | Any logged-in account | List the business's followers (consumer name/avatarUrl). |
| GET | `/api/businesses/:id/connections` | Any logged-in account | List the business's accepted connections (the other business in each). |
| GET | `/api/businesses/:id/posts` | Any logged-in account | List the business's posts, optionally filtered by `?postType=`; visibility-aware (only the owner or a connected business sees `businesses_only` posts). |
| POST | `/api/posts` | Business | Create a post owned by the logged-in business. |
| GET | `/api/posts/mine` | Business | List posts owned by the logged-in business. |
| GET | `/api/posts/feed` | Business | Return posts from the business's accepted connections, backfilled with same-industry posts from other businesses when under-filled. |
| GET | `/api/posts/:id` | Any logged-in account | Read one post with populated business information. |
| PUT | `/api/posts/:id` | Business owner | Update an owned post. |
| DELETE | `/api/posts/:id` | Business owner | Delete an owned post. |
| PUT | `/api/posts/:id/like` | Consumer | Like or unlike a post. |
| POST | `/api/collaborations` | Business | Send a collaboration request to another business. |
| GET | `/api/collaborations/received` | Business | List received collaboration requests. |
| GET | `/api/collaborations/sent` | Business | List sent collaboration requests. |
| PUT | `/api/collaborations/:id` | Recipient business | Accept or reject a collaboration request; accepting also auto-creates/upgrades a Connection between the two businesses. |
| POST | `/api/connections/:businessId` | Business | Send a connection request to another business. |
| GET | `/api/connections/:businessId/status` | Business | Return `none`/`pending_sent`/`pending_received`/`connected` relative to the caller. |
| GET | `/api/connections/requests/received` | Business | List pending connection requests received by the logged-in business. |
| PUT | `/api/connections/:id` | Recipient business | Accept or reject a connection request. |
| DELETE | `/api/connections/:businessId` | Business | Remove an existing accepted connection with another business. |
| GET | `/api/discover/posts` | Consumer | Return posts matched to interests, with recent-post fallback. |
| GET | `/api/discover/businesses` | Consumer | Return businesses matched to consumer interests. |
| GET | `/api/notifications` | Consumer | List the latest offer notifications for the logged-in consumer. |
| PUT | `/api/notifications/:id/read` | Consumer | Mark one offer notification as read. |
| GET | `/api/follows` | Consumer | List businesses followed by the logged-in consumer. |
| GET | `/api/follows/:businessId/status` | Consumer | Check whether the consumer follows a business. |
| POST | `/api/follows/:businessId` | Consumer | Follow a business. |
| DELETE | `/api/follows/:businessId` | Consumer | Unfollow a business. |
| GET | `/` | Public | Backend health response: `API is running`. |

## Known Issues / TODOs

- The backend has no `.env.example` in the current file inventory despite README setup instructions referring to it; `.env` exists and contains sensitive configuration that must not be committed.
- Root-level `atlas-credentials.env` and `credentials.txt` are sensitive-looking files; review, rotate, and remove from the project directory or ensure they are excluded from source control.
- The frontend currently uses localStorage JWT presence and a decoded role for routing; it does not refresh, validate expiry, or fetch a current profile.
- Consumer feed demo content is shown when there is no token, the API is unavailable, or the API returns no posts.
- Frontend post saves remain local UI state only; no saved-post model or backend endpoint exists yet (likes are now backend-connected).
- Frontend edit/delete/manage-stats screens are not implemented yet.
- Offer notifications target followers only; consumers who follow after an offer is published do not receive that historical notification.
- Search, saved posts, and About are placeholder pages without backend support.
- No profile *update* endpoint exists yet — the `/me` endpoints are read-only; the business profile's "Edit Profile" button is a placeholder with no handler.
- Sending a connection request or collaboration request currently only happens from a business's profile page (reached by clicking their name on a post) — there is still no search/browse UI to find a specific business directly.
- `Connection` has no unique index (mirrors `Collaboration`'s approach) — duplicate prevention is app-level (checked in both directions) rather than DB-enforced.
- The disconnect confirmation on a business profile uses the browser's native `window.confirm` — there is no in-app modal/dialog system yet.
- The business profile's stats row (followers/collaborations/connections counts) doesn't live-refresh after a connect/disconnect action on that same page — only the action button's own state updates immediately.
- No automated test suite is currently present.
- The backend uses broad CORS configuration and should be restricted for production deployment.
- Git repository is active on branch `main` with remote `origin` configured as `https://github.com/ranjeetkalerk28-cell/localyze-review-1.git`; the latest verified checkpoint is commit `cd482cc` (`version 1`).

## Next Steps

1. Add business manage-posts screens for edit, delete, and view stats.
2. Make "Edit Profile" functional: a `PUT /api/business/auth/me` endpoint plus a frontend edit form (businessName, industry, description).
3. Add a search/browse UI for finding a specific business (currently the only way to reach a business's profile is by clicking their name on a post).
4. Add a profile *update* endpoint/UI for consumers (currently read-only) and expand Settings beyond just logout.
5. Add request validation, centralized API client/error handling, token expiry handling, and automated backend/frontend tests.
6. Remove or secure root credential files and restrict CORS before deployment.

## Change Log

- [2026-09-08] Reconciled project state with the GitHub `main` checkpoint (`cd482cc`, `version 1`); confirmed clean worktree and deployment-ignore rules — via GitHub Copilot.
- [2026-09-08] Redesigned the business profile page (self and others) into one unified `BusinessProfilePage`: added follower/connection/collaboration counts and a followers/connections lookup to `GET /api/businesses/:id` and two new sub-routes (`businessController.js`: `getBusinessFollowers`, `getBusinessConnections`, `getBusinessPosts` at `/api/businesses/:id/{followers,connections,posts}`), plus a `DELETE /api/connections/:businessId` disconnect endpoint (`connectionController.disconnectBusiness`). Frontend: merged the old business branch of `ProfilePage` and all of `BusinessProfileView` into `BusinessProfilePage`, matching a user-provided prototype — a stats row (Followers/Collaborations/Connections, the first and third clickable to swap in an in-page list with no navigation), a tabbed post grid (Collaborations/Promotions/Offers — "Offers" chosen over the prototype's "Ads" label to match the real `offer` postType, per the user), `Edit Profile` for the owner (placeholder, no backend yet, per the user), and `ConnectButton` extended with a disconnect flow (`window.confirm` before calling the new DELETE endpoint) or `FollowButton` for a consumer viewer (previously missing entirely on this page). Removed the profile page's "Back" button per the user's explicit complaint that it fought the always-visible sidebar. Found and fixed a bug during verification: navigating from one business's profile to another's (e.g. via the connections list) preserved the previous business's view/tab state because the component wasn't remounting — fixed with a `key={businessId}`. Verified end-to-end via curl (counts, followers/connections lists, postType filtering, `businesses_only` visibility restricted to owner/connected viewers, disconnect) and in the browser (self profile, connections list navigation, disconnect-with-confirmation via a stubbed `window.confirm`, and the previously-missing consumer Follow button). Left three test accounts (`prof-a@example.com`, `prof-b@example.com`, `prof-consumer@example.com`) in the Atlas database from manual verification — via Claude Sonnet 5.
- [2026-09-08] Added business-to-business Connections: new `Connection` model/controller/routes (`backend/src/models/Connection.js`, `connectionController.js`, `connectionRoutes.js`), a new public business-profile endpoint (`businessController.js`/`businessRoutes.js` at `/api/businesses/:id`), a connections-based homepage feed for businesses with same-industry backfill (`postController.getConnectionsFeed`, `GET /api/posts/feed`), and an auto-connect hook on collaboration acceptance (`collaborationController.respondToRequest`). Frontend: removed the static `BusinessDashboard` entirely — business Home is now a real feed (mirroring the consumer feed) with `PostCard` business names made clickable to open a new `BusinessProfileView` (Connect / Follow / send-collaboration-request, depending on viewer role) that renders inline in the main content area — not a full-page takeover, so the sidebar stays visible at all times, including on the Create page (its old "Dashboard" back-link was removed). Notifications now branches by role: businesses see/accept/reject connection requests there instead of consumer offer notifications. Added a new business-only "Collaborations" sidebar page (received/sent lists, accept/reject) — the first frontend surface for the previously-unwired collaboration backend. Settings is now a small popover next to the sidebar button (reusing the "More" menu's dropdown style) containing Log out, rather than a page. Found and fixed two bugs during verification: `ConnectButton` initially showed "Connect" even when already connected because its status loaded asynchronously after mount (fixed with a `key={connectionStatus}` remount); sidebar nav clicks didn't clear the business-profile overlay, leaving users stuck on it (fixed by routing all nav clicks through a `navigateTo` helper that clears it). Verified end-to-end via curl (industry backfill with zero connections, request → accept → connections-branch feed now includes `businesses_only` posts, collaboration accept → auto-created connection, idempotency on repeat) and in the browser (profile view with sidebar visible, Connect, Notifications accept, Collaborations page, Create with sidebar, Settings popover) — via Claude Sonnet 5.
- [2026-09-08] Flattened the redundant `backend/backend/` nesting — all backend files now live directly under `backend/` (was `backend/backend/`); no import paths changed since they were already relative. Stopped two orphaned `nodemon` watcher processes left running from an earlier session that were holding a lock on the old directory — via Claude Sonnet 5.
- [2026-09-08] Added `GET /api/user/auth/me` and `GET /api/business/auth/me` profile endpoints (reusing the existing `protect`/`requireRole` middleware) and a real Profile page — shows consumer name/bio/interests or business industry/description, plus a consumer following list (via the existing `GET /api/follows`) with unfollow support that updates the list immediately (added an optional `onChange` callback to `FollowButton`, backward compatible). Wired the Business Dashboard's "Business profile" card to open it, since businesses had no way to navigate off the dashboard before. Verified end-to-end via curl (profile fetch, role-based 403s, 401 with no token) and in the browser for both consumer and business accounts, including the unfollow flow. Left two test accounts (`testprofile2@example.com`, `testbiz2@example.com`) in the Atlas database from manual verification — via Claude Sonnet 5.
- [2026-09-08] Wired consumer post-like button to `PUT /api/posts/:id/like`, including initial liked state from the account's JWT and optimistic UI with rollback on failure; verified end-to-end (register/login, create post, like, reload, unlike) against the live MongoDB Atlas backend. Left two test accounts (`testliker@example.com`, `testbiz@example.com`) in the Atlas database from manual verification — via Claude Sonnet 5.
- [2026-09-08] Added consumer-to-business Follow model, protected follow APIs, real discovery Follow buttons, and follower-only offer notifications — via GitHub Copilot.
- [2026-09-07] Added categorized business post publishing workflow, expiry/visibility rules, and consumer offer notifications — via GitHub Copilot.
- [2026-09-07] Generated shared project state inventory and implementation status — via GitHub Copilot.
- [2026-09-07] Verified MongoDB Atlas connection and backend health endpoint — via GitHub Copilot.
- [2026-09-07] Added Login → Register → account type → role-specific registration workflow and business dashboard — via GitHub Copilot.
- [2026-09-07] Removed Reels and Messages navigation items; restricted Create to business JWT roles — via GitHub Copilot.
- [2026-09-07] Scaffolded responsive React/Vite frontend with sidebar, consumer feed, API fallback, and coming-soon pages — via GitHub Copilot.

## Last Updated

2026-09-08 (GitHub checkpoint reconciliation; latest verified commit `cd482cc`)
