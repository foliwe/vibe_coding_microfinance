import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import type { FullConfig } from "@playwright/test";

function loadTestEnv() {
  if (existsSync("apps/admin/.env.local")) {
    loadEnvFile("apps/admin/.env.local");
    return;
  }

  if (existsSync(".env.local")) {
    loadEnvFile(".env.local");
  }
}

export default async function globalSetup(_config: FullConfig) {
  loadTestEnv();
  execFileSync(process.execPath, ["scripts/bootstrap-admin-panel-e2e.mjs"], {
    stdio: "inherit",
  });
}
