#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -z "${JAVA_HOME:-}" ] && [ -d '/Applications/Android Studio.app/Contents/jbr/Contents/Home' ]; then
  export JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home'
fi
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
node scripts-fix-toolchain.cjs
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease "-PreactNativeArchitectures=${UQUAL_ANDROID_ARCHS:-arm64-v8a}" --console=plain
