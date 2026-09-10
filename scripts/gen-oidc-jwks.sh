#!/bin/bash

set -euo pipefail

OUTPUT_PATH="${1:-./wallet-as/keys/oidc.jwks.json}"
FORCE="${2:-}"

if [[ -f "${OUTPUT_PATH}" && "${FORCE}" != "--force" ]]; then
  echo "OIDC JWKS already exists at ${OUTPUT_PATH}"
  echo "Pass --force as the second argument to overwrite it."
  exit 0
fi

mkdir -p "$(dirname "${OUTPUT_PATH}")"

node - "${OUTPUT_PATH}" <<'NODE'
const { generateKeyPairSync, randomUUID } = require("node:crypto");
const fs = require("node:fs");

const outputPath = process.argv[2];
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 0x10001,
});

const jwk = privateKey.export({ format: "jwk" });
jwk.kid = randomUUID();
jwk.use = "sig";
jwk.alg = "RS256";

fs.writeFileSync(
  outputPath,
  `${JSON.stringify({ keys: [jwk] }, null, 2)}\n`,
  { encoding: "utf-8", mode: 0o600 }
);
fs.chmodSync(outputPath, 0o600);
NODE

echo "Generated OIDC JWKS at ${OUTPUT_PATH}"
