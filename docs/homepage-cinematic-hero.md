# TikFlow cinematic hero

Scope: hero and its existing ticket intro only. Lower homepage sections, routes and the global Lenis controller are preserved.

- [x] Dark atmospheric concert background using existing local photography and Next Image.
- [x] Three-line Vietnamese headline, animated lime/purple/pink text, diacritic-safe masks.
- [x] Three concept passes with photography, perforated stubs, decorative barcodes and explicit demo labels.
- [x] Separate nested transform owners for scroll, cursor depth, idle float and entry.
- [x] Single intro choreography integrated with existing Flip ticket expansion; bounded font readiness, skip, session guard.
- [x] Scroll-linked headline/background/ticket separation without extra pinning or another scroll engine.
- [x] Desktop quickTo pointer response; touch uses simplified native scrolling.
- [x] Offscreen and hidden-tab idle animation suspension; scoped GSAP cleanup.
- [x] Reduced-motion and server-rendered visible content fallbacks.
- [x] Working discovery/category/organizer links; no invented event purchase routes.
- [x] Desktop/mobile screenshots inspected; no horizontal overflow.
- [x] Production build and final browser regression.

Implementation: `components/home/flow/hero/tikflow-hero.tsx`, `hero-interactions.tsx`, `ticket-intro.tsx`; scoped `.ch-*` styles in `flow-home.css`. No additional dependencies.

## Final verification — 2026-10-25

- Production build: successful, including TypeScript and 27 static pages.
- Opening regression: loading → expansion → ready, session return, skip and reduced motion pass; no JavaScript errors.
- Layout checks at 320/390/768/1024/1440/1920 px: zero horizontal overflow, no headline/ticket overlap, visible images loaded.
- Pointer parallax returns to identity on leave; scroll changes the headline transform.
- Homepage regression: desktop/mobile/reduced motion, search, navigation, ticket interactions, carousel, API retry and JavaScript-disabled content all pass.
- Local web runs on port 3000; API on 4000.

Local environment note: Node copyFile fails with EPERM on the Windows-mounted output directory. Build completed on native Linux via `.next` → `/tmp/tikflow-next-build`; complete production output is also preserved in `.local/cinematic-production-build`, and the prior output in `.local/cinematic-next-wsl-backup`. After a host restart that clears `/tmp`, restore the preserved output or rebuild on native Linux. This workaround changes generated output only.

## Navbar follow-up — 2026-10-25

- [x] Homepage primary navigation reuses existing public routes: discovery, artists, community, about; adds guide and my tickets.
- [x] Full menu available on desktop/tablet/mobile, with contributor and organizer destinations.
- [x] Anonymous users see login/register; authenticated users see profile/notifications and their role-specific workspace.
- [x] Browser verification: 390/768/1440 px, all four authenticated roles, Escape/focus restoration and mobile navigation to guide pass with no JavaScript errors.
- [x] ESLint and formatting pass.

Local server now runs Next development mode on port 3000 so navbar changes are immediately visible. The previous production build predates this navbar follow-up; no production rebuild was performed for this change.
