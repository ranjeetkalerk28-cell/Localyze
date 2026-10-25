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
│   ├── scripts/
│   │   └── resetDatabase.js
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   ├── cloudinary.js
│       │   └── db.js
│       ├── constants/
│       │   ├── cities.js
│       │   └── username.js
│       ├── controllers/
│       │   ├── businessAuthController.js
│       │   ├── businessController.js
│       │   ├── collaborationController.js
│       │   ├── connectionController.js
│       │   ├── discoverController.js
│       │   ├── followController.js
│       │   ├── metaController.js
│       │   ├── notificationController.js
│       │   ├── postController.js
│       │   ├── storyController.js
│       │   ├── uploadController.js
│       │   └── userAuthController.js
│       ├── middleware/
│       │   ├── authMiddleware.js
│       │   ├── errorHandler.js
│       │   └── uploadMiddleware.js
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
│       │   ├── metaRoutes.js
│       │   ├── notificationRoutes.js
│       │   ├── postRoutes.js
│       │   ├── storyRoutes.js
│       │   ├── uploadRoutes.js
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
- `src/config/cloudinary.js` — Configures the Cloudinary SDK from `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` and exports the ready-to-use client.
- `src/constants/cities.js` — Static, curated list (~50) of Indian cities; the single source of truth for city validation (registration, profile updates) and the `/api/meta/cities` list the frontend's city dropdowns fetch. Standardizing on this exact list (rather than free-text city input) is what makes exact-match city filtering reliable.
- `src/constants/username.js` — Shared `USERNAME_REGEX` (3-30 chars: lowercase letters, numbers, periods, underscores) and an `isValidUsername` helper, used by both auth controllers' registration and profile-update validation.
- `src/utils/generateToken.js` — Creates JWTs containing the account ID and `user` or `business` role.
- `src/middleware/authMiddleware.js` — Verifies Bearer JWTs, loads the matching account, and enforces roles. If the token is valid but its account no longer exists (e.g. deleted after the token was issued), responds 401 directly rather than letting every downstream controller crash on a null `req.user`/`req.business`.
- `src/middleware/errorHandler.js` — Formats unhandled Express errors as JSON responses.
- `src/middleware/uploadMiddleware.js` — `multer` memory-storage config (image mimetypes only, 5MB limit) wrapped so file-type/size rejections return 400 instead of falling through to the generic 500 handler.
- `src/models/User.js` — Consumer account schema with name, a required unique `username` (lowercase, regex-validated against `constants/username.js`), email, password hash, interests, bio, avatar URL, and a required `city` (enum-validated against `constants/cities.js`) that scopes discovery and search to the account's local ecosystem.
- `src/models/Business.js` — Business account schema with business name, a required unique `username` (same validation as `User.js`), email, password hash, industry, description, logo URL, and a required `city` (enum-validated against `constants/cities.js`), same role as on `User.js`.
- `src/models/Post.js` — Business-owned categorized post schema with title, content, image URL + `imagePublicId` (Cloudinary asset id, needed to destroy the image on delete), tags, expiry (`expiresAt`, doubles as an offer's "valid until"), `validFrom` (offer-only), visibility, likes, and timestamps. Has a derived (not stored) `offerStatus` virtual (`active`/`expired`) computed from `expiresAt` vs. now, present only for `postType: 'offer'`. Also has `status` (`active`/`deleted`) and `deletedAt` — deletion is a soft-delete lifecycle transition, not a hard remove; every read query across the app filters `status: 'active'`.
- `src/models/Collaboration.js` — Business-to-business collaboration schema with pending, active, completed, and rejected lifecycle states; legacy accepted records are normalized as active in responses.
- `src/models/Notification.js` — Consumer offer notification schema with read state and post reference; expiry is not duplicated here — it's read from the populated post's `expiresAt`.
- `src/models/Follow.js` — Unique consumer-to-business relationship with indexes for follower and following lookups.
- `src/models/Connection.js` — Bidirectional business-to-business relationship (`requester`/`recipient`/`status` enum `pending|accepted|rejected`), mirroring `Collaboration.js`'s shape rather than `Follow.js`'s unique-index trick (which doesn't generalize to a symmetric pair).
- `src/controllers/userAuthController.js` — Registers (requiring a valid `city` and a unique, format-validated `username`), logs in, and returns/updates the profile (`/me`) of consumer accounts (name, username, bio, interests, avatarUrl, city). Username changes on update are re-validated and re-checked for uniqueness (excluding the account's own document) before being applied.
- `src/controllers/businessAuthController.js` — Registers (requiring a valid `city` and a unique, format-validated `username`), logs in, and returns/updates the profile (`/me`) of business accounts (businessName, username, industry, description, logoUrl, city). Same username validate-and-recheck-uniqueness behavior as `userAuthController.js` on update.
- `src/controllers/metaController.js` — Returns the static supported-cities list (`constants/cities.js`) for registration forms, profile editors, and the search city filter.
- `src/controllers/uploadController.js` — Streams an uploaded image buffer to Cloudinary (`localyze/posts` or `localyze/profiles` folder via `?type=`) and returns its hosted URL plus its `publicId` (needed later to destroy the asset).
- `src/controllers/businessController.js` — Returns a business's public profile (with follower/connection/collaboration counts, including `city` and `username`), plus its followers list, connections list, and visibility-aware posts-by-type list, for viewing any business's profile page (self or others). Also exposes `searchBusinesses` (`GET /api/businesses/search?q=&city=`) — regex name/industry match, exact-match city filter (defaults to the caller's own city when `city` is omitted); results include `username`.
- `src/controllers/postController.js` — Creates, reads, updates, deletes, and likes posts according to account role (offers require `validFrom`/`expiresAt` at creation); also serves a business's connections feed (real connections/follows are unfiltered by city; the same-industry backfill used when under-filled is scoped to the caller's own city). Delete soft-deletes the post (`status: 'deleted'`, `deletedAt` recorded) and, if the post has an `imagePublicId`, destroys the Cloudinary asset (best-effort — a Cloudinary failure is logged but doesn't fail the delete response).
- `src/controllers/storyController.js` — Returns one latest eligible post per followed business for consumers or connected business for business accounts.
- `src/controllers/notificationController.js` — Lists consumer offer notifications (filtering out ones whose linked offer post has expired or been deleted) and marks them read.
- `src/controllers/followController.js` — Creates, removes, checks, and lists consumer follows for businesses.
- `src/controllers/collaborationController.js` — Sends, lists, accepts/rejects, and completes business collaborations; activating one auto-creates (or upgrades) a Connection between the two businesses.
- `src/controllers/connectionController.js` — Sends connection requests, checks status relative to the caller, lists received pending requests, accepts/rejects, and disconnects an existing accepted connection.
- `src/controllers/discoverController.js` — Returns interest-matched posts and businesses for consumers, both scoped to the consumer's own `city` (posts are filtered to businesses located in that city before the interest/tag matching and recent-post fallback run).
- `src/routes/index.js` — Mounts authentication, posts, collaboration, connection, business-profile, upload, discovery, and meta route groups.
- `src/routes/userAuthRoutes.js` — Consumer register/login/get-me/update-me route definitions.
- `src/routes/businessAuthRoutes.js` — Business register/login/get-me/update-me route definitions.
- `src/routes/uploadRoutes.js` — `POST /image` (any logged-in account) — parses a multipart image upload and returns its Cloudinary URL.
- `src/routes/metaRoutes.js` — Public `GET /cities` route definition.
- `src/routes/businessRoutes.js` — Business search (`GET /search`, registered before `/:id` so Express doesn't swallow it as an id param), public business profile, followers, connections, and posts-by-type lookups (`GET /:id`, `/:id/followers`, `/:id/connections`, `/:id/posts`), any logged-in role.
- `src/routes/postRoutes.js` — Post CRUD, consumer like, and business connections-feed route definitions.
- `src/routes/storyRoutes.js` — Authenticated stories route definition.
- `src/routes/collaborationRoutes.js` — Business collaboration route definitions, including participant-authorized completion.
- `src/routes/connectionRoutes.js` — Business connection request/status/accept-reject/disconnect route definitions.
- `src/routes/discoverRoutes.js` — Consumer discovery route definitions.
- `src/routes/notificationRoutes.js` — Consumer notification route definitions.
- `src/routes/followRoutes.js` — Consumer follow, unfollow, status, and following-list route definitions.

### Frontend

- `src/main.jsx` — React entry point that mounts the app and global stylesheet.
- `src/App.jsx` — Auth flow, account type selection, registration forms (now including a required `CitySelect` city field for both roles), a unified feed-based homepage (consumer discovery feed or business connections feed, both city-scoped server-side), sidebar navigation (always visible for any authenticated screen, including Create and viewing a business profile), post interactions with real Cloudinary image upload (post creation and profile photos, via the shared `uploadImageFile` helper), live authenticated account summary, real clickable businesses-to-follow list, a unified `BusinessProfilePage` (self and others — wide centered header showing industry + city, evenly distributed stats, followers/connections lists, tabbed post grid, connect/disconnect/follow/edit-with-photo-and-city actions), a consumer `ProfilePage` with its own edit-with-photo-and-city form, a Collaborations page, a real `SearchPage` (name/industry text search plus a city filter defaulting to the caller's own city, calling `GET /api/businesses/search`), and remaining placeholder pages (Explore, Saved, About). `CitySelect` is a shared dropdown that fetches the canonical list from `GET /api/meta/cities` once per mount; it backs every city input in the app. `Avatar` renders a real uploaded photo when one exists, falling back to initials otherwise. Offer posts show a live `Countdown` (post card, the business's own profile post grid, and the follower notification) that flips to an "Offer expired" label once `expiresAt` passes, without the post disappearing. A business can delete its own posts from its profile post grid (confirmation prompt, then removed from local state on success) — the first delete UI in the app. No more standalone Business Dashboard.
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
- Middleware/tools: CORS, dotenv, Nodemon, multer (multipart parsing)
- Image storage: Cloudinary (SDK `cloudinary`), configured via `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` in `backend/.env`; uploads go to `localyze/posts` or `localyze/profiles` folders.
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
| Stories from followed/connected businesses | Done | Placeholder story cards were replaced with live `/api/stories` data; consumers see followed businesses and businesses see accepted connections, with profile navigation on click. |
| Business homepage feed | Done | Business "Home" is a real feed of posts from the business's accepted connections; falls back to posts from other businesses in the same industry when there are none, then to demo content if the API is unreachable. Replaces the old static Business Dashboard entirely. |
| Business-to-business connections | Done | `Connection` model (`requester`/`recipient`/`status`); send/status/accept-reject/list-received endpoints under `/api/connections`; sent from a business's profile page, accepted/rejected from the business's Notifications page. |
| Collaboration → connection auto-link | Done | Accepting a collaboration request (`PUT /api/collaborations/:id`) automatically creates (or upgrades) a `Connection` between the two businesses if one doesn't already exist — idempotent. |
| Business profile page (self & others) | Done | Unified `BusinessProfilePage` for both a business's own profile and any other business's profile, opened via the Profile nav item (self) or clicking a business's name on a post (others). Shows follower/connection/collaboration counts (`GET /api/businesses/:id`), a Followers list and a Connections list that swap in-page (`/:id/followers`, `/:id/connections` — no navigation, sidebar always usable), and a tabbed post grid (Collaborations/Promotions/Offers via `/:id/posts?postType=`, visibility-aware). Self view has a working "Edit Profile" form (businessName/industry/description) and a logo photo uploader; others show Connect/Disconnect (business viewers, with a confirmation before disconnecting) or Follow (consumer viewers — previously missing entirely). No back button. |
| Cloud image uploads (Cloudinary) | Done | `POST /api/uploads/image` (any logged-in account, `?type=post\|profile` picks the Cloudinary folder) accepts a multipart file via `multer` (memory storage, image mimetypes only, 5MB limit) and returns a hosted URL. Wired into: the post-creation "Image" field (`AddPostFlow`, replacing the old paste-a-URL input, with a preview), and profile-photo upload for both business (`logoUrl`) and consumer (`avatarUrl`) via new `PUT /api/business/auth/me` / `PUT /api/user/auth/me` endpoints. `Avatar` now renders a real photo when one exists (post headers, stories, suggestions, account summary, follower/connection lists), falling back to initials otherwise. |
| Collaborations page (frontend) | Done | New business-only sidebar item lists received (with accept/reject) and sent collaboration requests, using the previously-unwired `/api/collaborations` endpoints. |
| Categorized business posts | Done | Offer, promotion, and business-only collaboration posts are persisted with expiry and visibility rules. |
| Business post publishing workflow | Done | Category selection, category-specific details, review/edit, publish, and API persistence are wired. |
| Business post CRUD | In Progress | Create and delete are wired (delete via the business's own profile post grid); frontend edit/manage-stats screens remain. |
| Post deletion (soft-delete + Cloudinary cleanup) | Done | `DELETE /api/posts/:id` soft-deletes (`status: 'deleted'`, `deletedAt` recorded — never a hard remove, matching how Collaboration/Connection records are also kept permanently) and destroys the post's Cloudinary image via its stored `imagePublicId` (skipped gracefully for older/URL-pasted posts with none; a Cloudinary failure is logged but doesn't block the delete). Deleted posts are excluded from every read path: own post history/profile, `GET /api/posts/mine`, direct fetch by id, edit/like, the consumer discovery feed, the business connections feed, and stories; a deleted offer's follower notification is hidden too (mirroring the expiry-hides-notification behavior). Frontend: a delete (trash icon) button on each card in the business's own profile post grid, with a confirmation prompt, removing the card from view immediately on success. |
| Offer notifications | Done | Publishing an offer creates notifications for existing consumers; consumer Notifications loads them from the API and hides ones whose linked offer has expired. |
| Offer validity window, countdown, and expiry | Done | Offers require `validFrom`/`expiresAt` at creation (no other post type does). `Post.offerStatus` is a derived virtual (`active`/`expired`, never stored/cron-updated). A live `Countdown` component (updates every 60s) shows remaining time on the feed post card, the business's own profile post grid, and the follower notification — flipping to an "Offer expired" label once `expiresAt` passes. The post itself is never deleted or hidden from the business's own post history; it only drops out of the consumer discovery feed and business connections feed once expired (pre-existing feed-freshness filtering, unchanged by this feature). No price fields — offer pricing is expected to live in the post image. |
| Consumer follows business | Done | Unique Follow records, follow/unfollow/status APIs, discovery status, and UI Follow buttons are implemented. |
| Post likes | Done | Frontend like button calls `PUT /api/posts/:id/like`, reflects server like count/state, and initializes from the logged-in consumer's existing like. |
| Collaboration requests | Done | Backend send/list/respond endpoints exist and now have a frontend (Collaborations page) plus the auto-connect side effect on accept. |
| Collaboration lifecycle UI | Done | Collaborations page separates requests, active, and completed records; defaults to 2/5/3 items, supports Show more, responsive rows, clickable businesses, and completing active collaborations. |
| Username field | Done | Both `User` and `Business` now have a required, unique, format-validated `username` (3-30 chars: lowercase letters/numbers/periods/underscores). Required at registration; editable via both profile edit forms. Displayed as `@username` on the consumer `ProfilePage`, the `BusinessProfilePage` header (self and others), and business search results. Uniqueness is enforced per account type only (same as `email` already was) — see Known Issues. |
| City-based search & discovery | Done | Every account has a required `city` (enum-validated against `constants/cities.js`, a static ~50-city India list — chosen over free-text to keep filtering exact-match). Consumer discover feed/businesses and the business connections-feed backfill (not real connections/follows, which stay city-agnostic per explicit product decision) are filtered to the account's own city. A new `GET /api/businesses/search?q=&city=` endpoint powers a real Search page (name/industry text match + city filter, defaulting to the caller's own city, overridable). Profile edit forms (both roles) can change city; registration requires it. Map view of businesses noted as a future, lowest-priority idea — not built. |
| Search | Done | Sidebar "Search" now opens a real `SearchPage`: text query (name/industry) plus a city filter, backed by `GET /api/businesses/search`. |
| Explore | Coming Soon / Placeholder | Sidebar item shows a coming-soon screen; discovery feed is the current consumer home. |
| Notifications | Done | For consumers: persisted offer notifications (read action endpoint exists but no UI mark-read control). For businesses: this page now shows pending received connection requests with inline Accept/Reject instead of offer notifications. |
| Profile | Done | `GET`/`PUT /api/user/auth/me` and `GET`/`PUT /api/business/auth/me` read and update the logged-in account's profile; frontend Profile pages show name/bio/interests (consumer) or businessName/industry/description (business) with working Edit forms and photo upload, plus a consumer following list (via `GET /api/follows`) with unfollow support. Reached from the sidebar. |
| Settings | Done (minimal) | Clicking Settings in the sidebar opens a small popover (reusing the same dropdown styling as the "More" menu) with a Log out action — not a full page. This is the only logout control in the app, for both roles. |
| Saved posts | Coming Soon / Placeholder | More menu item exists; no persistence or backend endpoint exists. |
| About Localyze | Coming Soon / Placeholder | More menu item exists; informational page is not implemented. |
| Reels | Not Started | Removed from the sidebar by product request. |
| Messages | Not Started | Removed from the sidebar by product request; no messaging backend exists. |

## API Endpoints

All protected endpoints require `Authorization: Bearer <JWT>`. Role restrictions are enforced by backend middleware.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/business/auth/register` | Public | Register a business and return a business JWT. Requires a valid `city` (from `GET /api/meta/cities`) and a unique `username` (3-30 chars: lowercase letters/numbers/periods/underscores); 400 if either is missing/invalid/taken. |
| POST | `/api/business/auth/login` | Public | Authenticate a business and return a business JWT (now also includes `username`). |
| POST | `/api/user/auth/register` | Public | Register a consumer and return a consumer JWT. Requires a valid `city` (from `GET /api/meta/cities`) and a unique `username` (same format as business); 400 if either is missing/invalid/taken. |
| POST | `/api/user/auth/login` | Public | Authenticate a consumer and return a consumer JWT (now also includes `username`). |
| GET | `/api/user/auth/me` | Consumer | Return the logged-in consumer's profile (name, username, email, interests, bio, avatarUrl, city). |
| PUT | `/api/user/auth/me` | Consumer | Update the logged-in consumer's name, username, bio, interests, avatarUrl, or city (username format/uniqueness and city validated against their respective lists). |
| GET | `/api/business/auth/me` | Business | Return the logged-in business's profile (businessName, username, email, industry, description, logoUrl, city). |
| PUT | `/api/business/auth/me` | Business | Update the logged-in business's businessName, username, industry, description, logoUrl, or city (username format/uniqueness and city validated against their respective lists). |
| GET | `/api/meta/cities` | Public | Return the static supported-cities list used by registration, profile editing, and search's city filter. |
| POST | `/api/uploads/image` | Any logged-in account | Upload an image file (multipart, `image` field; `?type=post\|profile` picks the Cloudinary folder, defaults to `post`) and return `{ url, publicId }` — `publicId` lets a post later destroy this exact asset on delete. |
| GET | `/api/businesses/search` | Any logged-in account | Search businesses by name/industry (`?q=`), filtered to an exact-match `city` (`?city=`, defaults to the caller's own city when omitted). Returns up to 30 matches, including `username`. |
| GET | `/api/businesses/:id` | Any logged-in account | Return one business's public profile (businessName, username, industry, description, logoUrl, city — no email) plus followersCount/connectionsCount/collaborationsCount. |
| GET | `/api/businesses/:id/followers` | Any logged-in account | List the business's followers (consumer name/avatarUrl). |
| GET | `/api/businesses/:id/connections` | Any logged-in account | List the business's accepted connections (the other business in each). |
| GET | `/api/businesses/:id/posts` | Any logged-in account | List the business's posts, optionally filtered by `?postType=`; visibility-aware (only the owner or a connected business sees `businesses_only` posts). |
| POST | `/api/posts` | Business | Create a post owned by the logged-in business (offers require `validFrom` and `expiresAt`, returns 400 otherwise). |
| GET | `/api/posts/mine` | Business | List posts owned by the logged-in business. |
| GET | `/api/posts/feed` | Business | Return posts from the business's accepted connections, backfilled with same-industry posts from other businesses when under-filled. |
| GET | `/api/posts/:id` | Any logged-in account | Read one post with populated business information. |
| PUT | `/api/posts/:id` | Business owner | Update an owned post. |
| DELETE | `/api/posts/:id` | Business owner | Soft-delete an owned post (`status: 'deleted'`) and destroy its Cloudinary image, if any. Idempotent — 404 if already deleted. |
| PUT | `/api/posts/:id/like` | Consumer | Like or unlike a post. |
| POST | `/api/collaborations` | Business | Send a collaboration request to another business. |
| GET | `/api/collaborations/received` | Business | List received collaboration requests. |
| GET | `/api/collaborations/sent` | Business | List sent collaboration requests. |
| PUT | `/api/collaborations/:id` | Recipient business | Accept or reject a collaboration request; accepting also auto-creates/upgrades a Connection between the two businesses. |
| PUT | `/api/collaborations/:id/complete` | Either participating business | Mark an active collaboration as completed. |
| POST | `/api/connections/:businessId` | Business | Send a connection request to another business. |
| GET | `/api/connections/:businessId/status` | Business | Return `none`/`pending_sent`/`pending_received`/`connected` relative to the caller. |
| GET | `/api/connections/requests/received` | Business | List pending connection requests received by the logged-in business. |
| PUT | `/api/connections/:id` | Recipient business | Accept or reject a connection request. |
| DELETE | `/api/connections/:businessId` | Business | Remove an existing accepted connection with another business. |
| GET | `/api/discover/posts` | Consumer | Return posts matched to interests within the consumer's own city, with recent-post (same-city) fallback. |
| GET | `/api/discover/businesses` | Consumer | Return businesses in the consumer's own city, matched to consumer interests. |
| GET | `/api/notifications` | Consumer | List the latest offer notifications for the logged-in consumer. |
| PUT | `/api/notifications/:id/read` | Consumer | Mark one offer notification as read. |
| GET | `/api/follows` | Consumer | List businesses followed by the logged-in consumer. |
| GET | `/api/follows/:businessId/status` | Consumer | Check whether the consumer follows a business. |
| POST | `/api/follows/:businessId` | Consumer | Follow a business. |
| DELETE | `/api/follows/:businessId` | Consumer | Unfollow a business. |
| GET | `/api/stories` | Any logged-in account | Return the latest eligible story post for each followed business (consumer) or accepted connected business (business). |
| GET | `/` | Public | Backend health response: `API is running`. |

## Known Issues / TODOs

- The backend has no `.env.example` in the current file inventory despite README setup instructions referring to it; `.env` exists and contains sensitive configuration that must not be committed.
- Root-level `atlas-credentials.env` and `credentials.txt` are sensitive-looking files; review, rotate, and remove from the project directory or ensure they are excluded from source control.
- The frontend currently uses localStorage JWT presence and a decoded role for routing; it does not refresh, validate expiry, or fetch a current profile.
- Consumer feed demo content is shown when there is no token, the API is unavailable, or the API returns no posts.
- Frontend post saves remain local UI state only; no saved-post model or backend endpoint exists yet (likes are now backend-connected).
- Frontend edit/delete/manage-stats screens are not implemented yet.
- Offer notifications target followers only; consumers who follow after an offer is published do not receive that historical notification.
- Stories show one latest non-expired post per followed/connected business; accounts with no relationships see an empty prompt rather than fake placeholder businesses.
- Legacy collaboration documents with `accepted` status are returned as `active`; new accepts persist as `active` and only participating businesses may mark them `completed`.
- Search, saved posts, and About are placeholder pages without backend support.
- Sending a connection request or collaboration request only happens from a business's profile page — reachable now either by clicking their name on a post or via the new Search page's results, but there's no way to send a request directly from the search results list itself.
- The curated city list (`backend/src/constants/cities.js`) is India-only and fixed in code — adding a new city requires a code change/deploy, not an admin action. Businesses/consumers outside that list cannot register.
- `username` uniqueness is enforced per account type (a separate unique index on `User` and on `Business`), matching how `email` already behaves — a consumer and a business can currently register the same `@handle`. Decided to match the existing `email` convention rather than add a new cross-collection check; revisit if the product wants one global handle namespace.
- `backend/scripts/resetDatabase.js` is a manual dev-only utility (empties every collection via the configured `MONGO_URI`) — not wired into any npm script or CI step on purpose, since it's destructive and meant to be run deliberately by a human.
- The business search endpoint (`GET /api/businesses/search`) caps results at 30 with no pagination — fine at current scale, revisit if a city's business count grows past that.
- Cloudinary uploads have no server-side cleanup: if a user picks a photo/post image but never saves (abandons the edit form or the post-creation flow), the uploaded image stays in the Cloudinary account unreferenced by anything in the database.
- `POST /api/uploads/image` accepts an upload from any logged-in account with no per-endpoint rate limiting — fine for now, worth revisiting before any public deployment.
- `Connection` has no unique index (mirrors `Collaboration`'s approach) — duplicate prevention is app-level (checked in both directions) rather than DB-enforced.
- The disconnect confirmation on a business profile, and now the delete-post confirmation, both use the browser's native `window.confirm` — there is no in-app modal/dialog system yet.
- Deleted posts are kept forever (soft-delete, no retention/purge policy) — there is no admin/recovery UI to view or restore them, so they exist purely as an audit trail in the database.
- Cloudinary image deletion only happens for posts uploaded through the file-picker (`imagePublicId` set); older posts or ones with a hand-pasted `imageUrl` have no `imagePublicId` and their image (if any) is not cleaned up on delete — nothing to destroy without knowing the asset id.
- Editing a post's image (`PUT /api/posts/:id` with a new `imageUrl`/`imagePublicId`) does not destroy the previous Cloudinary asset — only full post deletion triggers cleanup; there's no edit-image UI yet anyway.
- The business profile's stats row (followers/collaborations/connections counts) doesn't live-refresh after a connect/disconnect action on that same page — only the action button's own state updates immediately.
- Expired offers still drop out of the consumer discovery feed and the business connections feed once `expiresAt` passes (pre-existing feed-freshness filter, applies to all post types) — they only remain visible on the business's own profile Offers tab, which has no expiry filter. If offers should also stay visible (marked expired) in the scrolling feeds, that filter needs a postType-aware exception.
- `Countdown` re-renders on a 60-second interval, so it's accurate to the minute, not the second — fine for the "2d 8h" / "45m" granularity currently shown, but note if second-level precision is ever wanted.
- No automated test suite is currently present.
- The backend uses broad CORS configuration and should be restricted for production deployment.
- Git repository is active on branch `main` with remote `origin` configured as `https://github.com/ranjeetkalerk28-cell/localyze-review-1.git`; the latest verified checkpoint is commit `cd482cc` (`version 1`).

## Next Steps

1. Add business manage-posts screens for edit and view stats (delete now exists).
2. Expand Settings beyond just logout (theme, notification preferences, account deletion, etc.).
3. Add request validation, centralized API client/error handling, token expiry handling, and automated backend/frontend tests.
4. Remove or secure root credential files and restrict CORS before deployment.
5. Consider a Cloudinary cleanup job (or delete-on-cancel in the frontend) for uploaded images that never get attached to a saved post/profile.
6. Decide whether expired offers should stay visible (marked expired) in the scrolling discover/connections feeds, not just the business's own profile — if so, add a postType-aware exception to those feeds' expiry filters.
7. (Lowest priority / future) Map view of businesses — would need per-business geocoded coordinates, not just the current `city` string; explicitly deferred per product decision.

## Change Log

- [2026-10-25] Fixed `protect` (`backend/src/middleware/authMiddleware.js`) returning 500s instead of 401s for a valid JWT whose account had since been deleted. Root cause: `Business.findById(decoded.id)`/`User.findById(decoded.id)` returning `null` isn't a thrown error, so the existing `try/catch` didn't catch it — `req.business`/`req.user` was left `null` and `next()` was called anyway, so every downstream controller crashed with a generic 500 the first time it dereferenced a property on the null account. Fixed at the single chokepoint rather than null-checking every controller: `protect` now checks the looked-up account and returns `401 { message: 'Not authorized, account no longer exists' }` immediately if it's `null`. Verified by minting a JWT (via `jsonwebtoken` directly, same secret/shape as `generateToken.js`) for a random `ObjectId` that was never persisted — before the fix this 500'd on `/api/posts/feed`; after the fix it correctly 401s. Confirmed no regression with a freshly registered real account, which still gets a clean 200. No data was deleted for this verification (a random nonexistent id reproduces the same `findById → null` condition as a deleted account, without touching any real document) — via Claude Sonnet 5 (forked session).
- [2026-10-25] Added a required, unique `username` field for both account types. New `backend/src/constants/username.js` exports `USERNAME_REGEX` (3-30 chars: lowercase letters, numbers, periods, underscores) and an `isValidUsername` helper, shared by both auth controllers. `User.js`/`Business.js` gained `username: { required: true, unique: true, lowercase: true, trim: true, match: USERNAME_REGEX }` — made required directly on the schema (matching the `city` precedent) since the user had already planned to truncate and re-register rather than migrate. `registerUser`/`registerBusiness` now normalize (`toLowerCase().trim()`), format-validate, and uniqueness-check the submitted username before creating the account (400 with a specific message on each failure, mirroring the existing `email`-already-registered check); both login responses now also return `username`. `updateMyProfile` (both roles) allows changing `username`, re-validating format and re-checking uniqueness excluding the account's own `_id`. Deliberately scoped uniqueness per account type (same as `email` already was) rather than adding a new cross-collection check — flagged as a Known Issue rather than silently diverging further from the existing pattern. `businessController.getBusinessById` and `searchBusinesses` both had `username` added to their `.select()` lists (the same class of bug as the earlier `city`-missing-from-select miss, caught proactively this time rather than after the fact). Frontend: both registration forms gained a required username field (placed right after the name/business-name field); both profile edit forms (`ProfilePage`, `BusinessProfilePage`) gained a username field, pre-filled and saved alongside the other profile fields; both profile headers now show `@username` (new `.profile-handle` CSS class) next to the display name; the Search page's results also show `@username` ahead of industry/city. Verified end-to-end in the browser: duplicate-username registration correctly 400s with "Username already taken"; invalid-format usernames (uppercase/spaces) are rejected client-side by the input's `pattern`/`minLength` and server-side by the regex; a successful registration round-trips through login and both profile pages, displaying the handle correctly — via Claude Sonnet 5.
- [2026-10-25] Added city-based search and discovery filtering, the app's most important feature per product direction — Localyze is explicitly a local ecosystem app, so recommendations/search/explore must be scoped to a user's city. Added `backend/src/constants/cities.js` (a static, curated list of ~50 Indian cities — chosen deliberately over free-text input or a third-party location API, since an exact-match enum is what makes city filtering reliable; scope decided as India-only for now, not global) plus a public `GET /api/meta/cities` endpoint (`metaController.js`/`metaRoutes.js`) the frontend fetches once per `CitySelect` mount. `User.js` and `Business.js` both gained a required, enum-validated `city` field (indexed) — made `required: true` directly on the schema since the user chose to truncate and re-seed the database rather than migrate existing accounts, so no onboarding-gate/backfill logic was needed. `registerUser`/`registerBusiness` now 400 if `city` is missing or not in the supported list; `updateMyProfile` (both roles) allows changing `city` with the same validation. New `searchBusinesses` (`businessController.js`, `GET /api/businesses/search?q=&city=`) does a case-insensitive regex match on `businessName`/`industry`, filtered by an exact-match `city` that defaults to the caller's own city when omitted — registered in `businessRoutes.js` as `/search` *before* `/:id so it isn't swallowed as an id param. `discoverController.discoverPosts`/`discoverBusinesses` now scope both the primary query and (for posts) the interest-fallback filler query to the consumer's own city. `postController.getConnectionsFeed`'s real connections/follows results stay unfiltered by city per explicit product decision (P.S. from the user), but the same-industry *backfill* used when connections are under-filled is now also city-scoped, since that filler is explore-content rather than a relational connection. Frontend: new shared `CitySelect` dropdown (fetches `/api/meta/cities`) used in both registration forms (now requiring city), both profile edit forms (`ProfilePage` consumer, `BusinessProfilePage` self-view — both now also display the saved city next to industry/email), and a brand-new `SearchPage` replacing the "Search" sidebar's Coming Soon placeholder — a text query (name/industry) plus a city filter that defaults to the signed-in account's own city (fetched via `/me`) and can be overridden to browse another city. Found and fixed a bug during verification: `businessController.getBusinessById`'s `.select()` didn't include `city`, so `BusinessProfilePage` silently never received it even though the field existed — fixed by adding `city` to that select list. Verified end-to-end in the browser against the live MongoDB Atlas backend: registered a business ("Mumbai Coffee Co", Mumbai) and a consumer (Mumbai) with the new required city field; confirmed the consumer's "Businesses to follow" list (`discoverBusinesses`) only surfaced the same-city business; confirmed the Search page defaults to the signed-in city, correctly excludes results when switching the city filter to Delhi, correctly matches on a partial name query ("coffee"), and correctly returns empty for a non-matching query ("pizza") rather than silently ignoring the filter; confirmed both profile edit forms pre-fill the current city, persist a changed city, and immediately reflect it in the profile header. Left two test accounts (`mumbaicoffee@example.com`, `asha.verma@example.com`) in Atlas from verification. Noted a map view of businesses as a future, lowest-priority idea per explicit user instruction — not built, needs per-business geocoded coordinates rather than just the `city` string — via Claude Sonnet 5.
- [2026-09-09] Added post deletion as a soft-delete lifecycle with real Cloudinary cleanup: `Post.js` gained `status` (`active`/`deleted`), `deletedAt`, and `imagePublicId` (the Cloudinary asset id, captured at upload time — `uploadController.uploadImage` now also returns `publicId` alongside `url`). `deletePost` (`backend/src/controllers/postController.js`) no longer hard-removes the document — it flips `status`/`deletedAt` and, if the post has an `imagePublicId`, calls `cloudinary.uploader.destroy()` in a try/catch so a Cloudinary hiccup can't block the response; skips the call entirely for posts with no stored `imagePublicId` (older/URL-pasted images). Added `status: 'active'` to every other post-reading query across the app — `getMyPosts`, `getPostById`, `updatePost`, `toggleLikePost`, `getConnectionsFeed` (both queries), `discoverController.discoverPosts` (both queries), `storyController.getStories`, and `businessController.getBusinessPosts` — this last one matters most: unlike an expired offer (which deliberately stays visible, marked expired, on a business's own profile), a deleted post must disappear even from the owner's own profile, per explicit instruction, so no exception was made there. `notificationController.getNotifications`'s existing offer-expiry filter was extended to also hide a notification when `notification.post.status === 'deleted'` — "related data handled" via the same populated-post check already in place, no new query. Frontend: `uploadImageFile`'s return value changed from a bare URL string to `{ url, publicId }`; `AddPostFlow` now threads `imagePublicId` through to `POST /api/posts` (the two profile-photo upload call sites just ignore it — that cleanup path stays a known limitation). Added the first delete UI in the app: a trash-icon button on each card in the business's own profile post grid (`BusinessProfilePage`), gated to `isOwnProfile`, with a `window.confirm` prompt (mirroring the existing disconnect-confirmation pattern) before calling `DELETE /api/posts/:id` and removing the card from local state on success — no reload needed. Verified end-to-end via curl (ownership 403, actual Cloudinary origin deletion confirmed via a one-off script calling the Admin API directly through the backend's own configured client — the CDN-fronted image URL kept returning 200 for a while after deletion purely from Cloudflare's 30-day immutable edge cache, which is expected Cloudinary/CDN behavior and not a bug; confirmed absence from `posts/mine`, direct fetch, edit, like, discover feed, connections feed, and stories; idempotent re-delete returns 404; an offer's notification disappeared on delete; a post with no `imagePublicId` still soft-deleted cleanly) and in the browser (delete button removes the card immediately, confirmed via network tab that the DELETE request actually fired rather than trusting the UI alone). Left test businesses (`delete-test@example.com`, `other-biz@example.com`) and a consumer (`delete-follower@example.com`) in Atlas from verification — via Claude Sonnet 5.
- [2026-09-09] Added the offer post lifecycle: `Post.js` gained a flat `validFrom` field (mirroring the existing `collaborationRequirements` precedent — no nested `offerDetails` sub-object) plus a derived `offerStatus` virtual (`active`/`expired`, computed from `expiresAt` vs. now, never stored or cron-updated — `expiresAt` doubles as the offer's "valid until", no new/duplicate expiry field). `createPost` now requires `validFrom`+`expiresAt` for `postType: 'offer'` (400 otherwise); `updatePost` accepts `validFrom`. `getNotifications` filters out notifications whose linked offer has expired, reading the expiry off the already-populated `post.expiresAt` rather than duplicating it onto `Notification` — the same timestamp drives both the post's and the notification's countdown, so they can never drift apart. Frontend: new shared `getCountdownParts`/`Countdown` helpers (self-ticking every 60s) render "Offer ends in Xd Xh" or an "Offer expired" label on the feed post card, the business's own profile Offers-tab grid, and the follower notification (the last one per explicit request — "make sure the timer is visible in the notification"). `AddPostFlow` gained a required "Valid from" date field for offers (existing "Valid until" is now required only for offers) — no price fields anywhere, per instruction that pricing lives in the post's photo. Deliberately did NOT nest offer fields under a sub-document and did NOT add a stored/cron-driven status, per the plan's stated reasoning (matches the user's own "derive the countdown, don't store it" principle, applied consistently to status too). Verified end-to-end via curl (validation 400, `offerStatus` flips from `active` to `expired` purely by reading the clock — no write — after a real 90-second-expiry test offer passed its `expiresAt`; the matching notification disappeared from `GET /api/notifications` at the same moment; a non-offer post still publishes fine with `validFrom` absent) and in the browser (live countdown on the post card and notification, "Offer expired" label appearing on an already-expired post that remains visible in the business's own Offers tab). Found and fixed a real gap during verification: the pre-existing discover/connections-feed queries filter out expired posts entirely for all post types, which would have made the "expired" UI state unreachable from the main feed — the business's own profile Offers tab has no such filter, so that's the surface used to satisfy "post remains in history, marked expired"; logged as a Known Issue/Next Step in case expired offers should also stay in the scrolling feeds. Left test accounts (`offer-test@example.com`, `offer-follower@example.com`) in Atlas from verification — via Claude Sonnet 5.
- [2026-09-09] Added Cloudinary-backed image uploads: `backend/src/config/cloudinary.js` (SDK setup), `backend/src/middleware/uploadMiddleware.js` (`multer` memory storage, image-mimetype + 5MB validation, wrapped to return 400 on rejection instead of the generic 500), `backend/src/controllers/uploadController.js` + `uploadRoutes.js` (`POST /api/uploads/image`, folder picked via `?type=post|profile`). Added `PUT /api/user/auth/me` and `PUT /api/business/auth/me` (whitelisted-field updates via the existing `req.user`/`req.business` documents already loaded by `protect` — confirmed empirically that `.save()` doesn't choke on the `password` field being excluded by `.select('-password')`, since Mongoose skips required-validation for unselected paths). Frontend: `AddPostFlow`'s post-image field is now a real file picker (with preview) instead of a paste-a-URL text input, using a new shared `uploadImageFile(token, file, type)` helper. Both `BusinessProfilePage` (self) and consumer `ProfilePage` got working "Edit Profile" forms (previously a dead button on the business side, nonexistent on the consumer side) with a photo-upload control wired to the same helper. `Avatar` now renders a real `<img>` when a `logoUrl`/`avatarUrl` is available (post headers, stories, suggested-businesses, account summary, followers/connections lists), falling back to initials otherwise. This was built as a guided/teaching session per the user's request to learn by doing — see memory `feedback_guided_implementation`. Verified end-to-end via curl (real image upload to both Cloudinary folders, confirmed publicly loadable, negative checks for missing file/wrong role/non-image type, profile PUTs persisting and round-tripping through GET) and in the browser (both edit forms open pre-filled, save, and persist; photo rendering confirmed on the business profile). Noted in passing: an existing post from account "SP Cafe" in the shared Atlas database contains solicitation text and a phone number — flagged to the user, not modified, since it's pre-existing user content unrelated to this task. Left test accounts (`upload-test@example.com`, `photo-consumer@example.com`) in Atlas from verification — via Claude Sonnet 5.
- [2026-09-08] Replaced placeholder story cards with a role-aware stories API and live stories from followed or connected businesses; each story opens the business profile — via GitHub Copilot.
- [2026-09-08] Replaced hardcoded Avery Morgan/demo suggestions with the authenticated account summary and real businesses from discovery; business names/avatars now open clickable business profiles and fake fallback businesses were removed — via GitHub Copilot.
- [2026-09-08] Added outside-click dismissal for the Settings popover while preserving clicks inside the menu; frontend build passed — via GitHub Copilot.
- [2026-09-08] Added active/completed collaboration lifecycle states, participant completion endpoint, and responsive collaboration sections with 2/5/3 default limits, Show more controls, and clickable business profiles — via GitHub Copilot.
- [2026-09-08] Redesigned self and other business profiles into a wider, evenly distributed responsive layout with centered header content, balanced stats, full-width tabs, and a responsive post grid; corrected a class-targeting issue so the layout applies to `BusinessProfilePage` rather than consumer `ProfilePage` — via GitHub Copilot.
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

2026-10-25 (auth middleware fix: clean 401 for a deleted account's still-valid token)
