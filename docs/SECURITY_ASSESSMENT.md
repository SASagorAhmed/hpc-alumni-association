# Security assessment

**Scope:** Repository review and follow-up mitigations.  
**Purpose:** Summarize security posture and track fixes.

---

## 0. Mitigations implemented (backend)

The following items from earlier findings were addressed **without changing frontend layout or user-visible flows** (except stricter production boot and rate limits under abuse):

| Item | Change |
|------|--------|
| Public committee PII | `GET /api/public/committee/active`, `.../terms/:id`, `.../committee-members`, `.../committee-members/:id` no longer return phone, email, social URLs, location, expertise. Structured committee payloads sanitize nested `members`. |
| Public election votes | `GET /api/public/elections/:id/votes` returns only `id, election_id, post_id, candidate_id, created_at` (no `voter_id`). Counts and admin dashboards that only aggregate by candidate/post are unchanged. |
| Google OAuth JWT in URL | OAuth redirect keeps `oauth_handoff=1` only; JWT is read via **httpOnly cookie** + `POST /api/auth/oauth-handoff` (existing Login behavior). |
| Verification link in API | If SMTP fails on **register**, `verification_url` is included **only when `NODE_ENV !== 'production'`**. |
| JWT secret in production | `app.js` **exits** on boot if `NODE_ENV=production` and `JWT_SECRET` is missing, default `change_me`, or shorter than 32 characters. |
| Auth brute force | **Rate limits:** login (60/15 min/IP), register (25/hour/IP), resend-verification (12/hour/IP). |

Remaining items (CORS strictness, upload MIME hardening, dependency audits, etc.) are still recommended as in the sections below.

---

## 1. Executive summary

The codebase uses **Helmet**, **parameterized SQL** in the routes reviewed, **JWT bearer** authentication for protected APIs, **bcrypt** for passwords, **admin checks** via `user_roles`, and **field allowlists** for profile updates. Section §0 addressed the **public committee/vote exposure** and **OAuth JWT-in-URL** items; other topics in §4–§8 (CORS, uploads, dependencies, etc.) remain relevant. Run **`npm audit`** regularly (§8).

---

## 2. Architecture (security-relevant)

| Area | Notes |
|------|--------|
| **Backend** | Node/Express (`backend/src/app.js`): CORS, `express.json` (2 MB limit), `cookie-parser`, Passport (Google OAuth). |
| **Auth** | JWT signed with `JWT_SECRET`, passed as `Authorization: Bearer`. Google OAuth uses short-lived **httpOnly** cookie + `POST /oauth-handoff` (JWT not placed in redirect URL). |
| **Database** | MySQL; queries typically use `?` placeholders. |
| **Frontend** | Vite/React; API base URL from `VITE_API_URL` (public build-time variable — **not** a secret). |
| **Uploads** | Multer (memory) → Cloudinary; module allowlist for admin vs `profile` for users. |

---

## 3. Positive findings

- **HTTP security headers:** `helmet()` is applied globally.
- **SQL injection (reviewed paths):** Most database access uses bound parameters. Dynamic `UPDATE profiles SET ${updates.join(...)}` builds column names from a fixed **allowlist** (`auth.js` profile route), not user-controlled identifiers.
- **Password storage:** `bcryptjs` with cost factor **12** (`backend/src/auth/password.js`).
- **Admin authorization:** Admin routes in `adminContent.js` use `withAdmin()` (checks `user_roles` for `admin`). `adminUploads.js` restricts non-`profile` modules to admins. Committee admin module uses similar patterns.
- **Committee member profile:** `GET /api/public/committee/member/:id` intentionally splits **public** vs **sensitive** fields and gates sensitive data on a **valid Bearer token** and `profiles.verified` — good pattern.
- **Email enumeration:** `resend-verification` returns a generic success message when the user does not exist.

---

## 4. Notable risks and data-exposure issues

Severity labels are **relative** (operational impact × likelihood); tune to your threat model.

### 4.1 High — Public committee listing may expose PII — **mitigated (§0)**

**Location:** `backend/src/routes/publicContent.js` — committee list, by-id, and structured committee payloads.

**Resolved:** Public responses now use an explicit column list / sanitizer so phone, email, social URLs, location, and expertise are not returned on unauthenticated public routes. Re-verify after schema changes (new sensitive columns).

---

### 4.2 High — Public election votes expose voter-level data — **mitigated (§0)**

**Location:** `GET /api/public/elections/:id/votes`

**Resolved:** Public endpoint returns tally-safe columns only (`id, election_id, post_id, candidate_id, created_at`); **`voter_id` is omitted**. Admin/internal flows that need voter linkage should continue using authenticated admin routes.

---

### 4.3 Medium — JWT in URL after Google OAuth redirect — **mitigated (§0)**

**Resolved:** Callback redirect no longer includes `jwt` in the query string; the **httpOnly** cookie + `POST /api/auth/oauth-handoff` path is used (existing frontend already supports this when `oauth_handoff=1`).

---

### 4.4 Medium — Default / weak secrets and configuration — **partially mitigated**

**Location:** `backend/src/app.js` (production boot check), `backend/src/config/env.js`

**Observation:** Weak `JWT_SECRET` in production now **stops the process** (see §0). Still ensure real deployments use a **high-entropy** secret and rotate after any leak.

---

