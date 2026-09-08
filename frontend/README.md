# Localyze frontend

Instagram-style social discovery UI for the Localyze backend.

## Run

```bash
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:5000`.

## Structure

```text
frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── App.jsx        # App shell, sidebar, feed, and coming-soon pages
    ├── main.jsx       # React entry point
    └── styles.css     # Responsive visual system and layout
```

To load live discover posts, put a JWT from the backend in local storage under `localyze_token`. Without a token, the UI uses demo content so the experience is still reviewable.
