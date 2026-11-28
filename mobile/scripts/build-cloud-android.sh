#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
: "${EXPO_PUBLIC_API_URL:?Set EXPO_PUBLIC_API_URL to the live HTTPS backend origin}"
export UQUAL_REQUIRE_PUBLIC_API=true
export UQUAL_ALLOW_LOCAL_HTTP=false
# Fail before starting Gradle if this is not a public HTTPS endpoint.
node -e 'require("./app.config.js")'
node scripts/check-cloud-backend.cjs
# Gradle does not include EXPO_PUBLIC_* values in the JS bundle task's input
# fingerprint. Remove its prior output so a local build cannot be repackaged
# with a stale emulator or previous server URL.
rm -f android/app/build/generated/assets/react/release/index.android.bundle
exec sh scripts/build-android.sh
