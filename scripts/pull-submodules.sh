#!/bin/bash

set -e

WWWALLET_SUBMODULE_FAILURES=$(mktemp)
export WWWALLET_SUBMODULE_FAILURES
trap 'rm -f "$WWWALLET_SUBMODULE_FAILURES"' EXIT

git submodule foreach --recursive '
  if git show-ref --verify --quiet refs/heads/master ||
    git show-ref --verify --quiet refs/remotes/origin/master; then
    if ! (git checkout master && git pull --ff-only origin master); then
      echo "ERROR: Failed to update $displaypath; continuing." >&2
      printf "%s\n" "$displaypath" >> "$WWWALLET_SUBMODULE_FAILURES"
    fi
  else
    echo "Skipping $displaypath: no master branch."
  fi
'

if [ -s "$WWWALLET_SUBMODULE_FAILURES" ]; then
  printf '\nFailed submodules:\n' >&2
  cat "$WWWALLET_SUBMODULE_FAILURES" >&2
  exit 1
fi
