# TixFlow — Editorial homepage

The latest homepage direction supersedes the voxel homepage composition. The
functional routes and their backend integrations are retained.

## Presentation

- Gloock display type and Manrope body type, vendored from Google Fonts with OFL
  licenses. Manrope supports Vietnamese; Gloock is used for short English display
  statements because its Google Fonts metadata does not include Vietnamese.
- User-supplied concert photography from public/images. These are atmosphere
  illustrations and are not attributed to the demo events or demo artists.
- Bone/charcoal/olive palette, thin photo borders and consistent grading:
  saturate(.8) contrast(1.05) brightness(.92).
- Fixed SVG feTurbulence film-grain layer at .38 opacity and overlay blend mode.
- Large outlined, low-opacity TixFlow wordmark behind the final CTA.

## Motion ownership

GSAP/ScrollTrigger owns hero stagger (power4.out), desktop hero zoom 1–1.12,
statement word opacity .14–1, image breathing .94–1, inner-image parallax -5–5%,
a scroll-translated ticker with velocity skew clamped to ±6 degrees, and a 2px
scroll progress bar. Lenis runs on the GSAP ticker and updates ScrollTrigger.
The Lenis instance and ticker callback are destroyed when leaving the homepage.
Same-page anchors use Lenis; application routes keep their existing scrolling.

Desktop curtain layering uses a sticky hero, opaque content above it, and a sticky
endcap revealed underneath. Complex layering is enabled only at >=761px with
no reduced-motion preference. Reduced motion uses native scrolling and visible
content. All matchMedia contexts are reverted on unmount.

## Data

The event list and search use the original validated API client. Count-up values
come from /events, /artists and /reviews. IntersectionObserver starts each count
when visible. Loading/errors show a dash rather than inventing statistics.
No years-of-experience, review counts or testimonials are fabricated.

## SVGA

svga-web 2.4.4 is dynamically loaded in the browser. The original vector-only
TixFlow ticket seal has 90 frames at 30fps and is generated with:

    python3 scripts/generate-home-svga.py

Its SVGA 2.0 wire fields follow the upstream SVGA-Format protobuf specification.
The file is local, contains no external raster artwork or audio, and is decorative.
A static icon remains available for reduced motion or a failed animation load.
Playback pauses outside the viewport; player/parser/observer resources are cleaned
up on unmount.

## Sources

- Fonts: https://github.com/google/fonts/tree/main/ofl/gloock and
  https://github.com/google/fonts/tree/main/ofl/manrope
- Lenis: https://github.com/darkroomengineering/lenis
- Player: https://github.com/Naeemo/svga-web
- SVGA format: https://github.com/svga/SVGA-Format
- Added photos: user-supplied assets; original filenames retained. No new license
  is asserted for these photographs.

Validation is intentionally limited to strict typecheck, production build and a
single desktop browser review, following the user's request to prioritize the
website and avoid extensive/mobile test runs. Actual results are in progress.md.
