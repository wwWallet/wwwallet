# wwWallet


## Local Development Environment

1. Update submodules

```
git submodule update --init --recursive --remote
```

2. Install dependencies

```
yarn install
```

3. Setup keystore and other setup files (only the first time)

```
yarn setup
```

4. Start the project

```
yarn start
```

5. Initialize database (only the first time)

- Uploads IACA certificat generated from step 3. to the database of the wallet
- Registers issuer and verifier in the database of the wallet

```
yarn init-db
```
## Build for Production

```
yarn build:prod -v latest -c ghcr.io/gunet -i vct-registry -i wallet-frontend -i wallet-backend-server -i wallet-issuer -i wallet-verifier -i wallet-as
```
