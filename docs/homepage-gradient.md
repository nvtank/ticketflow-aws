> Superseded by the cinematic hero brief; see [current implementation](homepage-cinematic-hero.md).

# Gradient typography hero

Latest opening direction: a completely image-free hero, with oversized Vietnamese typography and a mint/lilac CSS gradient. The previous photographic hero and photo distortion shader have been removed. The lower-page compositions are retained.

- [x] Replace the hero composition with two enormous, staggered display lines: “SỐNG / HẾT MÌNH.”
- [x] Shift the second line horizontally; use a green-to-violet text gradient.
- [x] Paint the background with CSS radial gradients; use an original inline SVG accent.
- [x] Remove hero photographs, photographic text masks, image preloads and the WebGL hero component.
- [x] Match navigation, controls and metadata to the light opening palette.
- [x] Keep functional discovery, organizer and ticket showcase destinations.
- [x] Keep the ticket intro and FLIP expansion, now gradient-only.
- [x] Intro readiness follows the two real font loading tasks instead of waiting for an image.
- [x] Preserve reduced motion, return-visit behavior, skip, cleanup and native touch scrolling.
- [x] Browser assertions: zero img/video/canvas nodes and zero CSS photo backgrounds in the hero.
- [x] Check Vietnamese accents and layout on desktop/mobile.
- [x] TypeScript and changed-component lint checks.
- [x] Final production verification.

Reference: [GSAP homepage](https://gsap.com/), studied for its typography-led hierarchy. The composition, SVG accent, copy and color treatment are TikFlow-specific.

The intro session key is `tikflow-ticket-intro-v3`, so this revised opening plays once even if a visitor has already seen the previous photo intro.

Production verification on port 3000 passed: image-free hero assertions, intro expansion, returning visit, skip, desktop/mobile/reduced motion, search/menu/ticket/carousel regression, API retry and JavaScript-disabled primary content. No page errors or document horizontal overflow were recorded.
