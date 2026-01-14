#!/bin/bash

# Copy configuration and environment template files
cp scripts/wallet-backend-server-config.ts wallet-backend-server/config/index.ts
cp scripts/wallet-frontend-env wallet-frontend/.env
cp wallet-issuer/.env.template wallet-issuer/.env
cp wallet-as/.env.template wallet-as/.env
cp wallet-verifier/config/config.template.ts wallet-verifier/config/config.development.ts

# Create issuer certificates and keys
rm -rf ./wallet-issuer/certs/ ./wallet-issuer/keys/
mkdir -p ./wallet-issuer/certs/
mkdir -p ./wallet-issuer/keys/

cp scripts/keystore/wwwallet_org_iaca.pem ./wallet-issuer/certs/wwwallet_org_iaca.pem
cp scripts/keystore/wwwallet_org_iaca.pem ./wallet-issuer/keys/ca.crt
cp scripts/keystore/example_wwwallet_org.pem ./wallet-issuer/keys/pem.crt
cp scripts/keystore/example_wwwallet_org.key.pkcs8 ./wallet-issuer/keys/pem.key

cd wallet-issuer/
yarn cmd:ecdh-keygen
yarn cmd:hs512-keygen
cd ../

# Copy verifier certificates and keys
rm -rf ./wallet-verifier/certs/ ./wallet-verifier/keys/
mkdir -p ./wallet-verifier/certs/
mkdir -p ./wallet-verifier/keys/

cp scripts/keystore/wwwallet_org_iaca.pem ./wallet-verifier/certs/wwwallet_org_iaca.pem
cp scripts/keystore/example_wwwallet_org.key.pkcs8 ./wallet-verifier/keys/pem.key
cp scripts/keystore/wwwallet_org_iaca.pem ./wallet-verifier/keys/ca.crt
cp scripts/keystore/example_wwwallet_org.pem ./wallet-verifier/keys/pem.crt

# Copy wallet backend server certificates and keys
mkdir -p ./wallet-backend-server/keys/
cp scripts/keystore/example_wwwallet_org.key.pkcs8 ./wallet-backend-server/keys/wallet-provider.key
cp scripts/keystore/example_wwwallet_org.pem ./wallet-backend-server/keys/wallet-provider.pem
cp scripts/keystore/wwwallet_org_iaca.pem ./wallet-backend-server/keys/ca.pem
