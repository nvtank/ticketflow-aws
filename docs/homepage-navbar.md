# Homepage navbar and menu verification — 25 October 2026

The existing homepage navigation includes a scroll-aware floating header, compact
desktop state, moving link highlight, rolling labels, magnetic controls and a
portaled directory menu. Header and menu animations have separate GSAP ownership.

`scripts/check-navbar-motion.mjs` now also checks reduced-motion changes while the
menu is open, immediate reopening, Escape dismissal and trigger focus restoration.
The navigation timeout allows the first local development compilation to finish.

Verified on the local development server at widths 1440, 390 and 320 pixels:

- Desktop hover highlight moves between links; scrolling hides/reveals and compacts
  the header.
- Menu fits the viewport, closes with Escape and returns focus to its trigger.
- Reduced-motion changes leave the menu visible, including during reopening.
- Search opens with its input focused.
- No page JavaScript errors or horizontal document overflow were recorded.
- A separate browser run passed changing motion preferences, navigating to Artists
  and returning home, with the header still interactive and no page errors.

Web TypeScript, navigation ESLint, regression-script formatting and diff whitespace
checks passed. No production build was run for this verification increment.

Preview: http://localhost:3000. The local API at port 4000 was unavailable during
this run; event data and authenticated account flows were not verified.
