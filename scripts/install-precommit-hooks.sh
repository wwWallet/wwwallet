#!/bin/bash

set -e

# Install pre-commit if not present
if ! command -v pre-commit >/dev/null 2>&1; then
  echo "pre-commit not found, installing via pip..."
  if command -v pip3 >/dev/null 2>&1; then
    pip3 install --user pre-commit
  elif command -v pip >/dev/null 2>&1; then
    pip install --user pre-commit
  else
    echo "pip not found. Please install pip first."
    exit 1
  fi
  export PATH="$HOME/.local/bin:$PATH"
fi

# Find all repos with .pre-commit-config.yaml and run pre-commit install
find . -type f -name ".pre-commit-config.yaml" -not -path "*/node_modules/*" | while read -r config; do
  repo_dir=$(dirname "$config")
  echo "Installing pre-commit hook in $repo_dir"
  (cd "$repo_dir" && pre-commit install)
done

echo "Pre-commit hooks installed in all repos."