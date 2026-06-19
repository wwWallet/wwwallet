#!/bin/bash

set -euo pipefail

ROOT=$(pwd)
LIB="$ROOT/lib/wallet-common"


(cd "$LIB" && yarn install --frozen-lockfile && yarn build && rm -rf node_modules)

for dir in */ ; do
  if [ -f "$dir/package.json" ]; then
    echo "Installing dependencies for $(basename $dir)"
    (cd "$dir" && rm -rf node_modules && yarn install --frozen-lockfile)
  fi
done

if [ "${WALLET_COMMON_SOURCE}" = "local" ]; then
  node ./scripts/set-wallet-common-source.js local --skip-install
elif [ "${WALLET_COMMON_SOURCE}" = "default" ]; then
  node ./scripts/set-wallet-common-source.js default --skip-install
fi
