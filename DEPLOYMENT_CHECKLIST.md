# Railway Deployment Checklist

## Architecture

React
↓
Railway

Express + Node
↓
Railway

MongoDB
↓
MongoDB Atlas

## Recommended setup

- Frontend: separate Railway service
- Backend: separate Railway service
- Database: MongoDB Atlas managed cluster
- Secrets: stored as Railway environment variables
- CORS: allow only the production frontend domain

## 1) MongoDB Atlas setup

- [ ] Create a MongoDB Atlas cluster
- [ ] Create a database user
- [ ] Set a secure password
- [ ] Whitelist Railway IPs or configure access properly
- [ ] Copy the Atlas connection string
- [ ] Save as `MONGO_URI` in Railway backend environment variables

Example:

```bash
mongodb+srv://<user>:<password>@cluster.mongodb.net/localyze?retryWrites=true&w=majority
```

## 2) Backend deployment on Railway

- [ ] Create a Railway project
- [ ] Add a new service for the backend folder
- [ ] Connect the repo or folder
- [ ] Set build command:

```bash
npm install
```

- [ ] Set start command:

```bash
npm start
```

- [ ] Add backend environment variables:
  - [ ] PORT
  - [ ] MONGO_URI
  - [ ] JWT_SECRET
  - [ ] CLOUDINARY_CLOUD_NAME
  - [ ] CLOUDINARY_API_KEY
  - [ ] CLOUDINARY_API_SECRET
  - [ ] NODE_ENV=production
  - [ ] CLIENT_URL=https://your-frontend-domain.com

- [ ] Deploy backend service
- [ ] Confirm health endpoint responds

## 3) Frontend deployment on Railway

- [ ] Create a second Railway service for the frontend folder
- [ ] Connect the repo or folder
- [ ] Set build command:

```bash
npm install && npm run build
```

- [ ] Set start command:

```bash
npm run preview -- --host 0.0.0.0 --port $PORT
```

- [ ] Add frontend environment variable:
  - [ ] VITE_API_BASE_URL=https://your-backend.up.railway.app

- [ ] Deploy frontend service
- [ ] Verify app loads correctly

## 4) Production config

- [ ] Update backend CORS to allow the production frontend domain
- [ ] Ensure frontend uses the deployed backend URL, not local proxy
- [ ] Confirm API routes resolve correctly from production frontend
- [ ] Verify JWT auth works in production
- [ ] Verify Cloudinary upload endpoint works in production
- [ ] Verify MongoDB connection works from Railway backend

## 5) Testing checklist

- [ ] Register a consumer
- [ ] Login as consumer
- [ ] Register a business
- [ ] Login as business
- [ ] View discovery/feed pages
- [ ] Create a post
- [ ] Upload an image
- [ ] Test follow / unfollow
- [ ] Test connection request flow
- [ ] Test collaboration flow
- [ ] Test notifications
- [ ] Verify logout behavior

## 6) Optional hardening

- [ ] Add custom domains for frontend and backend
- [ ] Set production mode for all services
- [ ] Review rate limits for uploads
- [ ] Review security headers and CORS policies
- [ ] Add staging environment if needed
- [ ] Keep secrets out of git

## 7) Final sign-off

- [ ] Backend is live on Railway
- [ ] Frontend is live on Railway
- [ ] Database is live on MongoDB Atlas
- [ ] All critical workflows tested
- [ ] Secrets are managed securely
- [ ] Deployment documentation is saved for future use
