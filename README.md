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

## Deploy guide (Vercel backend + Vercel frontend)

This repo is now prepared with:
- `backend/vercel.json` for backend serverless routing.
- `backend/api/index.js` serverless entrypoint for the Express app.
- `frontend/vercel.json` for Vite frontend deployment.
- `backend/.env.vercel.example` as a backend env template.
- `frontend/.env.vercel.example` as a frontend env template.

### 1) Deploy backend on Vercel

1. Push this repo to GitHub.
2. In Vercel, create a new project from this repo.
3. Set **Root Directory** to `backend`.
4. Add backend environment variables using `backend/.env.vercel.example`:
   - `FRONTEND_ORIGIN=https://YOUR_FRONTEND_VERCEL_DOMAIN`
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `DB_SSL_MODE`, `DB_SSL_CA`, `DB_SSL_CA_PATH`, `DB_SSL_REJECT_UNAUTHORIZED` (if needed)
   - `JWT_SECRET`, `JWT_EXPIRES_IN`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`
5. Deploy and verify:
   - `https://YOUR_BACKEND_VERCEL_DOMAIN/health`
   - `https://YOUR_BACKEND_VERCEL_DOMAIN/db-health`

### 2) Deploy frontend on Vercel

1. Create another Vercel project from the same repo.
2. Set **Root Directory** to `frontend`.
3. Add frontend environment variable:
   - `VITE_API_URL=https://YOUR_BACKEND_VERCEL_DOMAIN`
4. Deploy and open the site.

### 3) CORS + OAuth final check

- In backend Vercel env, ensure `FRONTEND_ORIGIN` exactly matches your frontend Vercel URL (no trailing slash).
- If using Google OAuth, set:
  - `GOOGLE_CALLBACK_URL=https://YOUR_BACKEND_VERCEL_DOMAIN/api/auth/google/callback`
  - Add this same callback URL in Google Cloud Console.

### 4) Quick production checklist

- Backend `/health` returns 200.
- Backend `/db-health` returns DB connected.
- Frontend network calls go to backend Vercel domain (not localhost).
- Login/session APIs work with credentials/cookies across origins.
