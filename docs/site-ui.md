# Shared website UI — 25 October 2026

The active homepage is the reference for every application surface: obsidian
background (`#090b13`), dark cards (`#141722`), lime actions (`#c8ff5f`), Space
Grotesk headings and Be Vietnam Pro body text. Existing Vietnamese content and
business rules are retained.

## Coverage

- Public routes share the homepage navigation, animated directory menu, search
  dialog, wordmark and footer. Current routes are indicated in the header/menu.
  Interior pages reserve space for the fixed header and use a shorter entrance.
- Event discovery/detail, artists, community, about, contributors and booking
  guidance use the shared typography, photography, cards, filters and page spacing.
  The about page now uses local concert photography rather than voxel artwork.
- Login, registration, profile, notifications and orders use the same controls,
  active account tabs, focus treatment and error messages.
- Booking, waiting room, checkout, payment results and tickets use the shared
  palette. Selected seats are lime; held-by-you seats are cyan; other holds are
  amber. Success, warning and error messages retain distinct semantic colours.
  Ticket QR codes keep their white backing for scanning.
- Organizer/admin/staff workspaces share a dark sidebar, the homepage wordmark,
  lime actions, responsive drawers, card/table styling and themed analytics charts.
  Nested event routes keep their parent navigation active. The overview event
  list uses a section heading and an “all events” action.
- Empty/loading/error states, dialogs and toasts use the same system. The global
  error fallback includes a self-contained dark/lime presentation.

Source of truth: `app/globals.css` defines semantic colours; `app/site-ui.css`
defines application layouts; `app/(public)/flow-home.css` owns the homepage and
shared navigation/footer. Legacy editorial layout tokens in `world.css` reference
the shared colours. New components should use semantic utilities such as
`bg-card`, `text-primary`, `text-danger` and `border-border`.

## Browser verification

`pnpm test:e2e:ui` requires a running local web preview and Playwright Chromium.
It uses browser-only QA fixtures, including authenticated role fixtures; it never
writes to the database, reserves seats or submits payments. Non-GET API operations
other than the mocked session refresh are blocked and fail the run.

The initial run passed 62 cases: 31 routes at desktop 1440px and mobile 390px.
Checks include shared fonts/background, visible headings/navigation, document
overflow, API error/retry recovery, invalid login fields, seat selection, checkout
dialog dismissal, QR backing and the mobile workspace drawer. Page JavaScript
errors fail the run. Screenshots/results are saved to the temporary directory
`tikflow-site-ui` by default.

Additional result-state/waiting-room and small-screen checks use the same script.
The production follow-up passed six payment-result/waiting-room cases at 1440px
and 390px, plus the signed-in 320px profile/menu check. At 320px the notification
shortcut moves into the directory menu so the header controls remain visible.
These checks bring the fixture verification total to 69 cases across the two runs
and the narrow-screen follow-up.

Production compilation, TypeScript, static route generation, source ESLint,
formatting and diff whitespace checks passed.
The existing homepage regression also passed desktop, mobile, reduced motion,
API retry/search navigation and JavaScript-disabled content, with no page errors
or horizontal overflow.

Filters: `SITE_QA_ROLE`, `SITE_QA_PATH` (substring), `SITE_QA_WIDTHS` (comma-separated)
and `SITE_QA_OUTPUT`; `FLOW_QA_URL` selects the preview origin.

The API was unavailable during the initial fixture run. It was subsequently
restarted with the existing configuration: health reported PostgreSQL/Redis up.
A read-only production browser check loaded the three existing public events and
navigated to an event detail without page errors. Preview: http://localhost:3000;
API: http://localhost:4000.

Fixtures validate presentation and local interactions; they do not establish live
OAuth, PayOS, authorization or realtime correctness. No backend contracts, payment
logic, seeds or credentials were changed.
