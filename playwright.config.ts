import path from 'node:path';
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: process.platform === "win32" ? "chrome" : undefined,
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    env: {ASTRA_DATA_DIR:path.join(process.cwd(),'test-results','server-data')},
    command:
      "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
