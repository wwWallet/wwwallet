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
