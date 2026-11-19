# Localyze Frontend — Product and UX Brief

This document explains Localyze to a product designer or AI design model. Use it as the product and interaction brief when creating or redesigning frontend screens. The current implementation is the source of truth for shipped features; do not treat ideas that are not listed as implemented features.

## 1. Product overview

Localyze is a hyperlocal community platform connecting consumers with independent businesses and helping local businesses find one another. It combines:

- Consumer discovery of local businesses, offers, promotions, and collaboration posts.
- Business profiles, publishing, and audience building.
- Consumer-to-business follows and business-to-business connections.
- Direct collaboration requests that can become active partnerships.

It is more than a static business directory: the main product loop is **discover → engage → connect → collaborate**.

## 2. Users and permissions

There are two account types. The account role changes the feed, navigation, profile actions, and notifications.

### Consumer

- Creates a personal profile with name, username, city, optional interests, bio, and avatar.
- Discovers posts and businesses in their city; interests help personalize discovery.
- Follows businesses and sees followed businesses' content in their home feed.
- Can like and comment on posts, and save posts for later.
- Can browse saved and liked posts from their profile; Saved is also available from More.
- Receives business updates and offer notifications.

### Business

- Creates a business profile with business name, username, industry, city, description, and logo.
- Publishes offers, promotions, and business-only collaboration posts.
- Connects with other businesses, sends direct collaboration requests, and manages collaborations.
- Can edit its profile and manage its own posts.
- Sees a connections feed, incoming connection requests, and business collaboration activity.
- Does not have consumer-only saved-post controls.

### Role and access rules

| Capability | Consumer | Business |
|---|---:|---:|
| Home feed, Search, Explore, Notifications, Profile | Yes | Yes |
| Follow a business | Yes | No |
| Save a post / Saved collection | Yes | No |
| Like and comment on posts | Yes | Yes |
| Create, edit, and delete business posts | No | Own posts |
| Connect to another business | No | Yes |
| Send and manage collaboration requests | No | Yes |

## 3. Information architecture

The authenticated app is a single-page experience. The current implementation switches views in React state rather than navigating between URL routes.

### Main navigation

- **Home** — role-specific feed.
- **Search** — find businesses by name or industry and city.
- **Explore** — discovery feed, including businesses/posts that are not already followed or connected.
- **Notifications** — consumer updates or business connection requests.
- **Create** — business-only post creation.
- **Collaborations** — business-only collaboration inbox and tracker.
- **Profile** — the signed-in consumer or business profile.
- **More** — opens Saved (consumer only) and About Localyze.
- **Settings** — currently exposes Log out.

Selecting a business from a post, story-style shortcut, or search result opens its profile inside the app. A back control returns to the previous business profile or the underlying view.

## 4. Pages and key UI elements

### Sign in and registration

The unauthenticated screen is a branded login panel, not a public marketing landing page.

- Login lets the visitor switch between Consumer and Business before entering email and password.
- Registration first asks for an account type, then shows the relevant form.
- Consumer registration asks for name, username, email, password, city, and optional comma-separated interests.
- Business registration asks for business name, username, email, password, industry, and city.
- Registration ends with a confirmation and directs the new member to log in.
- Validation and API errors appear in the form.

The current frontend does not implement password recovery.

### Home

Home is the primary activity feed.

- Consumer heading: “Fresh from your people”; the feed is based on followed-business posts.
- Business heading: “Fresh from your connections”; the feed shows posts from connected businesses.
- A horizontal stories-style row provides quick access to business profiles. It is not a separate story composer/viewer workflow.
- Posts use the shared post card described below.
- Consumer right rail shows an account summary and suggested businesses.
- Business right rail prompts the member to visit business profiles to connect or request collaboration.
- Empty states guide consumers to Search and explain when a business has no connection posts.

### Search

- Search field filters businesses by name or industry.
- City selector scopes results; it initially uses the signed-in account’s city.
- Results show a business avatar/logo, name, username, industry, and city.
- Selecting a result opens that business profile.
- Search is a business directory, not a general post search.

### Explore

