/**
 * Single source of truth for your backend URL in Vite.
 *
 * Set `VITE_API_URL` in:
 * - `.env` (local dev)
 * - `.env.production` (production builds)
 * - Vercel → Project → Settings → Environment Variables
 *
 * @example
 * import { API_BASE_URL } from "@/api-production/api.js";
 * const res = await fetch(`${API_BASE_URL}/api/public/notices`);
 */

const raw =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

/** Base URL with no trailing slash */
export const API_BASE_URL = String(raw).replace(/\/+$/, "");
