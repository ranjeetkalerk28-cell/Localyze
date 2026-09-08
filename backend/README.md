# Backend

Node.js/Express backend with two account types (Business, User), JWT auth, and three features:
- **Posts** — businesses create/manage posts
- **Collaboration** — businesses send/accept/reject collaboration requests with each other
- **Discover** — users discover posts and businesses matched to their interests

## Setup

```bash
npm install
cp .env.example .env   # fill in your MongoDB URI and JWT secret
npm run dev
```

## API Overview

### Business Auth
- `POST /api/business/auth/register`
- `POST /api/business/auth/login`

### User Auth
- `POST /api/user/auth/register`
- `POST /api/user/auth/login`

### Posts (business creates, user can like)
- `POST /api/posts` — business only
- `GET /api/posts/mine` — business only
- `GET /api/posts/:id` — any logged-in account
- `PUT /api/posts/:id` — business only, owner
- `DELETE /api/posts/:id` — business only, owner
- `PUT /api/posts/:id/like` — user only

### Collaboration (business only)
- `POST /api/collaborations` — send a request
- `GET /api/collaborations/received`
- `GET /api/collaborations/sent`
- `PUT /api/collaborations/:id` — accept/reject

### Discover (user only)
- `GET /api/discover/posts` — matched by `tags` vs user `interests`
- `GET /api/discover/businesses` — matched by `industry` vs user `interests`

All protected routes require `Authorization: Bearer <token>` header.