- Consumer copy describes posts matched to city and interests, including businesses they do not follow yet.
- Business copy describes nearby or industry-related businesses and posts.
- Shows post cards, loading and retry states, and a tailored empty state.
- Post saves are available to consumers.

### Shared post card

Post cards appear in Home, Explore, Saved, consumer profile collections, and business-profile post details.

- Business avatar/logo, name, industry, and publication date.
- Image, or a branded placeholder if no image is present.
- Post type badge: Offer, Promotion, or Collaboration.
- Offer validity/countdown when dates are present, including an expired state.
- Title, body, and topic tags.
- Like count and like action; comments open in a dialog with the discussion and a comment form.
- Save/bookmark action for consumers only.
- Business name opens the business profile.

### Business profile

The profile is used both for a member’s own business and for viewing another business.

- Header: logo/avatar, business name, username, industry, and city.
- Profile statistics: followers, collaborations, and connections.
- Description and three post tabs: Collaborations, Promotions, and Offers.
- Post tiles open a full post dialog.
- Owners can edit profile details, change their logo, and edit or delete their own posts.
- A consumer visitor can Follow/Unfollow.
- A business visitor can Connect, view connection status, and send a direct collaboration request with a message.
- Followers and connections are available as profile subviews.

### Consumer profile

- Profile header with avatar, name, username, and city.
- Edit profile: username, bio, interests, and city; avatar upload is available from the profile image.
- Shows followed businesses, saved posts, and liked posts.
- Saved and liked collections use the shared post card.
- Empty states link back to discovery.

### Create post (business only)

The post composer is a three-stage flow:

1. **Choose type:** Offer, Promotion, or Collaboration.
2. **Enter details:** headline and description; optional image; comma-separated tags; relevant dates. Collaboration requires collaboration requirements; offers require valid-from and valid-until dates.
3. **Review and publish:** preview audience/type, image, copy, requirements, tags, and offer timing before publishing.

Post audience is determined by type: Collaboration posts are business-only; Offers and Promotions are visible to consumers and businesses. Successful publishing returns to Home. Image upload includes progress, preview, and error feedback.

### Notifications

- Consumer notification list shows business updates and may show offer expiry information.
- Business notification view is a connection-request inbox with requester business details and Accept/Reject actions.
- Include loading, empty, and retryable/error feedback where data is unavailable.

### Collaborations (business only)

The collaboration hub groups activity into:

- **New collaboration requests** — received pending requests, with Accept and Reject actions.
- **Active collaborations** — accepted partnerships, with a Mark completed action.
- **Completed collaborations** — read-only history.

Rows show the other business, request message, and status; business names open profiles. Sections can expand when there are more rows than the initial preview.

The direct-request flow is: open another business profile → write a message → Send request → recipient reviews it in Collaborations → Accept or Reject → accepted request becomes Active → either side can mark it completed.

### About Localyze

An in-app explainer presents the people/business/collaboration ecosystem and links back to discovery. It is accessible from More.

## 5. Primary activity flows

### Consumer discovery and engagement

1. Register as a consumer with a city and optional interests, then log in.
2. Browse Home for followed-business posts or Explore for broader local discovery.
3. Search businesses by name/industry and city, or open a business profile from a post.
4. Follow a business to build a local feed and see its profile/stories-style shortcut.
5. Like or comment on posts; save useful posts to revisit them.
6. Review saved/liked items on Profile or Saved; review business updates in Notifications.

### Business publishing and audience growth

1. Register as a business with its city and industry, then log in.
2. Complete the business profile and discover nearby businesses through Search/Explore.
3. Create an Offer, Promotion, or Collaboration post; add details, dates/tags, and optional image.
4. Review the post and publish it to the audience associated with its type.
5. Review the post on the business profile and edit or remove it when needed.
6. Build a network through business connections; posts from connected businesses appear on Home.

### Business connections and collaboration

1. Find another business through Search, Explore, a post, or a connection.
2. Open its business profile and send a Connect request.
3. The recipient reviews the request in Notifications and accepts or rejects it.
4. Once connected, either business can send a direct collaboration request with a message.
5. The recipient accepts or rejects in Collaborations.
6. Accepted collaborations appear under Active; mark them completed to move them to Completed.

