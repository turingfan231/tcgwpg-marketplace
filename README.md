# TCGWPG Marketplace

TCGWPG is a Vite + React + Tailwind marketplace for Winnipeg TCG players to buy, sell, and trade cards locally.

## What is included

- Shared Supabase auth and data model for profiles, listings, offers, messages, reports, notifications, drafts, and admin controls
- Responsive Winnipeg marketplace for Magic, Pokemon, and One Piece
- Listing cards, listing detail pages, seller storefronts, reviews, WTB posts, dashboard, wishlist, notifications, and local events
- Create Listing modal with live card-printing search, CAD market references, and condition photo uploads
- Internal in-app messaging, structured offers, admin moderation, featured merchandising, and event overrides
- Local Node server for live card search aggregation and Winnipeg event feeds

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create [`.env.local`](C:/Users/deoca/Documents/Playground/.env.local):

   ```bash
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   VITE_API_BASE_URL=http://localhost:8787
   ```

3. In Supabase, run [`supabase/schema.sql`](C:/Users/deoca/Documents/Playground/supabase/schema.sql) in the SQL editor.

4. In Supabase Storage, create a public bucket called `listing-media`.

5. Start the local API server:

   ```bash
   npm run server
   ```

6. Start the frontend:

   ```bash
   npm run dev:web
   ```

7. To make an admin account, create the account in the app first, then run:

   ```sql
   update public.profiles
   set role = 'admin', verified = true
   where email = 'your-email@example.com';
   ```

## Supabase notes

- The frontend must use the Supabase publishable key, not an `sb_secret_...` key.
- Shared beta testing requires Supabase because listings, accounts, offers, inbox threads, and moderation are no longer local-only.
- See [`supabase/README.md`](C:/Users/deoca/Documents/Playground/supabase/README.md) for the exact setup flow.

## Structure

- `src/` frontend application
- `server/index.js` local API for live card search and Winnipeg event aggregation
- `supabase/schema.sql` database schema and RLS policies

## Deploying The Demo

Recommended stack:

- Frontend: Vercel
- API server: Render
- Auth / database: Supabase

### Frontend env vars on Vercel

```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

### Backend env vars on Render

```bash
PORT=10000
```

Optional:

```bash
POKEMONTCG_API_KEY=your_key
```

### Notes

- [`vercel.json`](C:/Users/deoca/Documents/Playground/vercel.json) is included for React Router SPA routing.
- The frontend now supports `VITE_API_BASE_URL`, so production does not need same-origin `/api` rewrites.
- In Supabase Auth, add your production Vercel URL to `Site URL` and redirect URLs.
