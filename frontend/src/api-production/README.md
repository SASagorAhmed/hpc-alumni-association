# API base URL (`api-production`)

## Folder structure

```
src/
  api-production/
    api.js          ← exports `API_BASE_URL`
    README.md       ← this file
```

## Usage

```tsx
import { API_BASE_URL } from "@/api-production/api.js";

const res = await fetch(`${API_BASE_URL}/api/public/your-endpoint`);
```

## Environment variables

| File               | Purpose                          |
| ------------------ | -------------------------------- |
| `.env`             | Local development                |
| `.env.production`  | `vite build` (production mode)   |
| Vercel dashboard   | Hosting (same variable name)     |

Variable name: **`VITE_API_URL`**

> Vite only exposes env vars that start with `VITE_` to the browser.

## Vercel

1. Project → **Settings** → **Environment Variables**
2. Add `VITE_API_URL` = `https://your-api.example.com` (no trailing slash)
3. Redeploy
