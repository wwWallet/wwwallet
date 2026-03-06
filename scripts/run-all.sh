#!/bin/bash

set -e

docker compose up -d wallet-db

# Start optional gateway only when the submodule is present
if [ -f "privacy-gateway-server-go/Dockerfile" ]; then
    docker compose up -d gateway
else
    echo "Warning: privacy-gateway-server-go/Dockerfile not found; skipping gateway startup."
    echo "Run: git submodule update --init --recursive privacy-gateway-server-go"
fi

SERVICE=wallet-db
echo "Waiting for $SERVICE to be healthy..."
while true; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' ${SERVICE})

    if [ "$STATUS" == "healthy" ]; then
        echo "$SERVICE is healthy!"
        break
    fi

    if [ "$STATUS" == "unhealthy" ]; then
        echo "$SERVICE failed to become healthy."
        exit 1
    fi

    echo "Current status: $STATUS"
    sleep 2
done

yarn concurrently \
    --names "wallet-frontend,wallet-backend-server,wallet-issuer,wallet-verifier,vct-registry,wallet-as" \
    --prefix-colors "blueBright,greenBright,yellowBright,magentaBright,cyanBright,blue" \
    "npm --prefix wallet-frontend run dev" \
    "npm --prefix wallet-backend-server run dev" \
    "npm --prefix wallet-issuer run dev" \
    "npm --prefix wallet-verifier run dev" \
    "npm --prefix vct-registry run dev" \
    "npm --prefix wallet-as run dev"