### 4.5 Medium — Registration exposes verification link when email fails — **mitigated (§0)**

**Resolved:** `verification_url` is returned only when **`NODE_ENV !== 'production'`**.

---

### 4.6 Medium — Application-level rate limiting — **partially mitigated**

**Observation:** **Login**, **register**, and **resend-verification** now have per-IP limits (§0). Other routes (e.g. **`/verify-email`**, bulk public reads, uploads) may still benefit from edge or additional limits.

**Recommendation:** Add WAF/CDN limits where possible; consider **`trust proxy`** configuration when behind a reverse proxy so per-IP limits stay accurate.

---

### 4.7 Low–medium — CORS and production origins

**Location:** `backend/src/app.js`

**Observation:** `FRONTEND_ORIGIN` may be a comma-separated list; additionally **`https://*.vercel.app`** is allowed via regex.

**Risk:** Any Vercel preview subdomain in that pattern could call the API **with credentials** if an attacker deploys there and users are tricked into using it — mostly a **misconfiguration / phishing** class of issue.

**Recommendation:** Tighten allowed origins in production to **known hostnames**; use environment-specific allowlists.

---

### 4.8 Low — Password policy

**Location:** `set-password` route — minimum length **6**.

**Risk:** Short passwords are easier to guess/brute-force (mitigated partially by rate limits if added).

**Recommendation:** Longer minimum, block common passwords, optional breach check.

---

### 4.9 Low — Upload content types

**Location:** `adminUploads.js`, `auth.js` (registration photo)

**Observation:** **MIME type** comes from the client/browser; **resource_type** is derived from `mimetype.startsWith("image/")`. No magic-byte sniffing observed in review.

**Risk:** Mismatch/mislabeling; **SVG**-as-image scenarios and similar abuse depend on how Cloudinary serves content and how the frontend embeds URLs.

**Recommendation:** Allowlist explicit MIME types, max dimensions, and consider server-side validation/transcoding policy.

---

### 4.10 Low — Logging

**Location:** Google callback logs **keys** of user/info objects; redirect URL logged (truncated).

**Risk:** **Accidental PII** in logs if objects gain sensitive fields later.

**Recommendation:** Structured logging with redaction; avoid logging full OAuth profiles in production.

---

### 4.11 Frontend — `dangerouslySetInnerHTML`

**Location:** `frontend/src/components/ui/chart.tsx` — injects CSS from internal theme/color config.

**Risk:** Low if **only trusted theme tokens** flow into `__html`; higher if values ever become user-controlled without sanitization.

**Recommendation:** Keep chart config **admin-only** and validated; never pass raw user text into `__html`.

---

## 5. Authentication & authorization checklist

| Mechanism | Finding |
|-----------|---------|
| JWT | HS256 (jsonwebtoken); expiry from `JWT_EXPIRES_IN`. |
| Bearer extraction | `Authorization` header; scheme must be `Bearer`. |
| Admin | `user_roles.role = 'admin'` checked for admin operations (not only `requireAuth`). |
| Public directory | Alumni directory API is **intentionally** for verified alumni in the UI; backend public list is still a **wide data surface** (phones, etc.) — confirm policy. |
| Election data | Public **vote rows** are highly sensitive (§4.2). |

---

## 6. Privacy / compliance notes (non-legal)

- **Directory and committee** endpoints expose fields that may qualify as **personal data** under GDPR-like regimes, depending on jurisdiction.
- **Election vote linkage** may conflict with expectations of **ballot secrecy** unless clearly disclosed.

Document retention, purpose limitation, and user consent should align with what the APIs actually return.

---

## 7. Operational security

- **Secrets:** Store in platform secret managers; never commit `.env`.
- **TLS:** Terminate HTTPS at host (e.g. Vercel/reverse proxy); enforce HTTPS redirects.
- **Database:** Restrict network access (e.g. allowlisted IPs, TLS to DB).
- **Backups:** Encrypt; test restores.

---

## 8. Dependency scanning

`npm audit` was run during documentation prep:

| Package tree | Reported totals (snapshot) |
|--------------|----------------------------|
| **backend**  | 3 issues (moderate + high; 0 critical in snapshot) |
| **frontend** | 18 issues (low + moderate + high; 0 critical in snapshot) |

**Recommendation:** Run `npm audit` in CI, review advisories in context (many transitive), and upgrade or patch where appropriate. This document does **not** list individual CVE IDs (they change over time).

---

## 9. Suggested next steps (prioritized)

1. **Review and narrow public API responses** for `committee-members` and `elections/.../votes` (§4.1, §4.2).  
2. **Remove or restrict JWT in OAuth redirect URL** in production (§4.3).  
3. **Enforce strong `JWT_SECRET`** and avoid default (§4.4).  
4. **Add rate limiting** on authentication and sensitive public routes (§4.6).  
5. **Production-guard** `verification_url` in registration responses (§4.5).  
6. **Tighten CORS** for production (§4.7).  
7. **Keep** `npm audit` + lockfile hygiene on a schedule (§8).

---

## 10. Disclaimer

This assessment is based on **static review** of the repository and tooling output; it is **not** a penetration test or formal audit. findings may be incomplete. Operational config (hosting, DNS, WAF, database firewall, secrets in production) was **not** verified live.

---

*Document generated for internal use. Update as the codebase evolves.*
