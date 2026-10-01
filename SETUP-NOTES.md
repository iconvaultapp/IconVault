# IconVault — What Was Fixed & What To Do Next

## What I changed in this code (no UI changes)

1. **`.env`** — replaced the old Supabase project credentials with your new
   project (`dtijxqllzyvqvajvbxah`). Added a placeholder line for
   `SUPABASE_SERVICE_ROLE_KEY`, which you must fill in yourself (see below).
2. **`supabase/config.toml`** — updated `project_id` to match the new project,
   so the Supabase CLI links to the right place.
3. **Google login** (`src/routes/auth.tsx` and `src/components/SignInPrompt.tsx`)
   — was using Lovable Cloud's private OAuth broker, which only works inside
   Lovable's own hosting. Replaced with plain Supabase Google OAuth
   (`supabase.auth.signInWithOAuth`). The button looks and behaves the same.
4. **Homepage icon speed** (`src/routes/index.tsx`) — the 12 hero icons were
   marked `loading="lazy"` even though they're always visible immediately on
   page load. Lazy-loading visible content actually delays it. Switched to
   `loading="eager"` + `fetchPriority="high"` for the first 6. Same icons,
   same look, faster paint.
5. Deleted the stale `.output/` build folder — it had the *old* Supabase URL
   baked into it from a previous build. Always rebuild fresh (`npm run build`
   or `bun run build`) before deploying.

6. **Icons not loading on some networks/browsers** — icons were rendered via
   `<img src="https://api.iconify.design/...">`, a third-party domain some
   browser extensions (ad-blockers) or networks/firewalls block. Added a new
   route `src/routes/api.icon.$prefix.$name.ts` that proxies Iconify through
   your own domain, cached at Cloudflare's edge for a year. Updated
   `getIconSvgUrl()` in `src/lib/iconify.ts` to point here instead. Every
   component (grid, cards, homepage hero) already goes through that one
   function, so this fixes icon loading everywhere at once — in production
   and in local dev.

## What YOU still need to do

### 1. Database — run only ONE migration file
Your `supabase/migrations` folder has 9 files, but 3 of them are full
database snapshots (a Lovable export quirk), not incremental steps. On a
**fresh** Supabase project, run ONLY this one file in the SQL Editor:

```
supabase/migrations/20260825131446_88cc7a14-4c9c-49e5-aec4-6cdea51c2193.sql
```

It already contains everything from all the other 8 files combined. Do not
run the others — you'll get "already exists" errors.

### 2. Add the service role key
In `.env`, uncomment and fill in:
```
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```
Get it from Supabase Dashboard → Settings → API → `service_role` key
(keep this secret, never expose it to the browser).

### 3. Set up Google OAuth (if not done yet)
- Google Cloud Console → OAuth Client → redirect URI:
  `https://dtijxqllzyvqvajvbxah.supabase.co/auth/v1/callback`
- Supabase Dashboard → Authentication → Providers → Google → paste Client ID
  + Secret → Save.
- Supabase Dashboard → Authentication → URL Configuration → Site URL:
  `https://iconvault.site`

### 4. Build and deploy to Cloudflare
```
npm install      # or: bun install
npm run build    # or: bun run build
```
This produces a fresh `.output/` with your new credentials baked in for the
client bundle. Deploy the generated Worker (via Wrangler CLI, or upload
through the Cloudflare dashboard) and reconnect `iconvault.site` as the
Custom Domain in the Worker's Domains tab.

### 5. Set Cloudflare Worker environment variables (secrets)
In the Worker → Settings → Variables and Secrets, add (as **Secret**, not
plain text):
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

These are read server-side (SSR) at runtime; the `VITE_*` versions are baked
into the client bundle at build time from your local `.env`.
