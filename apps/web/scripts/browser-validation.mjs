import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const runPayloads = [];

page.on("request", (request) => {
  if (request.method() !== "POST" || !request.url().includes("/runs/stream")) {
    return;
  }
  try {
    runPayloads.push(request.postDataJSON());
  } catch {
    // A malformed payload will fail the assertions below.
  }
});

try {
  await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });

  await expect(page).toHaveTitle("刘亚楼参谋台");
  await expect(page.getByText("今天需要参谋什么？")).toBeVisible();
  for (const label of [
    "下一步做什么",
    "帮我做决定",
    "调研后判断",
    "诊断历史思维",
  ]) {
    await expect(
      page.getByRole("button", { name: new RegExp(label) }),
    ).toBeVisible();
  }
  await expect(page.getByText("Agent Chat", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Deployment URL", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator('input[type="file"]')).toHaveCount(1);

  await page.getByRole("button", { name: /调研后判断/ }).click();
  const modeSelect = page.getByLabel("切换会商类型");
  await expect(modeSelect).toHaveValue("research");
  await expect(page.getByLabel("会商输入")).toHaveAttribute(
    "placeholder",
    "描述需要调研并形成判断的问题",
  );

  await modeSelect.selectOption("ask");
  await expect(modeSelect).toHaveValue("ask");
  await page.getByRole("button", { name: "清除下一步做什么模式" }).click();
  await expect(modeSelect).toHaveValue("discuss");
  await expect(page.getByLabel("会商输入")).toHaveAttribute(
    "placeholder",
    "和刘亚楼讨论……",
  );

  await page.getByRole("button", { name: /帮我做决定/ }).click();
  const composer = page.getByLabel("会商输入");
  await composer.fill("验证决策模式上下文。");
  await page.getByRole("button", { name: "Send" }).click();
  const cancel = page.getByRole("button", { name: "Cancel" });
  await expect(cancel).toBeVisible();
  await cancel.click();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();

  await composer.fill("完成这次决策会商。");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(
    page.getByText("本地 LangGraph 基线已连接。").last(),
  ).toBeVisible();

  const latestRun = runPayloads.at(-1);
  expect(latestRun?.context?.mode).toBe("decide");
  expect(latestRun?.metadata?.mode).toBe("decide");

  const currentUrl = new URL(page.url());
  const threadId = currentUrl.searchParams.get("threadId");
  expect(currentUrl.searchParams.get("mode")).toBe("decide");
  if (!threadId) {
    throw new Error("Web did not persist the created thread ID in the URL.");
  }

  const threadResponse = await fetch(
    `http://127.0.0.1:2024/threads/${threadId}`,
  );
  expect(threadResponse.ok).toBe(true);
  const thread = await threadResponse.json();
  expect(thread.metadata.mode).toBe("decide");

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText("完成这次决策会商。")).toBeVisible();
  await expect(modeSelect).toHaveValue("decide");

  await page.waitForTimeout(4500);
  await page.getByRole("button", { name: "打开历史会商" }).last().click();
  await expect(page.getByText("历史会商", { exact: true })).toBeVisible();
  await expect(page.getByText("决策", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("已形成建议", { exact: true }).first(),
  ).toBeVisible();

  const mobile = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  await mobile.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
  await mobile.getByRole("button", { name: /诊断历史思维/ }).click();
  await expect(mobile.getByLabel("切换会商类型")).toHaveValue("diagnose");
  await expect(mobile.getByLabel("会商输入")).toHaveAttribute(
    "placeholder",
    "描述要诊断的时间范围或主题",
  );
  await mobile.locator('input[type="file"]').setInputFiles({
    name: "材料.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await expect(mobile.getByText("材料.pdf", { exact: true })).toBeVisible();
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await mobile.close();

  console.log(
    `Browser validation passed for decision thread ${threadId}; desktop and mobile entry flows verified.`,
  );
} finally {
  await browser.close();
}
