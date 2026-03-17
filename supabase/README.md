# Supabase Setup

1. Open your Supabase project SQL editor.
2. Run [`schema.sql`](C:/Users/deoca/Documents/Playground/supabase/schema.sql).
3. In Supabase Storage, create a public bucket named `listing-media`.
4. In [`.env.local`](C:/Users/deoca/Documents/Playground/.env.local), set:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

5. Restart the app:

```bash
npm run server
npm run dev:web
```

## Promote an admin

Create the account normally in the app first, then run this SQL in Supabase:

```sql
update public.profiles
set role = 'admin', verified = true
where email = 'your-email@example.com';
```

## Notes

- Do not put an `sb_secret_...` key in the frontend.
- The frontend uses the publishable key only.
- The local Node server is still used for live card search and local event aggregation.
