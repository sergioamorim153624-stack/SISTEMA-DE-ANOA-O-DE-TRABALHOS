import { defineConfig } from "@playwright/test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4317",
    launchOptions: { executablePath, args: ["--no-sandbox"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node server/index.js",
    url: "http://127.0.0.1:4317/api/health",
    reuseExistingServer: false,
    env: {
      PORT: "4317",
      DATA_FILE: join(mkdtempSync(join(tmpdir(), "nexo-e2e-")), "test.sqlite"),
    },
  },
});
