# TixFlow experience redesign

Extension after the seven MVP phases. Preserve the working booking, payment and authentication flows. No cloud deployment; never commit runtime environment files.

## Implementation groups

The initial six groups were extended with two fixes identified during verification.

1. `feat(ui): establish shared motion and editorial design primitives` — GSAP, Motion, common typography, accessible animation, local photography and source credits.
2. `feat(discovery): persist artists and verified booking reviews` — additive migration, public artist directory, event relationships, authenticated review writes and ownership rules.
3. `feat(web): connect discovery navigation and rebuild the landing experience` — shared navigation/footer, hero, live event cards, category links and artist discovery.
4. `feat(web): introduce story team guide and community pages` — about, contributors with GitHub links, help, artists/detail, reviews and account presentation.
5. `fix(discovery): preserve session queries and completed event links` — cache restoration and completed-event visibility, backed by real PostgreSQL integration tests.
6. `test(web): verify connected responsive discovery journeys` — desktop/mobile browser coverage, reduced motion, navigation and actual review writes.
7. `fix(web): label available inventory without assuming open sales` — the badge reports remaining seats, not an inferred sales window.
8. `docs: record verified redesign and local content workflow` — results and actual limitations after checks.

## Content and interaction rules

- Violet/indigo, ink and warm white; shared section headings, spacing and rounded surfaces.
- GSAP enhances the home hero; Motion handles short entrance and hover transitions. No scroll hijacking, automatic carousels or essential text hidden before JavaScript.
- Respect `prefers-reduced-motion`, keyboard focus and touch. Clean up animation contexts on navigation.
- Artists in the development seed are explicitly fictional demo profiles. Stock photography illustrates live performance and does not represent those artists.
- Reviews describe the **booking experience**, not attendance at a future concert. Only a user with a paid, non-cancelled ticket for the event can post. One review per person/event; authors can update/remove their own review. Do not seed fabricated customer reviews or rating totals.
- Team handles and repository links use the project information supplied by the owner. No invented biographies, GitHub metrics or testimonials.
- All lists and aggregates come from the API. Display honest loading, error and empty states.

## Official animation references

- https://motion.dev/docs/react-installation
- https://motion.dev/docs/react-use-reduced-motion
- https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/

The implemented behavior and verified results are recorded below.

## Integration finding

A hard navigation to a public event after login exposed an existing cache race:
`SessionProvider` called `queryClient.clear()` when the refresh cookie restored a
user, destroying an active public query and leaving its mounted observer loading.
The fix resets prior-user data without destroying query entries so mounted or
hydrating observers remain connected and refetch with the current session. Even an
in-flight query can briefly have zero observers during hydration; it must not be
removed as an inactive query at that point. The browser review journey
explicitly checks the real eligibility response after a hard navigation.

A review whose ticket becomes ineligible is hidden publicly, but its author can
still remove it from the event page. Artist genre controls remount when asynchronously
loaded options arrive so the selected URL filter remains visible.

## Verification on 24 October 2026

- API and Next production builds passed, with strict TypeScript checks. Root E2E/config typecheck passed.
- Repository ESLint passed; the final changed source/test files also passed a focused lint check. Formatting checks passed.
- All **7 database integration tests** passed against real isolated PostgreSQL and Redis: publication visibility, purchase eligibility, validation, update/aggregation, concurrent writes, ownership, cancelled-ticket filtering, author deletion and audit records. Completed event detail remains reachable from reviews.
- All **8 new experience E2E tests** passed across desktop Chromium and Pixel 7: hero search, artist-to-event navigation, story/team/GitHub/FAQ links, review creation/update/deletion through REST and responsive/reduced-motion checks across ten routes.
- Existing auth (6), booking (2) and payment (4) browser cases passed on desktop/mobile. Both event-management regression cases also passed: **22/22 browser cases in total**.

The final inventory badge wording was clarified to “Còn vé” after the behavioral
checks; the production web build was rerun for that copy-only change.

The normal regression runner starts a fresh API per suite/viewport, preserving real
login rate limits. WSL filesystem latency caused one 120-second server-start timeout
after 18 passing cases. The remaining cases run with a checkout-local 180-second
readiness timeout. No rate limit or domain assertion was weakened. Browser artifacts
are written to the Linux filesystem to avoid this machine's NTFS `copyfile` restriction.

Local logs: `.local/redesign-discovery-final-checked.log`,
`.local/redesign-e2e-final.log`, `.local/redesign-e2e-tail-final.log` and
`.local/redesign-*-lint.log`. Public preview images are exported to
`test-results/experience-preview/` (ignored).

Artist management is currently a published, read-only directory backed by labelled
fictional seed profiles. Reviews are real database records and are not seeded. No
artist integration, real testimonial collection or new payment-provider integration
is claimed by this extension.

## Local delivery

API and web were restarted against the development database. Actual PostgreSQL/Redis
readiness passed; nine public routes returned 200. A fresh browser checked normal
GSAP/Motion rendering at 1440px and 390px: hero images decoded, no horizontal overflow
and no page exceptions. Homepage screenshots in `test-results/experience-preview/`
were refreshed against this local instance. The `.next` output is a regular workspace
directory, so the build no longer depends on its temporary build-directory symlink.

Commits use the confirmed Git identity and real timestamps. PR:
https://github.com/nvtank/ticketflow-aws/pull/19. Runtime configuration remains
ignored/untracked and private values were scanned out of changed source before push.
