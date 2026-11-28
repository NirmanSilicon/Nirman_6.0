import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e", workers: 1, fullyParallel: false, timeout: 45_000,
  expect: { timeout: 10_000 }, reporter: "list", outputDir: "../reports/e2e",
  use: { baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:13080",
    channel: process.platform === "win32" ? "msedge" : undefined,
    headless: true, viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure", trace: "retain-on-failure" },
});
