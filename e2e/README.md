# End-to-end tests

Playwright tests that drive the wallet through a real browser, against the full local stack
(`wallet-frontend` + `wallet-backend-server` + DB). They live outside any single module because
they exercise the system as a whole, not one service in isolation.

## Prerequisites

These tests don't start anything themselves — they just point at `http://localhost:3000` and
expect it to already be serving the wallet. You're responsible for starting everything first:

1. **Backend stack** (wallet-backend-server, DB, etc.), e.g. from the repo root:
   ```sh
   yarn dev
   ```
2. **Frontend**, on port 3000. Either is fine:
   - Dev server: `yarn dev` (or `yarn start`) from `wallet-frontend/`.
   - Production build (closer to what real users get — minified bundle, service worker):
     ```sh
     cd wallet-frontend
     yarn build && yarn preview
     ```
     Note: `yarn build` loads `wallet-frontend/.env.production`, which points at the real
     `qa.wwwallet.org` deployment, not your local backend. A production-build run therefore talks
     to that remote backend over the network instead of your local `wallet-backend-server`.

From the repo root, `yarn start:preview` does both steps for the whole stack at once (frontend as
a production build, everything else in dev mode).

> **Note:** `tests/passkey-signup.spec.ts` requires the frontend's WebAuthn RP ID to match
> `localhost` (the page's actual origin), since the test runs in a browser at
> `http://localhost:3000`. The dev server satisfies this; a production build does not, since it
> points at `qa.wwwallet.org` instead (see above). So this particular test only passes against the
> dev server, not against `yarn start:preview` or a manual production build.

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
For flows that need a passkey, see `tests/passkey-signup.spec.ts` for how to register a Chrome
DevTools Protocol virtual authenticator (with `hasPrf: true`, required by this wallet's WebAuthn
PRF-based signup flow) instead of relying on real hardware/biometrics.
