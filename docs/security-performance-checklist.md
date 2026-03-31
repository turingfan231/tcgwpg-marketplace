# Security, Performance, and QA Checklist

This project is being upgraded in phases. The items below are the current implementation targets for the app architecture that already exists today:

- React + Vite frontend
- React Router app shell
- Supabase auth and app data
- Express backend for search, proxies, and live data

## Security baseline

### Authentication and session handling

- Keep sensitive writes behind authenticated APIs.
- If the app moves toward cookie-based auth on custom backend routes, add:
  - CSRF token validation
  - `SameSite=Lax` or stricter cookies
  - Origin and method checks
- For the current Supabase client-session model, prioritize:
  - row-level access control in Supabase
  - server-side authorization checks on admin routes
  - origin validation on proxy/mutation endpoints

### Rate limiting

Current implementation:

- in-memory route limits on:
  - `/api/live/search`
  - `/api/live/source-sales`
  - `/api/live/image-proxy`
  - `/api/live/exchange-rate`
  - `/api/events/local`
  - `/api/admin/delete-user`
- server-backed mutation limits on:
  - `/api/auth/guard`
  - `/api/admin/site-settings`
  - `/api/messages/threads`
  - `/api/messages/threads/:id/messages`
  - `/api/reports`
  - `/api/bug-reports`
  - `/api/offers`
  - `/api/offers/:id`
- origin validation on `/api/auth/guard`
- origin validation on `/api/admin/site-settings`
- origin validation on `/api/admin/delete-user`
- origin validation on message thread + message mutation routes
- origin validation on report and bug-report mutation routes
- origin validation on offer mutation routes
- request IDs + baseline security headers on Express responses

Recommended server keys:

- IP-based fallback
- identifier-based secondary bucket for:
  - login
  - signup
  - password reset
- user-id-based secondary bucket for authenticated mutations

### Audit logging

Current implementation:

- shared admin audit-log persistence through Supabase
- backend audit insert on admin storefront settings updates
- backend audit insert on admin account deletion
- migration required:
  - `supabase/migrations/20260330_admin_audit_log.sql`

Admin and moderation actions should be recorded for:

- listing removal / restore
- user suspension / unsuspension
- review deletion
- reported-content resolution
- storefront CMS changes

### File and image hygiene

- strip EXIF/XMP/IPTC server-side
- validate content type on upload
- reject unexpected MIME / extension mismatches
- cap upload size before processing
- generate responsive variants
- never lazy-load the LCP hero image
- retry transient storage upload failures for:
  - profile avatars
  - chat image attachments

## Performance targets

Target thresholds:

- LCP <= 2.5s
- INP <= 200ms
- CLS <= 0.1

### Current good moves already shipped

- route-level lazy loading
- shared analytics helper
- SEO helper separated from page logic
- lighter main bundle through code-splitting
- scroll restoration on market browsing
- self-hosted brand fonts with preload hints instead of render-blocking Google Fonts CSS
- localized homepage and seller-profile hero art so the LCP path no longer depends on third-party image hosts
- home page below-the-fold section deferral with `content-visibility`
- deferred home event fetching so the hero/storefront path renders first

### Next performance tasks

- avoid rendering oversized hero imagery on mobile
- audit image sizes on listing and seller pages
- preconnect/prefetch only for critical image sources
- keep Lighthouse CI running against:
  - `/`
  - `/market`
  - `/auth`
  - `/listing/listing-001`
- use:
  - LCP <= 2.5s
  - TBT <= 200ms
  - CLS <= 0.1
- note: INP remains a field metric target and is better tracked through real-user analytics than static lab runs
- measure slowest routes:
  - home
  - market
  - listing detail
  - messages

## Accessibility checklist

Current direction already includes:

- focus trapping for dialogs
- `aria-modal` dialogs
- polite live region for toasts
- visible focus states
- combobox behavior in post listing flow

Manual QA still needed:

- keyboard pass on:
  - market filters
  - post listing wizard
  - message thread controls
  - image preview modal
- screen reader spot checks for:
  - listing cards
  - combobox results
  - toast announcements
  - mobile filter sheet

## SEO and structured data

Current foundation:

- canonical URLs through `SeoHead`
- OG meta helper
- JSON-LD support

Already implemented:

- listing detail `Product` / `Offer` JSON-LD
- events page `Event` JSON-LD
- store profile `LocalBusiness` JSON-LD

Still needed:

- event pages -> `Event`
- store pages -> `LocalBusiness`
- seller public pages -> consistent title/description strategy

## Testing plan

### Unit

- filter-model normalization
- posting wizard validation
- offer transition rules
- slug normalization for supported games

### Integration

- draft autosave / restore
- seed-mode draft persistence on navigation/reload
- listing image upload retry behavior
- message send with image attachments
- offer counter flow

### E2E

- auth page login / signup / password reset mode
- browse -> filter -> open listing -> message -> offer
- post listing via wizard
- save draft -> reopen -> restore -> clear
- mobile filter sheet behavior
- message image preview flow
- account/profile workspace navigation
- public-route regression guard against unexpected error-boundary fallbacks on:
  - home
  - market
  - events
  - stores
  - sellers
  - WTB

## Recommended next implementation pass

1. Add structured test scaffolding
2. Add mutation-side throttling for auth routes
3. Add integration coverage for attachments + message image preview
4. Run axe + Lighthouse regression checks in CI
5. Move public GET rate limiting closer to edge/CDN where practical
