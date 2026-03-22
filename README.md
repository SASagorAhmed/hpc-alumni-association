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
