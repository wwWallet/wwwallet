#!/bin/bash

./scripts/gen-iaca-keys.sh
./scripts/gen-dsc-keys.sh example wallet_provider
./scripts/gen-dsc-keys.sh example wallet_issuer
./scripts/gen-dsc-keys.sh example wallet_verifier
./scripts/gen-dsc-keys.sh example wallet_as

cp wallet-backend-server/config/config.template.ts  wallet-backend-server/config/index.ts
cat <<EOF > wallet-backend-server/.env
APP_URL=http://localhost:8002
APP_SECRET=dsfkwfkwfwdfdsfSaSe2e34r4frwr42rAFdsf2lfmfsmklfwmer
PORT=8002
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root
DB_NAME=wallet
WALLET_CLIENT_URL=http://localhost:3000/cb
WEBAUTHN_ORIGIN=http://localhost:3000
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=Digital Wallet demo
NOTIFICATIONS_ENABLED=false
KEYS_DIR=$PWD/wallet-backend-server/keys
EOF

cp wallet-frontend/.env.template wallet-frontend/.env
cp wallet-issuer/.env.template wallet-issuer/.env
cp wallet-as/.env.template wallet-as/.env
cp wallet-verifier/.env.template wallet-verifier/.env

# Create issuer certificates and keys
rm -rf ./wallet-issuer/certs/ ./wallet-issuer/keys/
mkdir -p ./wallet-issuer/certs/
mkdir -p ./wallet-issuer/keys/

cp scripts/keystore/wwwallet_org_iaca.pem ./wallet-issuer/certs/wwwallet_org_iaca.pem
cp scripts/keystore/wwwallet_org_iaca.pem ./wallet-issuer/keys/ca.crt
cp scripts/keystore/wallet_issuer_example_wwwallet_org.pem ./wallet-issuer/keys/pem.crt
cp scripts/keystore/wallet_issuer_example_wwwallet_org.key.pkcs8 ./wallet-issuer/keys/pem.key

cd wallet-issuer/
yarn cmd:ecdh-keygen
yarn cmd:hs512-keygen
cd ../

# Copy verifier certificates and keys
rm -rf ./wallet-verifier/keys/
mkdir -p ./wallet-verifier/keys/

cp scripts/keystore/wallet_verifier_example_wwwallet_org.key.pkcs8 ./wallet-verifier/keys/pem.key
cp scripts/keystore/wwwallet_org_iaca.pem ./wallet-verifier/keys/ca.crt
cp scripts/keystore/wallet_verifier_example_wwwallet_org.pem ./wallet-verifier/keys/pem.crt

# Copy as certificates and keys
rm -rf ./wallet-as/keys/
mkdir -p ./wallet-as/keys/
touch ./wallet-as/keys/.keep
mkdir -p ./wallet-as/certs/
touch ./wallet-as/certs/.keep

cp scripts/keystore/wallet_as_example_wwwallet_org.pem ./wallet-as/keys/pem.crt
cp scripts/keystore/wallet_as_example_wwwallet_org.key.pkcs8 ./wallet-as/keys/pem.key
cp scripts/keystore/wwwallet_org_iaca.pem ./wallet-as/certs/wwwallet_org_iaca.pem

# Copy wallet backend server certificates and keys
mkdir -p ./wallet-backend-server/keys/
cp scripts/keystore/wallet_provider_example_wwwallet_org.key.pkcs8 ./wallet-backend-server/keys/wallet-provider.key
cp scripts/keystore/wallet_provider_example_wwwallet_org.pem ./wallet-backend-server/keys/wallet-provider.pem
cp scripts/keystore/wwwallet_org_iaca.pem ./wallet-backend-server/keys/ca.pem
