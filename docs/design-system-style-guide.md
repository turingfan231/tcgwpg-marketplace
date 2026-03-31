# TCG WPG Marketplace Design System

## Layout priorities
- Mobile-first at `360px`, then enhance through `480px`, `768px`, `1024px`, `1280px`, and `1536px`.
- Keep core actions visible without horizontal scroll.
- Reserve the strongest red accent for primary actions and active states only.

## Token contract
The runtime token layer is defined in:
- [C:\Users\deoca\Documents\Playground\src\index.css](C:/Users/deoca/Documents/Playground/src/index.css)

Primary marketplace tokens:
- spacing: `--sp-1` through `--sp-12`
- radius: `--r-2`, `--r-3`, `--r-pill`
- typography: `--fs-12` through `--fs-32`, `--lh-body`, `--lh-title`
- theme: `--bg`, `--fg`, `--muted-fg`, `--surface`, `--border`, `--brand`, `--brand-contrast`, `--success`, `--warning`, `--danger`, `--focus`

## Semantic surfaces
- `surface-solid`: main card and form background
- `surface-alt`: secondary shelf or rail background
- `surface-hover`: hover/focus fill for subtle controls

## Accessibility rules
- All interactive controls use native elements first.
- Dialogs must be focus-trapped and close on `Esc`.
- Toasts must announce state changes through `aria-live`.
- Focus rings must remain visible in both light and dark mode.
- Non-essential motion should be removed when `prefers-reduced-motion` is active.

## Content rules
- Product headings should be short and scannable.
- Price, condition, and location need to remain above the fold on listing cards.
- Mobile should prioritize one primary action and one secondary action per section.

## Analytics
Use `trackEvent(name, payload)` from:
- [C:\Users\deoca\Documents\Playground\src\lib\analytics.js](C:/Users/deoca/Documents/Playground/src/lib/analytics.js)

Recommended event families:
- `home_*`
- `market_*`
- `listing_*`
- `message_*`
- `offer_*`
- `listing_wizard_*`
