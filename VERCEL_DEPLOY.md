# Deploying The Burger Craze to Vercel

This project is configured as a static Vite + React single-page application (`dist/`), with `vercel.json` handling client-side rewrites for `/`, `/admin`, and `/superadmin`.

## 1. Deploy via Vercel Dashboard (Git)

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In the **Vercel Dashboard**, click **Add New → Project** and import your repository.
3. Confirm the build settings (auto-detected from `vercel.json`):
   - **Framework Preset**: `Vite`
   - **Install Command**: `npm install`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**.

## 2. Deploy via Vercel CLI

```bash
npm install
npm run build
npx vercel --prod
```

## 3. Portal URLs on Vercel

Once deployed to `https://your-project.vercel.app`:

- **Customer Storefront**: `https://your-project.vercel.app/`
- **Store Admin Portal**: `https://your-project.vercel.app/admin`
- **Super Admin Console**: `https://your-project.vercel.app/superadmin`

## 4. Optional: Custom Subdomains (`admin.*` & `superadmin.*`)

If you attach a custom domain later in **Vercel → Project → Settings → Domains**:

1. Add `yourdomain.com`, `admin.yourdomain.com`, and `superadmin.yourdomain.com` to the **same Vercel project**.
2. Point the DNS `CNAME` records to `cname.vercel-dns.com` (or use Vercel Nameservers).
3. The portal router automatically detects `admin.*` and `superadmin.*` hostnames and routes each directly to its respective portal.

## 5. Data Storage & Real-Time Supabase Sync

By default, menu customizations, dish availability, brand logo uploads, storefront info, and Super Admin service-pause state persist in the browser's `localStorage` (zero-config static deployment). To enable real-time multi-device sync across customer phones:

1. Open your Supabase **SQL Editor** and run `supabase/schema.sql` once (creates `storefront_state`, `menu_popups`, RLS policies, Realtime replication, and the `menu-media` storage bucket).
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Project Settings → Environment Variables** before deploying.
3. Open `/admin` → **Live Sync** to verify connection checks and push your initial menu to Supabase.

