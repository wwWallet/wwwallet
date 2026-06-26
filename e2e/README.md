# End-to-end tests

Playwright tests that drive the wallet through a real browser, against the full local stack
(`wallet-frontend` + `wallet-backend-server` + DB). They live outside any single module because
they exercise the system as a whole, not one service in isolation.

## Prerequisites

These tests don't start anything themselves — they just point at `http://localhost:3000` and
expect it to already be serving the wallet. You're responsible for starting everything first:

1. **Backend stack.** `tests/passkey-signup.spec.ts` only needs `wallet-backend-server` + the DB
   up. `tests/issue-credentials.spec.ts` drives a full OpenID4VCI issuance flow, so it also needs
   `wallet-issuer` (`:8003`) and `wallet-as`, the authorization server (`:6060`).
   `tests/present-credentials-to-verifier.spec.ts` also needs `wallet-verifier` (`:8005`). Easiest
   is the whole stack from the repo root:
   ```sh
   yarn start
   ```
2. **Frontend**, on port 3000. Either is fine (`yarn start` above already covers this too):
   - Dev server: `yarn dev` (or `yarn start`) from `wallet-frontend/`.
   - Production-ish build (closer to what real users get — minified bundle, service worker):
     ```sh
     cd wallet-frontend
     yarn build -- --mode development && yarn preview
     ```
     `--mode development` matters: a plain `yarn build` loads `wallet-frontend/.env.production`,
     which points at the real `qa.wwwallet.org` deployment instead of your local backend.
     `--mode development` loads `.env`/`.env.development` instead, keeping everything local — and
     also satisfies the `isDev` check that `oauth4webapi` requires to allow plain-HTTP requests
     (see `wallet-frontend/src/lib/services/OpenID4VCI/OAuth/{TokenRequest,
     PushedAuthorizationRequest}.ts`), so the issuance flow still works against your local backend.
     The service worker still registers regardless of mode (`wallet-frontend/src/sw-register.js`
     has no mode check). From the repo root, `yarn start:preview` does this for the whole stack at
     once (frontend built this way, everything else in dev mode).

## Install

```sh
yarn install
```

## Run

```sh
yarn test
# or, from the repo root:
yarn test:e2e
```

## Watching a test run

- `npx playwright test --headed` — visible browser window
- `npx playwright test --ui` — interactive UI mode with timeline/time-travel (recommended)
- `npx playwright test --headed --debug` — pauses before each action

After a failure, replay the recorded run (DOM, console, network) with:

```sh
npx playwright show-trace test-results/<test-folder>/trace.zip
```

## Adding tests

Add new spec files under `tests/`. Each test gets its own isolated browser context automatically.
`tests/helpers/` has the shared building blocks, split by concern and re-exported from
`tests/helpers/index.ts` (so `import { ... } from './helpers'` works the same regardless of which
file actually defines something):

- **`auth.ts`** — account lifecycle.
  - `signUpNewWallet(page, context)` — registers a simulated passkey (Chrome DevTools Protocol
    virtual authenticator, with `hasPrf: true`, required by this wallet's WebAuthn PRF-based
    signup flow) and signs up a new wallet, landing on the home page.
  - `deleteAccount(page)`, plus the lower-level `setUpPasskeyAuthenticator` /
    `clearPasskeyCredentials` / `replacePasskeyAuthenticator` / `signUp` used by tests that sign up
    or delete more than once (see `tests/account-lifecycle-stress.spec.ts`).
- **`issuance.ts`** — OpenID4VCI issuance, from every entry point:
  - `issueCredential(page, listName)` — the wallet's own `/add` list (`listName` is its exact
    display name there, e.g. `"PID mDoc"`) through wallet-as login/consent (demo account
    `test`/`test`). See `tests/issue-credentials.spec.ts` for the credential types currently
    covered (all from "wwWallet Issuer" — the separate "Digital Credentials Issuer" entries,
    including the `(deferred)` variants, aren't covered yet).
  - `issueCredentialFromIssuer(page, credentialName)` — same flow, started from the issuer's own
    site (`wallet-issuer`'s catalog at `:8003`) instead. See
    `tests/issue-credentials-from-issuer.spec.ts`.
  - `issueCredentialByScanningQrCode(page, context, credentialName)` — same again, via the
    wallet's own QR scanner instead of clicking a link: it reads the exact QR contents off the
    issuer's offer page (in a separate tab) and feeds them into the wallet's camera APIs as a
    real, decodable QR code, so the actual scan-and-decode UI runs end to end (see `qr.ts`). See
    `tests/issue-credential-by-qr-scan.spec.ts`.
  - `issueCredentialUsingPidSignIn(page, listName)` — same as `issueCredential`, but logs into
    wallet-as with its "Sign in with PID" alternative (an OpenID4VP presentation of a PID the
    account already holds) instead of the demo username/password. Requires a PID credential to
    already be issued first, and only applies to scopes other than PID itself. See
    `tests/issue-credential-sign-in-with-pid.spec.ts`.
- **`verifier.ts`** — OpenID4VP presentations to `wallet-verifier` (`:8005`):
  - `presentCredentialsToVerifier(page, definitionTitle)` — picks a fixed-combo request
    definition on its site (e.g. `"PID + EHIC"`) through the wallet's credential-selection popup,
    ending on the verifier's own result page. The account needs to already hold whatever
    credential types that definition requests.
  - `presentSelectableCredentialToVerifier(page, definitionTitle, fields)` — same, but for one of
    the three definitions where the verifier first lets you pick which claims to request
    (`"PID"`, `"Bachelor Diploma"`, `"EHIC"`); `fields` is `'all'` or `'one'`. See
    `tests/present-credentials-to-verifier.spec.ts`, which covers all 9 of wallet-verifier's
    standard definitions (the QES/QC transaction-data and custom-DCQL ones aren't covered).
- **`presentation.ts`** — `selectAndSendAllRequestedCredentials`, the shared walk through the
  wallet's verifier credential-selection popup, used by both `issuance.ts` (PID sign-in) and
  `verifier.ts`.
- **`qr.ts`** — `mockCameraWithQrCode`, the camera-mocking internals behind
  `issueCredentialByScanningQrCode`.
