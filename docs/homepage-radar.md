# Section 07 — On Your Radar

- [x] Replaced the flat event strip with a perspective fan: a large central poster and tilted, recessed neighbors.
- [x] Card tilt, depth and vertical offset follow native horizontal scroll position; stable outer slots own layout.
- [x] Previous/next controls animate to the next centered event over two seconds with GSAP.
- [x] Mouse dragging, native touch scrolling, arrow keys, Home/End and focus-to-reveal work.
- [x] Visible active-event counter and progress; boundary controls disable; no fabricated event data.
- [x] Pointer drag suppresses accidental event navigation. Event links retain existing detail routes.
- [x] Reduced motion removes rotation/depth and uses immediate navigation; single-event controls both disable.
- [x] Rendering is scheduled once per scroll frame, layout measurements are cached on resize, and React updates only when the active index changes.
- [x] Existing Lenis integration and the 0.65-second booking demo transition are preserved.
- [x] TypeScript, lint and formatting pass.
- [x] Browser tests pass for desktop, mobile, reduced motion, one event, button navigation, dragging, keyboard boundaries and focus navigation.
- [x] Full homepage regression passes: search/menu, booking preview, event browsing, API retry and JavaScript-disabled content. No JavaScript errors or horizontal overflow.

Implementation: `components/home/flow/event-radar.tsx`, reused by `TrendingEvents` with the existing real event dataset and `Poster` component. Local preview runs on port 3000 in Next development mode; no production rebuild for this iteration.
