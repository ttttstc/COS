import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();

try {
  await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });

  await expect(page.locator('input[type="file"]')).toHaveCount(1);
  const composer = page.getByPlaceholder("Type your message...");

  await composer.fill("Stop this streamed response.");
  await page.getByRole("button", { name: "Send" }).click();
  const cancel = page.getByRole("button", { name: "Cancel" });
  await expect(cancel).toBeVisible();
  await cancel.click();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();

  await composer.fill("Complete this response.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("本地 LangGraph 基线已连接。").last()).toBeVisible();

  const threadId = new URL(page.url()).searchParams.get("threadId");
  if (!threadId) {
    throw new Error("Web did not persist the created thread ID in the URL.");
  }

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText("Complete this response.")).toBeVisible();
  await expect(page.getByText("本地 LangGraph 基线已连接。").last()).toBeVisible();

  console.log(`Browser validation passed for thread ${threadId}`);
} finally {
  await browser.close();
}
