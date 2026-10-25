# TixFlow — Open Worlds

## Audit and scope (24 October 2026)

Existing pnpm monorepo: Next.js App Router/React/TypeScript/Tailwind v4 frontend;
NestJS/Prisma/PostgreSQL/Redis backend. TanStack Query handles server state, Zustand
handles auth, Radix handles dialogs, GSAP and Motion are already installed.

The public layout wraps home, events, artist directory/profiles, community, about,
contributors, guide, authentication, profile, notifications, tickets and checkout.
Separate organizer/admin/staff layouts retain their own authorization and workflows.
Existing event filters, booking holds/realtime, PayOS, Google authentication, review
eligibility and staff check-in remain connected to the original API/services.

Previous design used indigo/violet, rounded cards, concert photography, shared CSS
in globals.css, and motion primarily for entrances. Home repeated similar grids
and had a large navigation bar. Existing local photos remain suitable for real
concert context; they do not portray particular artists or venues.

The latest request explicitly prioritizes **one finished design foundation and
homepage before expanding other pages**. This increment changes the shared brand,
header/footer and homepage. It does not claim a finished cinematic redesign of
all existing routes. Functional routes keep their original interaction structure.

## Implementation plan

1. Audit routes, API consumers, layout and existing motion; verify licensed assets.
2. Add central palette, typography, spacing, motion and shared primitives.
3. Implement a cinematic hero, curated category gallery, live event discovery,
   atmospheric world section, interactive three-step guide and final CTA.
4. Preserve account navigation and accessible mobile dialog behavior.
5. Verify production build, strict types, lint and real browser behavior at mobile
   and desktop widths; document actual results in progress.md.

## Design system

Source: `apps/web/src/app/world.css`, imported after existing global styles.

| Token               | Value / use                                                      |
| ------------------- | ---------------------------------------------------------------- |
| Obsidian            | #101714 — marketing background, high-contrast text               |
| Forest              | #17251C — environmental surface                                  |
| Grass               | #75C65D — dark-on-light CTA / dark-surface accent                |
| Emerald             | #39A96B — secondary detail                                       |
| Ender cyan          | #65DCD2 — journey and interactive emphasis                       |
| Sand                | #F0ECD8 — light discovery surface, dark-area text                |
| Stone               | #88938D — decorative rules; brighter variants for small text     |
| Application primary | #286C3B — readable white-text buttons on light surfaces          |
| Display             | Space Grotesk variable 300–700, local Latin + Vietnamese subsets |
| Body                | Existing local Inter variable                                    |
| Corners             | 4–8px for new marketing controls and media                       |
| Content width       | Existing shared 1240px container                                 |
| Section rhythm      | clamp(72px, 8vw, 128px)                                          |
| Motion              | power3.out / cubic-bezier(.22, 1, .36, 1)                        |

No decorative pixel font is needed: small monospace labels supply the inventory
reference while Vietnamese content stays readable. No WebGL, Lenis or new runtime
animation dependency. Fonts are locally vendored under OFL; see assets/fonts.

## Components and responsibilities

- `world/primitives.tsx`: SectionLabel, DisplayHeading, WorldLink, SectionContainer.
- `world/world-story.tsx`: scoped marketing GSAP lifecycle, scroll progress and a bounded
  320px desktop portal pin with scrubbed image depth.
- `home/experience-hero.tsx`: SplitText entrance, image depth and desktop parallax.
- `world/biome-gallery.tsx`: native horizontal gallery with touch, keyboard focus,
  directional controls and links to real event category filters.
- `world/live-events.tsx`: existing validated API client, three upcoming events,
  search, skeleton/error/retry/empty states. No local event fixtures.
- `world/booking-journey.tsx`: accessible arrow/Home/End tab navigation. Motion owns
  tab changes only; the illustrative ticket is labeled and does not issue a ticket.
- `layout/public-header.tsx`: scroll-responsive floating shell, route indicator,
  actual role/account links and Radix modal focus trapping/Escape support.

Home content is server-visible before animation. GSAP contexts/matchMedia revert
on unmount and preference changes. Mobile uses native document/rail scrolling; the portal is not pinned below 1024px.
Reduced motion removes parallax, entrances and progress effects. Payment/auth/
booking routes do not mount WorldStory and receive no cinematic scroll behavior.

## Assets

`public/assets/manifest.json` records exact source, author, license and format.
The online CC0 voxel artwork is an illustration, not an actual event location.
Its source identifies it as AI-generated; provenance is retained in the manifest.
Existing Unsplash concert photographs retain their original credits in
`public/images/README.md`. No Minecraft logos, characters or proprietary textures
are copied. No claims of affiliation or performance awards are made.

## Local verification commands

Run the existing API/web (`pnpm dev`), then `pnpm test:e2e:world`. This new
read-only suite uses the running local API and never reseeds the database. It
checks real event search, category links, tab keyboard interaction, modal focus,
route transitions, reduced motion, overflow, and network failure/recovery.
Only the fault test aborts a request; no fixture supplies production content.

`pnpm --filter @tixflow/web build`, `pnpm --filter @tixflow/web typecheck`, and
`pnpm lint` remain the original project commands. Browser screenshots and local
performance observations belong in ignored test-results/. Metrics from a local
headless browser are diagnostic, not a field Core Web Vitals certification.
