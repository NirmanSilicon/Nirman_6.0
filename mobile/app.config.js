const { expo } = require("./app.json");
const cloud = process.env.UQUAL_REQUIRE_PUBLIC_API === "true";
if (cloud) {
  const url = new URL(process.env.EXPO_PUBLIC_API_URL || "https://missing.invalid");
  if (url.protocol !== "https:" || url.hostname.endsWith(".invalid") || url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/" || url.hostname === "localhost" || url.hostname.endsWith(".local") || /^\d+(\.\d+){3}$/.test(url.hostname) || !url.hostname.includes("."))
    throw new Error("Set EXPO_PUBLIC_API_URL to your deployed public HTTPS origin before building a cloud APK.");
}
module.exports = {
  ...expo,
  plugins: expo.plugins.map((plugin) =>
    Array.isArray(plugin) && plugin[0] === "expo-build-properties"
      ? [
          plugin[0],
          {
            android: {
              usesCleartextTraffic:
                !cloud && process.env.UQUAL_ALLOW_LOCAL_HTTP !== "false",
            },
          },
        ]
      : plugin,
  ),
};
