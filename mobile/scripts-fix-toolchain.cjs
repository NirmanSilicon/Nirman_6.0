// Backport React Native's Foojay resolver fix for the SDK 55 Gradle 9 wrapper.
// https://github.com/react/react-native/issues/55781
const fs = require("node:fs");
const path = require("node:path");
const file = path.join(
  path.dirname(require.resolve("@react-native/gradle-plugin/package.json")),
  "settings.gradle.kts",
);
const before = fs.readFileSync(file, "utf8");
const after = before.replace(
  'id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0")',
  'id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0")',
);
if (after !== before) {
  fs.writeFileSync(file, after);
  console.log("Applied React Native Gradle 9 toolchain compatibility fix.");
}
