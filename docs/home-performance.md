# Homepage and shared navigation performance

The initial proxy failures occurred while Nest was still starting after the web
app had already accepted browser traffic. `apps/web` now waits for the API health
endpoint before launching Next.js in development. The wait is bounded to three
minutes, configurable with `API_STARTUP_TIMEOUT_MS`. API errors after startup
still remain visible through each page's existing error and retry controls.

The ticket intro previously appeared only after hydration, waited for two fonts,
split the heading into individual characters, and ran several multi-second GSAP
sequences. It now paints from the server-rendered markup using CSS transforms and
opacity, fades out after 1.1 seconds, and has a 1.8-second fallback independent of
hydration. It plays on every full homepage load and reload, including when the
previous scroll position is restored. Storage flags never suppress it. Reduced
motion and JavaScript-disabled visits show the homepage directly. It never waits for the
backend, fonts or photography, and never reappears after delayed hydration.

The header stays visible in server-rendered HTML. Only its scroll controller
changes the header transform; the conflicting CSS hidden transform and intro
entrance were removed. Focus and open dialogs keep navigation accessible. Header
position remains fixed during compacting, and its surface no longer requires a
scrolling backdrop blur. Small screens retain account and search access; the full
menu provides notifications even when the compact notification icon is hidden.

Menu reveals finish quickly, route navigation starts immediately, automatic
section snapping was removed, and mobile gestures remain native. Scroll scenes
initialize after the first frame. Offscreen marquees start paused, touch devices
skip magnetic pointer setup, and the large gradient heading no longer repaints
continuously. Shared Motion features load asynchronously. Poster and ticket
images request widths appropriate to their rendered cards.

## Verification

Start the API and web, then run:

```sh
pnpm --filter @tixflow/web typecheck
pnpm lint
pnpm test:e2e:performance
pnpm test:e2e:ui
```

The performance regression script delays external JavaScript by 2.5 seconds and
checks the intro is already visible and then disappears before hydration. It
checks navbar geometry, overflow, scroll direction, repeated dialog operations,
focus restoration, search, route changes, reduced motion and JavaScript-disabled
content at desktop, tablet and phone widths. It uses the actual local API and
makes no data mutations. Screenshots and JSON results are written under the
system temporary directory in `tixflow-home-performance`.

The shared UI script uses explicit browser fixtures for role-specific pages;
those checks validate layout and controls without modifying accounts, orders or
payments. They do not replace API business tests.

Development includes on-demand compilation and filesystem overhead, particularly
on WSL checkouts under `/mnt/d`. Browser regression checks on that server do not
establish production Core Web Vitals or frame rates on physical devices.

## Local results — 2026-10-28

TypeScript, lint on the changed files, formatting and all nine homepage regression
groups passed after the reload and spacing update. The new scenario verifies
reload from a scrolled position while a legacy seen flag still exists. The regression groups cover five viewport widths plus delayed JavaScript,
JavaScript disabled and reduced motion.
The shared UI suite also passed all 102 route/role/viewport checks at 1440px,
390px and 320px, covering public pages, customers, organizers, administrators
and staff. Those role-specific checks use browser fixtures.

A separate headless Chromium profile used the running development server,
homepage with the intro skipped in that earlier capture, a 900px-high viewport
and a four-second programmatic traversal of the whole page. This profile predates
the adjustment to replay the intro on every reload:

| Viewport | First contentful paint | p95 frame interval | Frames over 50ms | Layout shift sum |
| -------- | ---------------------- | ------------------ | ---------------- | ---------------- |
| 1440px   | 552ms                  | 16.8ms             | 0 / 236          | 0.000113         |
| 390px    | 480ms                  | 16.7ms             | 0 / 239          | 0                |

These are observations from one local run, without a controlled before/after
baseline. Initial development hydration still recorded long tasks up to 135ms
on desktop and 200ms on the mobile viewport. The frame results describe scrolling
after loading; they do not imply that every stage of initial loading is free of
main-thread work. Raw profile and regression results are saved in
`/tmp/tixflow-home-performance` for the current session.

The STEP INTO THE MOMENT heading uses legible letter spacing and line height,
with an explicit flex gap between THE and FLOW instead of relying on the font’s
narrow space glyph. Desktop and phone checks verify the word and line separation.

## Horizontal section entry

The asynchronous featured list increased the preceding section's height after
ScrollTrigger had measured the horizontal pin start. A local reproduction moved
the category section down by 388px at 1440px and 558px at 1024px, while the old
pin start still activated early and pulled the section onto the screen.

A ResizeObserver now watches only the featured section and refreshes trigger
geometry when its layout dimensions change. It ignores pin spacers to avoid
refresh loops. Horizontal travel uses the track's layout width rather than
scrollWidth, which can include overflow from rotated cards. Anticipatory pinning
and card scaling are disabled, so entry follows the actual boundary and the
poster scale remains constant.

`pnpm test:e2e:horizontal` holds the real event API response until after pin setup,
then checks the updated entry boundary, steady document/section dimensions, card
scale, wheel scrolling in both directions, exit and return. Two desktop widths,
mobile native scrolling and reduced motion passed (four scenarios). This test
requires a running API/web and at least one published event; it does not seed or
change records. Results are saved under `/tmp/tixflow-horizontal-scroll`.
