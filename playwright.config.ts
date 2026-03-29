import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev --workspace @credit-union/admin -- --hostname 127.0.0.1",
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://127.0.0.1:3000/login",
  },
  workers: 1,
});
