# wwWallet

wwWallet is a modular reference implementation for verifiable credentials, providing an end-to-end stack: a browser-based web wallet (with WebAuthn support), an OpenID4VCI credential issuer, an OpenID4VP verifier, an OIDC authorization server, an SD-JWT VC type metadata registry, and a shared TypeScript library of protocol helpers and utilities for integration and testing.

## 📦 Modules

- `wallet-frontend` — Wallet frontend ([wallet-frontend/README.md](https://github.com/wwWallet/wallet-frontend/blob/master/README.md))
- `wallet-backend-server` — Wallet backend and DB ([wallet-backend-server/README.md](https://github.com/wwWallet/wallet-backend-server/blob/master/README.md))
- `wallet-issuer` — Issuer ([wallet-issuer/README.md](https://github.com/wwWallet/wallet-issuer/blob/master/README.md))
- `wallet-verifier` — Verifier ([wallet-verifier/README.md](https://github.com/wwWallet/wallet-verifier/blob/master/README.md))
- `wallet-as` — Authorization Server ([wallet-as/README.md](https://github.com/wwWallet/wallet-as/blob/master/README.md))
- `vct-registry` — SD-JWT VC Type Metadata Registry ([vct-registry/README.md](https://github.com/wwWallet/vct-registry/blob/master/README.md))
- `lib/wallet-common` — Shared library ([wallet-common/README.md](https://github.com/wwWallet/wallet-common/blob/master/README.md))
- `wallet-docs` — Documentation website ([wallet-docs/README.md](https://github.com/wwWallet/wallet-docs/blob/master/README.md))


## 🔍 Prerequisites

- Node.js (version 24 or later)
- Yarn (recommended: 1.x)
- Docker & Docker Compose

## 🚀 Quick start for Development
1. Update submodules:
   ```sh
   git submodule update --init --recursive --remote
   ```
2. Install deps:
   ```sh
   yarn install
   ```
3. Setup dev environment (copies env templates & keys):
   ```sh
   yarn setup
   ```
4. Start all services:
   ```sh
   yarn start
   ```
### First-time Setup
5. Initialize DB:
   - Uploads IACA certificate generated from step 3. to the database of the wallet
   - Registers issuer and verifier in the database of the wallet
   - Initializes wallet-verifier database
   - Initializes vct-registry database
   ```sh
   yarn init-db
   ```
6. Install pre-commit hooks (optional but recommended):
   - Installs pre-commit hooks in this repository and submodules that include a `.pre-commit-config.yaml` file. The hooks enforce `.editorconfig` rules and apply minimal auto-fixes (e.g. adding missing newlines).
   ```sh
   yarn install:precommit-hooks
   ```

### Documentation website

After `yarn install`, you can optionally start the documentation website separately on port 8001:

```sh
yarn --cwd wallet-docs start
```

## 🏭 Build for Production
  ```sh
  yarn build:prod -v latest -c ghcr.io/gunet -i vct-registry -i wallet-frontend -i wallet-backend-server -i wallet-issuer -i wallet-verifier -i wallet-as
   ```

## 🤝 Contributing
Want to contribute? Check out our [Contribution Guidelines](https://github.com/wwWallet/.github/blob/main/CONTRIBUTING.md) for more details!

### Code formatting

The root repository uses the native EditorConfig checker in pre-commit and CI. `.editorconfig-checker.json` shares the checker exclusions for dependencies, generated files and submodules. Each submodule runs its own formatting checks.

To install hooks only for the root repository, then run all hooks:

```sh
pre-commit install
pre-commit run --all-files
```

Use `yarn install:precommit-hooks` to install hooks in the root repository and submodules together.

To check formatting without changing or staging files:

```sh
pre-commit run editorconfig-checker --all-files
```

Omit `--all-files` to check only staged files. The first run installs the pinned native checker in pre-commit's cache. On commit, the final-newline fixer runs before the checker; fix any remaining violations and stage the changes before retrying.
