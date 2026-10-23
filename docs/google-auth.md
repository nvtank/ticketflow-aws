# Google Login

Google Identity Services (GIS) popup sign-in verifies identity, then TixFlow issues
its own existing JWT/HttpOnly refresh session. No Google access/refresh token or
client secret is requested or stored. Google subject (`sub`) is the identity key;
provider/subject and user/provider have PostgreSQL unique constraints.

## Local configuration

1. In Google Cloud Console, create/select an OAuth Client ID of type **Web application**.
2. Configure the consent screen, test users when applicable, and Authorized JavaScript
   origins `http://localhost:3000` and `http://127.0.0.1:3000` (origins, no path).
3. Put only the Web client ID in the ignored root `.env`: `GOOGLE_CLIENT_ID=...apps.googleusercontent.com`.
   `.env.example` deliberately has a blank value; no real client configuration is committed.
4. Run `pnpm install`, Docker Compose, `pnpm db:migrate`, then `pnpm dev` as in README.
5. Open `/login` or `/register`, click the official Google-rendered button and choose an account.
   Safe local `next` destinations are preserved. No redirect URI is needed for this popup flow.

Leaving GOOGLE_CLIENT_ID blank disables the UI and login/challenge APIs fail closed.
The browser fetches configuration from the backend at runtime; rebuilding for a
client ID change is not required, but the backend must restart.

## Existing accounts and linking

A new Google subject with an unused verified email creates a CUSTOMER with no local
password. The profile hides password change for these accounts. Password login for
passwordless users always fails, including the bcrypt timing dummy password.
A returning subject reuses the same TixFlow user and preserves role, orders, name
and email even if Google email claims later change. Login respects account locking.

Matching an existing email never silently links identities. Sign in by the current
method, open `/profile` and use “Liên kết tài khoản Google cùng email”. Linking
requires the same email, an active current session created within the last ten
minutes, and a fresh Google proof bound to that user/session. It preserves the
existing password. A different account, different email, stale/revoked session or
already linked different Google identity is rejected. Unlink/replacement and adding
a first password to a Google-only account are not implemented.

## Backend boundaries

- POST `/api/v1/auth/google/challenge`: five-minute nonce and HttpOnly SameSite=Strict cookie.
- GET `/api/v1/auth/google/config`: enabled flag only, no-store.
- POST `/api/v1/auth/google/login`: validated `{ credential }`, returns normal AuthResponse/refresh cookie.
- POST `/api/v1/auth/google/link/challenge`: current authenticated user/session challenge.
- POST `/api/v1/auth/google/link`: authenticated explicit link, `{ linked: true }`.
- GET `/api/v1/auth/methods`: owned `{ hasPassword, googleLinked }`.

Google's official `google-auth-library` verifies signature, issuer, audience and
expiry. TixFlow additionally requires verified email, nonempty subject and nonce
matching the current browser challenge. Redis GETDEL atomically consumes the
challenge once. Intent/user/session binding and origin checks prevent login/link
CSRF and cross-account linking. Redis failure rejects authentication, with no
fallback bypass. Nonce validation/network verification finish before database
transactions. PostgreSQL advisory/user locks and unique constraints serialize
Google identity creation and linking. Audit logs record signup/sign-in/linking;
ID tokens are not logged or persisted. Challenge retries require a new nonce.

The frontend loads the official GIS script only when configured; errors and expiry
have explicit retry states. Popup document headers use same-origin-allow-popups.
Client state holds only TixFlow access tokens in memory, with no localStorage tokens.

## Validation and limits

Unit tests sign real RSA JWTs and use the official Google SDK verifier, substituting
only Google's remote certificate source with test keys. They cover bad signature,
unknown key, issuer/audience/expiry, nonce, verified email and dummy-password denial.
Integration tests use actual test PostgreSQL/Redis, real signed JWTs and normal HTTP
controllers: registration/returning subject, role preservation, refresh, concurrent
nonce replay, existing email rejection, locked accounts, explicit link, stale and
cross-account sessions. Tests never enable test keys in the production provider.

Browser tests substitute only the external GIS script to verify cookie/nonce setup,
expiry/retry and script loading failures; all REST calls reach the real API. They
are not evidence of a completed live Google account login. Manual live sign-in
requires Google Console origins/consent configuration and the account owner's
interactive browser authorization. Results are recorded in progress.md.

Run `pnpm test`, `pnpm test:integration`, `pnpm test:e2e:google`; email/password
browser regression remains `pnpm test:e2e:auth`. Test configs explicitly disable
Google unless testing it, so private local configuration cannot leak into tests.

References: [Google server verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token),
[GIS JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference),
[Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

Current local manual check: real GIS renders, but Google reports an unauthorized
origin for the configured client. Confirm both local origins are saved under the
same Web OAuth Client ID and allow Google's configuration changes to propagate.
This is an external console configuration requirement; no origin/signature check
is bypassed in code. The account owner's live login is still required to finish
that external validation.
