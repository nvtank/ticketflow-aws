# Section 06 — automatic booking preview

- [x] Scrolling through the section automatically selects DISCOVER → PICK A PASS → GET READY; scrolling back reverses the journey.
- [x] Manual tabs, keyboard arrows and preview buttons remain usable. A manual choice persists until the next scroll-stage boundary.
- [x] The selected demo ticket tier persists into GET READY.
- [x] Existing FLIP duration remains 0.65 seconds; reduced motion changes state without FLIP.
- [x] Live section geometry avoids stale offsets from upstream pinned sections. Travel distance remains stable when preview content changes height.
- [x] IntersectionObserver limits scroll measurements to the nearby section; requestAnimationFrame coalesces scroll events. State changes only when crossing a stage boundary.
- [x] Listeners, observer and queued frames are cleaned up on route departure. No additional pin or scroll controller.
- [x] Keyboard focus uses preventScroll so focusing the next tab does not accidentally advance the scroll journey.
- [x] Browser checks pass on desktop/mobile/reduced motion: forward/reverse scroll, manual override, ticket selection, keyboard navigation, route departure/return, zero overflow and no JavaScript errors.
- [x] TypeScript passes.
- [x] ESLint and formatting pass.

Implementation: `components/home/flow/tickets.tsx`. Regression: `scripts/check-booking-scroll.mjs`. Verified on the local development server at port 3000; no production rebuild for this change.
