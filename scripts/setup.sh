#!/bin/bash

cp scripts/wallet-backend-server-config.ts wallet-backend-server/config/index.ts
cp scripts/wallet-frontend-env wallet-frontend/.env
cp wallet-issuer/.env.template wallet-issuer/.env

# copy issuer certificates and keys
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

cp ./wallet-issuer/.env.template ./wallet-issuer/.env

