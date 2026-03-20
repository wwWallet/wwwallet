#!/bin/bash

WWWALLET_REPOSITORY="wwwallet/wwwallet"
WALLET_FRONTEND_REPOSITORY="wwwallet/wallet-frontend"
WALLET_BACKEND_REPOSITORY="wwwallet/wallet-backend-server"
WALLET_AS_REPOSITORY="wwwallet/wallet-as"
WALLET_ISSUER_REPOSITORY="wwwallet/wallet-issuer"
WALLET_VERIFIER_REPOSITORY="wwwallet/wallet-verifier"
WALLET_COMMON_REPOSITORY="wwwallet/wallet-common"

print_help() {
  cat <<EOF
Usage: $0 -v <version> [-h]

Options:
  -v <version>  Required release tag (must start with 'v', e.g. v0.5.1)
  -h            Show this help message

Behavior:
  - Creates draft prereleases in all configured repositories
EOF
}

while getopts "hv:" opt; do
  case $opt in
    h)
      print_help
      exit 0
      ;;
    v)
      ver="$OPTARG"
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      print_help
      exit 1
      ;;
  esac
done


if [[ -z "$ver" ]]; then
  echo "Error: -v version is required" >&2
  exit 1
fi

if [[ $ver != v* ]]; then
  echo "Error: Version does not start with v"
  exit 1
fi

title=$ver

echo "Creating draft releases..."

gh release create ${ver} --generate-notes --title "${title}" --prerelease --repo "${WALLET_FRONTEND_REPOSITORY}" --draft
gh release create ${ver} --generate-notes --title "${title}" --prerelease --repo "${WALLET_BACKEND_REPOSITORY}" --draft
gh release create ${ver} --generate-notes --title "${title}" --prerelease --repo "${WALLET_AS_REPOSITORY}" --draft
gh release create ${ver} --generate-notes --title "${title}" --prerelease --repo "${WALLET_ISSUER_REPOSITORY}" --draft
gh release create ${ver} --generate-notes --title "${title}" --prerelease --repo "${WALLET_VERIFIER_REPOSITORY}" --draft
gh release create ${ver} --generate-notes --title "${title}" --prerelease --repo "${WALLET_COMMON_REPOSITORY}" --draft
gh release create ${ver} --generate-notes --title "${title}" --prerelease --repo "${WWWALLET_REPOSITORY}" --draft

echo "Drafts created..."
