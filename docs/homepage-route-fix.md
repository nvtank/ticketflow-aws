# Homepage route cleanup fix

## Cause and fix

The first complete ticket intro created a cycle in GSAP's context graph. A callback bound to the intro's ancestor context ran from a tween in a matchMedia child. GSAP registered the ancestor in that child; Context.getTweens then recursed through the cycle on React route cleanup, causing `RangeError: Maximum call stack size exceeded`.

The intro now uses one useGSAP owner. Initialization belongs to that owner, while font readiness, ticket expansion, progress, completion and Skip callbacks belong to the matchMedia child that creates their animations. The owner disposes its matchMedia child during cleanup. Animation durations and visuals are preserved.

The root html also declares `data-scroll-behavior="smooth"`, as required by the installed Next 16 guide, allowing Next to temporarily disable CSS smooth scrolling while restoring route scroll positions. The transition overlay has a stable data attribute for checking that it stops intercepting input after navigation.

## Verification

- [x] Reproduced the original error after a full first-visit intro followed by client-side navigation; captured recursive Context.getTweens frames in React's console error.
- [x] Navbar routes: Events, Artists, About, Community and Guide, including returns to homepage.
- [x] Contributors menu, featured event and radar event links.
- [x] Anonymous My tickets and Organizer routes reach Login with their protected destinations preserved.
- [x] Browser Back/Forward, leaving during intro, mobile menu and reduced motion.
- [x] Intro loading/expansion, Skip, returning visitors and reduced-motion regression pass without JavaScript errors.
- [x] TypeScript passes.
- [x] Final combined run: all 14 navigation cases pass in one browser sequence, with React console errors monitored. ESLint and formatting pass.

Regression: `scripts/check-homepage-navigation.mjs`. Requires local web/API with seeded events; its anonymous auth response is controlled for deterministic protected-route checks. It detects both uncaught page errors and React-caught console errors. Optional `FLOW_NAV_CASES` limits the route cases, and `FLOW_QA_URL` changes the preview URL.

Verified in the Next development server on localhost:3000; no production rebuild for this fix. Existing tabs with the previous cyclic contexts need a full reload.
