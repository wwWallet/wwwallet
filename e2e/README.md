# End-to-end tests

Playwright tests that exercise wwWallet through a real browser across the wallet, issuer,
authorization server and verifier.

## Requirements

The tests do not start services. The complete suite requires a running environment with:

- `wallet-frontend`, `wallet-backend-server` and the wallet database
- `wallet-issuer`, `wallet-as`, its data store and `vct-registry` for issuance
- `wallet-verifier` for presentation

For local testing, start everything from the repository root:

```sh
yarn start
```

Use `yarn start:preview` instead to test a production-like frontend build.

## Install

From the `e2e` directory:

```sh
yarn install
yarn playwright install chromium
```

## Environment

The suite targets local services by default. To use another environment, copy `.env.template` to
`.env` and set `WALLET_URL`, `ISSUER_URL`, `WALLET_AS_URL` and `VERIFIER_URL`. Login credentials can
be set with `WALLET_AS_USERNAME` and `WALLET_AS_PASSWORD`. Shell variables take precedence.

## Run

```sh
yarn test
# or, from the repository root:
yarn test:e2e
```

The stress test is skipped by default. Run it explicitly with:

```sh
RUN_STRESS_TESTS=1 yarn playwright test tests/account-lifecycle-stress.spec.ts
```

The offline PWA tests exercise the production service worker, so `WALLET_URL` must point to a
deployed HTTPS wallet on a non-local hostname. They are skipped for `localhost`, `127.0.0.1` and
`::1`. The suite covers the cached app shell, offline login, wallet routes and credential deletion.
It also verifies that network-only actions remain disabled and offline changes synchronize after
reconnecting. With the HTTPS environment configured in `e2e/.env`, run:

```sh
yarn playwright test tests/offline.spec.ts
```

## Debug

```sh
yarn playwright test --headed
yarn playwright test --ui
yarn playwright test --headed --debug
```

Playwright retains a trace when a test fails. Open it with:

```sh
yarn playwright show-trace test-results/<test-folder>/trace.zip
```

## Adding tests

Add specs under `tests/`. Shared helpers are exported from `tests/helpers/index.ts`:

- `auth.ts` manages passkey-backed account creation and deletion.
- `issuance.ts` covers the OpenID4VCI Authorization Code and Pre-Authorized Code flows through
  links and QR codes, plus authorization by presenting an existing PID.
- `verifier.ts` covers OpenID4VP presentation through links and QR codes.
- `presentation.ts` handles credential selection for presentation requests.
- `qr.ts` feeds real QR-code data into mocked browser camera APIs.

Each test receives an isolated browser context, and the suite runs one test at a time because the
services are shared.