### Account and session

- Successful login stores the JWT in browser local storage under `localyze_token`.
- The token identifies account role and is sent to protected API endpoints.
- A 401 response while loading Home logs the member out.
- Log out is under Settings and clears the stored token.

## 6. Design direction

The existing visual language is warm, editorial, and community-oriented rather than a generic admin dashboard.

- **Canvas:** warm off-white (`#f8f7f2`) with paper-like cards (`#fffefa`).
- **Text:** charcoal (`#252525`) with muted warm gray secondary text.
- **Accent:** coral (`#ee725e`) for emphasis and active engagement; blue (`#3578ad`) for links/secondary actions.
- **Typography:** expressive Georgia-style serif headings paired with a clean sans-serif for labels, metadata, and body copy.
- **Surfaces:** subtle borders, soft shadows, rounded post cards, and generous whitespace; avoid dense dashboard chrome.
- **Imagery:** business photography and logos are important to discovery. Preserve a clear fallback when no image is available.
- **Content tone:** welcoming, local, human, and practical. Use concise labels and reassuring empty states.

Keep the distinction between the two account journeys visually clear while preserving a shared Localyze identity and shared post patterns.

## 7. Interaction and responsive UX requirements

- Always show which navigation item is active and which account type is signed in.
- Preserve visible loading, empty, success, and error states for data-driven pages and actions; provide retry when applicable.
- Disable actions while requests/uploads are in progress and reflect pending states (for example, Requested, Following, or Connected).
- Confirm destructive or relationship-ending actions before completing them.
- Use clear form labels, required/optional hints, inline validation, and actionable error text.
- Keep keyboard focus visible, controls labelled, and dialogs dismissible and accessible.
- On narrow screens, replace the fixed desktop sidebar with bottom navigation; hide the right rail and keep feed content readable.
- Stack forms and post-type choices on mobile; keep profile statistics, tabs, cards, and collaboration actions usable at small widths.
- Design for empty networks as a normal starting state: suggest a meaningful next action instead of presenting a dead end.

## 8. Data and integration boundaries

The frontend is a React + Vite client. The Express backend and MongoDB persist accounts, posts, follows, connections, collaborations, notifications, and saved posts. Images are uploaded through the backend and stored with the configured image service.

- API base URL: `VITE_API_BASE_URL`; defaults to `/api`.
- The Vite development server proxies `/api` to `http://localhost:5000`.
- Protected calls use the JWT from `localyze_token`.
- City choices come from the backend metadata endpoint.
- Discovery matching uses consumer city/interests and business city/industry, as supported by the backend.
- Posts have `offer`, `promotion`, or `collaboration` type; offers can have valid-from/expiry dates.
- Important API areas used by the UI: auth/profile, posts/comments/likes, discover, businesses, follows, connections, collaborations, notifications, saved posts, stories, uploads, and city metadata.

Do not invent additional form fields, filters, state transitions, or data such as ratings, messaging, checkout, or booking. If a design proposal needs new functionality, mark it as a product change rather than implying it already exists.

## 9. Current scope boundaries

Some older workflow notes describe ideas beyond the shipped frontend. These are **not current screens or flows** and should not be added as if implemented:

- Admin dashboard, business verification, moderation, analytics, or reporting.
- Password reset/recovery.
- A standalone public marketing/landing page before login.
- Contact-business workflow or in-app direct messaging.
- Advanced directory filters (category/business type/date) beyond the current name/industry and city search.
- A separate collaboration-post application workflow; the current request action is a direct message from one business profile to another.

## 10. Frontend structure and running locally

```text
frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── App.jsx        # app shell, account flows, pages, shared UI and API interactions
    ├── main.jsx       # React entry point
    └── styles.css     # visual system, layouts, components and responsive rules
```

Run the frontend from this directory:

```bash
npm install
npm run dev
```

Vite serves the frontend at `http://localhost:5173`. Start the backend separately at `http://localhost:5000` for authenticated data and API-backed flows. For a deployed frontend, set `VITE_API_BASE_URL` to the backend API base URL.
