# Opening motion revision

Latest hero direction: see [Gradient typography hero](homepage-gradient.md). The opening now uses CSS gradients and oversized text with no photography or WebGL; earlier photo/shader notes below describe the previous revision.

Scope: refine the hero, intro, immediate energy section and featured image entrances; preserve the existing lower-page compositions. Repair horizontal scroll responsiveness without changing its category destinations.

Reference: [Lenis official site](https://lenis.dev/) and [official GSAP integration](https://github.com/darkroomengineering/lenis#gsap-scrolltrigger).

- [x] One prioritized GSAP ticker feeds Lenis; official Lenis stylesheet included.
- [x] Vertical wheel events over the pinned rail stay with Lenis.
- [x] Horizontal rail follows the current scroll frame directly (`scrub: true`), with no second 0.6s interpolation.
- [x] One horizontal ScrollTrigger owns the track and progress; no React state during scroll.
- [x] Category image dimensions match rendered panels; images decode before entry.
- [x] Reusable quick setters for cursor, magnetic buttons, marquee velocity and rail progress.
- [x] Ticket introduction waits for hero decode/local fonts, displays actual readiness and FLIPs into the hero.
- [x] Skip control, bounded readiness wait, return-visit handling and reduced motion.
- [x] Photo-masked/outlined headline, SplitText character entrance and magnetic letters.
- [x] Background/foreground parallax, layered photo interlude and reversible velocity marquee.
- [x] Scroll-driven SVG rail and outline drawing.
- [x] One demand-rendered WebGL ripple/RGB shader; native image fallback, bounded texture and pixel density.
- [x] Hero-only three-dot pointer trail; native cursor remains available.
- [x] Local blur placeholders for key photographs.
- [x] Lenis proximity snapping only at the opening scenes; touch remains native.
- [x] Ticket-panel route transition using the existing Next.js router.
- [x] Final browser and production-build verification.

## Baseline

Before the fix, a controlled 12-wheel input over the horizontal cards recorded 0 prevented/smoothed wheel events. The horizontal transform moved by up to 24.675px between two frames where the native scroll position had already stopped. Headless frame p95 was about 16.8ms: the measured defect was input/scrub synchronization, rather than proof of universally low frame rate.

The after measurement must use the same viewport and wheel sequence. Headless frame timings are diagnostic only and do not establish FPS on a user's device.

## Cost controls

The shader is enabled only on desktop with a fine pointer and no reduced-motion preference. It initializes after interaction, uses a 1280px source texture, caps the drawing width at 1600px, and renders only while pointer energy decays. An IntersectionObserver stops rendering outside the hero. Shader/program/buffer/texture resources, event handlers, GSAP contexts and the RAF are released on unmount. No Three.js/Pixi.js or additional scroll library was installed.

Horizontal panels retain native swipe behavior on mobile. Lenis does not bypass the whole horizontal-window subtree for vertical input. There is no CSS scroll snapping on the document; `lenis/snap` shares the same primary controller and does not snap across the pinned category journey.

## Verified result

Production build, TypeScript, changed-component ESLint and Prettier passed. Browser checks passed for the ticket loading/expansion lifecycle, return visits, skip, mobile, reduced motion and unavailable WebGL; the shader paused outside the hero. The homepage regression passed search, mobile menu, ticket flip/type persistence, carousel controls, API error/retry and JavaScript-disabled primary content. No page errors or horizontal document overflow were recorded in those runs.

| Controlled horizontal wheel test                         |   Before |   After |
| -------------------------------------------------------- | -------: | ------: |
| Wheel events handled by Lenis                            |     0/12 |   12/12 |
| Track motion between frames with unchanged native scroll | 24.675px | 0.000px |
| Headless frame p95                                       |   16.8ms |  16.7ms |
| Frames exceeding 34ms                                    |        0 |       0 |

The final after run made one bounding-rectangle read during the measured interval. An intermediate run caught an intro completion callback refreshing on subsequent scroll events; completion is now guarded and its scroll listener is aborted immediately.

Repeat QA with `node scripts/check-opening-motion.mjs` and `node scripts/check-homepage-flow.mjs`. Run `node scripts/profile-homepage-scroll.mjs` separately, without competing browser QA, to measure the same 1440×1000 viewport and 12 × 110px wheel sequence. Use `FLOW_QA_URL` to override the local URL and `FLOW_PROFILE_OUT` to choose the report destination.
