#!/bin/bash

ROOT=$(pwd)
LIB="$ROOT/lib/wallet-common"

cp scripts/wallet-backend-server-config.ts wallet-backend-server/config/index.ts
cp scripts/wallet-frontend-env wallet-frontend/.env

(cd "$LIB" && yarn install --frozen-lockfile && yarn build && rm -rf node_modules)

for dir in */ ; do
  if [ -f "$dir/package.json" ]; then
    echo "Installing dependencies for $(basename $dir)"
    (cd "$dir" && rm -rf node_modules && yarn install) &
  fi
done

wait

# copy issuer certificates and keys
mkdir -p ./wallet-issuer/certs/
cp scripts/keystore/wwwallet_org_iaca.pem ./wallet-issuer/certs/wwwallet_org_iaca.pem
cp scripts/keystore/wwwallet_org_iaca.pem ./wallet-issuer/keys/ca.crt
cp scripts/keystore/example_wwwallet_org.pem ./wallet-issuer/keys/pem.crt
cp scripts/keystore/example_wwwallet_org.key.pkcs8 ./wallet-issuer/keys/pem.key

cd wallet-issuer/
yarn cmd:ecdh-keygen
yarn cmd:hs512-keygen
cd ../

cp ./wallet-issuer/.env.template ./wallet-issuer/.env

