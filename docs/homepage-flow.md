# TikFlow homepage implementation checklist

Latest hero direction: see [Gradient typography hero](homepage-gradient.md). The opening now uses CSS gradients and oversized text with no photography or WebGL; earlier photo/shader notes below describe the previous revision.

- [x] Inspect existing Next.js App Router, GSAP, Lenis, API contracts and routes.
- [x] Preserve existing booking, authentication, organizer and event detail flows.
- [x] Dark/lime visual system with local Space Grotesk and Be Vietnam Pro fonts.
- [x] Short first-visit intro, floating navigation and mobile navigation dialog.
- [x] Photo-led Vietnamese hero, SplitText reveal and scroll choreography.
- [x] Two opposing animated marquees.
- [x] Editorial event mosaic populated from the real `/api/v1/events` endpoint.
- [x] Six category panels mapped to supported backend categories.
- [x] Desktop horizontal discovery; native swipeable panels on mobile/reduced motion.
- [x] Concert image expansion using one pinned GSAP timeline on desktop.
- [x] Ticket stack, pointer tilt, readable flip and clearly invalid demo barcode.
- [x] Stateful booking demonstration with ticket type selection and GSAP Flip.
- [x] Event carousel with drag, swipe, arrow buttons and keyboard navigation.
- [x] Organizer product preview with real organizer creation link.
- [x] Kinetic finale, dedicated footer and back-to-top anchor.
- [x] Accessible search dialog with autofocus, focus trap and Escape handling via Radix.
- [x] One Lenis controller synchronized through the GSAP ticker; effect cleanup.
- [x] Reduced motion, native mobile scrolling and content visible without animation.
- [x] API loading, empty and retry states; no fabricated popularity or sales metrics.
- [x] TypeScript check.
- [x] ESLint check for changed components.
- [x] Production build.
- [x] Browser checks: desktop, mobile, reduced motion, interactions, images and overflow.

## Data and destinations

Featured and carousel events use the existing API; there are no invented live events. API failures show a retry control. The visual ticket and booking flow are explicitly labeled demonstrations and never report a completed payment. Search submits `q` to `/events`. Categories use the existing MUSIC, WORKSHOP, SPORTS, OTHER and CONFERENCE filters. Event cards link to their real slugs. Organizer creation uses `/organizer/events/new`; account links retain the existing auth store and role routing.

The current API groups concerts/festivals under MUSIC and arts/culture under OTHER. The homepage follows those supported filters rather than sending unsupported enums.

## Motion and accessibility

GSAP ScrollTrigger and SplitText are scoped by `useGSAP` and `gsap.matchMedia`. Lenis runs only on desktop with no reduced-motion preference; it never smooths touch. On mobile, categories and event rails use native overflow. Radix provides dialogs and focus restoration. The purchase presentation uses a keyboard accessible tablist and native radio controls.

Fonts and photos are local assets. Be Vietnam Pro is distributed with its OFL license; the sports image attribution is recorded in `apps/web/public/images/README.md`. Existing concert imagery is reused from the workspace.

The former root loading boundary was scoped to the workspace and event routes. The homepage can now render its server HTML directly without requiring React to reveal a streamed loading segment.

## Repeating browser QA

Run the web production server, then `node scripts/check-homepage-flow.mjs` after installing Playwright Chromium. The default URL is `http://127.0.0.1:3000/`; override it with `FLOW_QA_URL`. Screenshots go to the OS temporary directory under `tikflow-qa`, or `FLOW_QA_OUTPUT` if provided.

The script uses explicitly labeled QA event fixtures to cover desktop, mobile, reduced motion, Vietnamese font loading, hero line layout, horizontal overflow, search/modal Escape handling, mobile navigation, ticket flip, ticket selection persistence, carousel controls, API error/retry recovery, search route navigation, and JavaScript-disabled primary content. It never seeds or modifies the database and never submits a payment.

A separate manual browser check opened `/events/tixflow-music-festival` from the gallery against the running local API and verified the carousel scrolls with the three actual database events.

Final verification: production build passed; changed-component ESLint and Prettier passed; Chromium desktop (1440px), mobile (390px), reduced motion, API error/retry, search navigation and JavaScript-disabled primary content passed. Browser runs reported no page errors or horizontal document overflow. Local web preview remains available on port 3000 with the existing API on port 4000.
