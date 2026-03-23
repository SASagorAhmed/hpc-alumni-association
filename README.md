# HPC Alumni Association — monorepo

Single repository with **frontend** (Vite + React) and **backend** (Node + Express).

```
├── frontend/     # npm run dev | npm run build
├── backend/      # npm run dev | npm start
└── README.md
```

## Connect to a new Git remote (GitHub / GitLab / etc.)

1. **Create an empty repository** on GitHub (no README/license if you already have local files).

2. In this folder (`HPC alumni association`), run:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: frontend + backend"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```

3. If you **already had Git only inside `frontend/`**, remove the nested repo first:
   - Delete `frontend/.git` (keep `frontend/.gitignore`), then run the steps above from the **root** folder.

## Environment

- Copy `backend/.env.example` → `backend/.env` and configure locally (do not commit `.env`).
- Configure `frontend/.env` / `.env.production` for API URL as needed.

## Scripts

| App      | Dev           | Start / build   |
|----------|---------------|-----------------|
| Frontend | `cd frontend && npm run dev`  | `npm run build` |
| Backend  | `cd backend && npm run dev`   | `npm start`     |

## Deploy guide (Render backend + Vercel frontend)

This repo is now prepared with:
- `render.yaml` for Render Blueprint deployment of the backend.
- `frontend/vercel.json` for Vercel SPA deployment with Vite.
- `backend/.env.render.example` as a Render production env template.
- `frontend/.env.vercel.example` as a Vercel env template.

### 1) Deploy backend on Render

1. Push this repo to GitHub.
2. In Render, create a new Blueprint service from this repo (it will read `render.yaml`).
3. Set backend environment variables in Render (Service > Environment):
   - `PORT=10000` (Render default internal port works with your app too, but explicit is clearer)
   - `FRONTEND_ORIGIN=https://YOUR_VERCEL_DOMAIN`
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `DB_SSL_MODE` (if your DB requires SSL)
   - `DB_SSL_CA` or `DB_SSL_CA_PATH` (if required by provider)
   - `JWT_SECRET`, `JWT_EXPIRES_IN`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`
4. Deploy and verify:
   - `https://YOUR_RENDER_DOMAIN/health`
   - `https://YOUR_RENDER_DOMAIN/db-health`

### 2) Deploy frontend on Vercel

1. In Vercel, import the same GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Vercel will use `frontend/vercel.json` and build the Vite app.
4. Add environment variable in Vercel:
   - `VITE_API_URL=https://YOUR_RENDER_DOMAIN`
5. Deploy and open the site.

### 3) CORS + OAuth final check

- In Render backend env, ensure `FRONTEND_ORIGIN` exactly matches your Vercel URL (no trailing slash).
- If using Google OAuth, set:
  - `GOOGLE_CALLBACK_URL=https://YOUR_RENDER_DOMAIN/api/auth/google/callback`
  - Add this same callback URL in Google Cloud Console.

### 4) Quick production checklist

- Backend `/health` returns 200.
- Frontend network calls go to Render domain (not localhost).
- Login/session APIs work with credentials/cookies across origins.
