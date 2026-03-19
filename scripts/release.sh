#!/bin/bash

WWWALLET_REPOSITORY="wwwallet/wwwallet"
WALLET_FRONTEND_REPOSITORY="wwwallet/wallet-frontend"
WALLET_BACKEND_REPOSITORY="wwwallet/wallet-backend-server"
WALLET_AS_REPOSITORY="wwwallet/wallet-as"
WALLET_ISSUER_REPOSITORY="wwwallet/wallet-issuer"
WALLET_VERIFIER_REPOSITORY="wwwallet/wallet-verifier"
WALLET_COMMON_REPOSITORY="wwwallet/wallet-common"

prod_release=0   # this flag determines if --prerelease flag should be used in gh cli

print_help() {
  cat <<EOF
Usage: $0 -v <version> [-p] [-h]

Options:
  -v <version>  Required release tag (must start with 'v', e.g. v0.5.1)
  -p            Use production release type (default is prerelease)
  -h            Show this help message

Behavior:
  - Creates draft releases in all configured repositories
  - Prompts: Type 'release' to publish:
  - Typing 'release' publishes drafts; anything else leaves them as drafts
EOF
}

while getopts "hv:p" opt; do
  case $opt in
    h)
      print_help
      exit 0
      ;;
    v)
      ver="$OPTARG"
      ;;
    p)
      prod_release=1
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

[ "$prod_release" -eq 0 ] && pre_release_flag="--prerelease" || pre_release_flag=""

echo "Creating draft releases..."

gh release create ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WALLET_FRONTEND_REPOSITORY}" --draft
gh release create ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WALLET_BACKEND_REPOSITORY}" --draft
gh release create ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WALLET_AS_REPOSITORY}" --draft
gh release create ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WALLET_ISSUER_REPOSITORY}" --draft
gh release create ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WALLET_VERIFIER_REPOSITORY}" --draft
gh release create ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WALLET_COMMON_REPOSITORY}" --draft
gh release create ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WWWALLET_REPOSITORY}" --draft

echo "Drafts created..."

echo -n "Type 'release' to publish: "
read response

if [ "$response" = "release" ]; then
	echo "Creating release..."
	gh release edit ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WALLET_FRONTEND_REPOSITORY}" --draft=false
	gh release edit ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WALLET_BACKEND_REPOSITORY}" --draft=false
	gh release edit ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WALLET_AS_REPOSITORY}" --draft=false
	gh release edit ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WALLET_ISSUER_REPOSITORY}" --draft=false
	gh release edit ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WALLET_VERIFIER_REPOSITORY}" --draft=false
	gh release edit ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WALLET_COMMON_REPOSITORY}" --draft=false
	gh release edit ${ver} --generate-notes --title "${title}" ${pre_release_flag} --repo "${WWWALLET_REPOSITORY}" --draft=false
else
	echo "Release cancelled."
    exit 0
fi
