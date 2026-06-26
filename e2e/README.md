# End-to-end tests

Playwright tests that drive the wallet through a real browser, against the full local stack
(`wallet-frontend` + `wallet-backend-server` + DB). They live outside any single module because
they exercise the system as a whole, not one service in isolation.

## Prerequisites

These tests don't start anything themselves — they just point at `http://localhost:3000` and
expect it to already be serving the wallet. You're responsible for starting everything first:

1. **Backend stack.** `tests/passkey-signup.spec.ts` only needs `wallet-backend-server` + the DB
   up. `tests/issue-credentials.spec.ts` drives a full OpenID4VCI issuance flow, so it also needs
   `wallet-issuer` (`:8003`) and `wallet-as`, the authorization server (`:6060`). Easiest is the
   whole stack from the repo root:
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
`tests/helpers.ts` has the shared building blocks:
- `signUpNewWallet(page, context)` — registers a simulated passkey (Chrome DevTools Protocol
  virtual authenticator, with `hasPrf: true`, required by this wallet's WebAuthn PRF-based signup
  flow) and signs up a new wallet, landing on the home page.
- `issueCredential(page, listName)` — drives the OpenID4VCI flow for one credential from the
  `/add` list (`listName` is its exact display name there, e.g. `"PID mDoc"`) through wallet-as
  login/consent (demo account `test`/`test`), back to the wallet's home page. See
  `tests/issue-credentials.spec.ts` for the credential types currently covered (all from
  "wwWallet Issuer" — the separate "Digital Credentials Issuer" entries, including the `(deferred)`
  variants, aren't covered yet).
