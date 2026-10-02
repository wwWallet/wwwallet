# wwWallet Architecture

A high-level guide to the current `wwwallet` architecture, not an API specification.

## System overview

wwWallet is a modular digital credential stack centred on a React PWA. Separate
TypeScript/Node.js services handle accounts, issuance, authorization,
verification and metadata; an optional Go gateway provides private transport (OHTTP).
The root repository assembles them and supplies development and build tooling.

## Components

| Repository | Responsibility | Main dependencies/state |
| --- | --- | --- |
| `wallet-frontend` | React/Vite progressive web wallet. Handles registration and login, encrypted credential storage, OpenID4VCI issuance, OpenID4VP presentation, credential rendering, offline use and optional OHTTP requests. | Browser storage, `wallet-backend-server`, issuers, verifiers, VCT registries, `wallet-common` |
| `wallet-backend-server` | Wallet provider backend. Authenticates users and passkeys, stores and synchronizes encrypted wallet data, publishes trusted issuers/verifiers/root certificates, provides key attestation, WebSocket coordination, and HTTP/OHTTP relay endpoints. | MariaDB `wallet` database, WebAuthn, wallet provider keys, optional privacy gateway |
| `wallet-issuer` | OpenID4VCI credential issuer and demo offer UI. Publishes issuer metadata, creates credential offers, obtains claims, validates proofs and access tokens and signs SD-JWT VC or mdoc credentials. | `wallet-as`, Valkey, local or remote claims sources, VCT registry, signing certificates/keys, `wallet-common` |
| `wallet-as` | OAuth 2.0/OIDC authorization server used by the issuer. Supports authorization code, PAR, token introspection, refresh tokens and the OpenID4VCI pre-authorized-code grant. Authentication can use the demo account/PID flow or an external OIDC broker. | Valkey, configured OAuth clients, issuer API, optional external IdP, `wallet-common` |
| `wallet-verifier` | OpenID4VP relying party and demonstration UI. Builds predefined or custom DCQL requests, serves signed request objects, receives and validates presentations and displays disclosed claims. | MariaDB `verifier` database for audit records, in-process presentation state, verifier certificates/keys, `wallet-common` |
| `vct-registry` | Registry and administration UI for SD-JWT VC Type Metadata. Exposes public metadata APIs and authenticated create/edit/delete operations with validation and previews. | MariaDB `vct_registry` database, `wallet-common` schemas/rendering |
| `lib/wallet-common` | Shared protocol library. Defines OpenID4VCI/OpenID4VP types and schemas, credential parsing and verification engines, mdoc and SD-JWT VC support, trust/certificate utilities, metadata resolution and credential rendering helpers. | Consumed by the frontend, issuer, verifier, authorization server and registry |
| `privacy-gateway-server-go` | Optional Oblivious HTTP gateway. Decapsulates OHTTP/Binary HTTP requests, fetches an allowed target and encapsulates the response so the target does not see the wallet's network identity. | Stateless Go service with an HPKE key derived from configured seed material |
| root, `scripts/`, `db-setup/` | Development and release orchestration. Starts infrastructure and services, prepares configuration and keys, initializes databases and trust records, and builds container images. | Docker Compose, Yarn, MariaDB, Valkey |

## Runtime relationships

### Wallet and wallet backend

The React PWA manages sessions, credentials, OpenID4VCI/OpenID4VP flows and an
event-based wallet state. Sensitive state is encrypted in the browser, cached
in IndexedDB and synchronized through the backend as an opaque blob.
The backend manages accounts, passkeys, sessions and synchronization. It also
publishes service and trust configuration, provides key attestation and request
proxying, and supports authenticated WebSocket interactions.

### Metadata and trust

Trust is configured per service using local keys, X.509 chains and trusted
roots. The backend distributes issuer trust anchors, while setup scripts
generate and seed development certificates and service entries. The VCT
registry serves validated display and claim metadata from `/type-metadata`.

### Privacy-preserving transport

Outbound requests can use the backend's `/proxy` endpoint or optional OHTTP
mode. With OHTTP, the wallet encrypts the request, `/relay` forwards it and the
Go gateway contacts the target, separating the wallet session from the target
destination.

## Data stores

MariaDB provides separate `wallet`, `verifier` and `vct_registry` databases.
Valkey holds authorization and issuance state for `wallet-as` and
`wallet-issuer`. Browser storage supports the encrypted wallet, per-tab sessions
and offline behavior.

## Local development setup

`yarn start` starts MariaDB, Valkey, the optional OHTTP gateway and all six
Node.js applications. Default ports are:
| Service | Port |
| --- | ---: |
| Wallet frontend | 3000 |
| Wallet backend | 8002 |
| Credential issuer | 8003 |
| Verifier | 8005 |
| Authorization server | 6060 |
| VCT registry | 8097 |
| OHTTP gateway | 4567 |
| MariaDB | 3307 |
| Valkey | 6379 |

`yarn init-db` runs migrations and seeds the development issuer, verifier and
IACA trust anchor. Production deployments must replace the development URLs,
credentials and keys.