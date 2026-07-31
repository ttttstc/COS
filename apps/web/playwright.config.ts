import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  outputDir: "test-results",
  use: {
    baseURL,
    browserName: "chromium",
    channel: "chrome",
    colorScheme: "dark",
    screenshot: "off",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: "pnpm dev --hostname 127.0.0.1 --port 3000",
        url: `${baseURL}/control-gallery`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
