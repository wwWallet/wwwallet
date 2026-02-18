#!/bin/bash

contains() {
  local e match="$1"
  shift
  for e; do
    [[ "$e" == "$match" ]] && return 0
  done
  return 1
}

images=()
arch="linux/amd64"
push=0

while getopts "hi:c:v:a:p" opt; do
  case $opt in
    h)
      echo "Usage: $0 -i image-name1 [-i image-name2 ...] -c context -v version -a architecture -p"
      exit 0
      ;;
    i)
      images+=("$OPTARG")
      ;;
    c)
      context="$OPTARG"
      ;;
    p)
      push=1
      ;;
    v)
      ver="$OPTARG"
      ;;
    a)
      arch="$OPTARG"
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$ver" ]]; then
  echo "Error: -v version is required" >&2
  exit 1
fi

if [[ -z "$context" ]]; then
  echo "Error: -c context is required" >&2
  exit 1
fi

if [[ ${#images[@]} -eq 0 ]]; then
  echo "Error: No images specified"
  exit 1
else
  echo "Images: ${images[@]}"
fi

[ "$push" -eq 1 ] && push_flag="--push" || push_flag=""


if contains "wallet-frontend" "${images[@]}"; then
  echo "Building wallet-frontend"
	cd wallet-frontend/
	docker buildx build --platform $arch $push_flag -t ${context}/wallet-frontend:${ver} .
	cd ..
fi

if contains "wallet-backend-server" "${images[@]}"; then
  echo "Building wallet-backend-server"
	cd wallet-backend-server/
	docker buildx build --platform $arch $push_flag -t ${context}/wallet-backend-server:${ver} .
	cd ..
fi

if contains "wallet-as" "${images[@]}"; then
  echo "Building wallet-as"
	cd wallet-as/
	docker buildx build --platform $arch $push_flag -t ${context}/wallet-as:${ver} .
	cd ..
fi

if contains "wallet-issuer" "${images[@]}"; then
  echo "Building wallet-issuer"
	cd wallet-issuer/
	docker buildx build --platform $arch $push_flag -t ${context}/wallet-issuer:${ver} .
	cd ..
fi

if contains "wallet-verifier" "${images[@]}"; then
  echo "Building wallet-verifier"
	cd wallet-verifier/
	docker buildx build --platform $arch $push_flag -t ${context}/wallet-verifier:${ver} .
	cd ..
fi

if contains "vct-registry" "${images[@]}"; then
  echo "Building vct-registry"
	cd vct-registry/
	docker buildx build --platform $arch $push_flag -t ${context}/vct-registry:${ver} .
	cd ..
fi
