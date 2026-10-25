# English homepage, longer motion and rotating posters

- [x] All authored homepage UI, accessible labels, navigation, search, preview tickets, metadata and footer use English. Real event/artist/venue names retain their source spelling.
- [x] Self-hosted Anton display font from https://github.com/google/fonts/tree/main/ofl/anton, with its OFL license. Larger editorial headings; body text remains Be Vietnam Pro.
- [x] Shared motion tokens set major entrance/reveal/ticket-morph durations to two seconds. The DISCOVER / PICK A PASS / GET READY booking transition retains its original 0.65-second duration. Interactive pointer response remains short; no added two-second Lenis lag.
- [x] Horizontal journey uses 1.35× scroll distance; immersive story uses 160% viewport travel with direct scrub.
- [x] Category layout is now a staggered photographic poster strip with paper borders and varying tilt. Each poster rotates through 16° during its passage, with extreme angles around ±17°.
- [x] Stable outer slots own layout; inner posters own rotation; the shared track owns horizontal translation. No extra pinned sections or scroll controller.
- [x] Mobile uses native horizontal scrolling and 5–6° static tilt; reduced motion uses restrained 3° tilt.
- [x] Hero layout checks across 320–1920px pass with no overlap/overflow. Homepage search, navigation, ticket demo, carousel, retry and no-JavaScript tests pass.
- [x] Poster browser checks pass on desktop, mobile and reduced motion, with valid category destinations and no JavaScript errors.
- [x] TypeScript and ESLint pass.

Local preview uses the existing Next development server on port 3000. No production rebuild was run for this iteration.

Measured after removing the hero scroll-time layout read: 12/12 wheel events handled by Lenis, 1 layout read over the sampled interaction, p95 frame interval 16.7 ms, no frames above 34 ms, and 0 px of track motion after page scrolling stopped. This is a local headless-browser sample, not a universal frame-rate guarantee.

Opening regression also passed after the final changes: ticket loading/expansion/ready, return visits, mobile, reduced motion and Skip; no JavaScript errors or horizontal overflow.
