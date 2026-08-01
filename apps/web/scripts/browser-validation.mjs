import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const runPayloads = [];
const baseURL = process.env.BROWSER_VALIDATION_URL ?? "http://127.0.0.1:3000";
const validationApiURL =
  process.env.BROWSER_VALIDATION_API_URL ??
  new URL(baseURL).searchParams.get("apiUrl") ??
  "http://127.0.0.1:2024";

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
  await page.goto(baseURL, { waitUntil: "networkidle" });

  await expect(page).toHaveTitle("刘亚楼参谋台");
  const workspace = page.getByRole("main");
  await expect(page.getByText("今天需要我帮你判断什么？")).toBeVisible();
  for (const label of [
    "下一步做什么",
    "帮我做决定",
    "调研后判断",
    "诊断历史思维",
  ]) {
    await expect(
      workspace.getByRole("button", { name: new RegExp(label) }),
    ).toBeVisible();
  }
  await expect(page.getByText("Agent Chat", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Deployment URL", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator('input[type="file"]')).toHaveCount(1);

  await workspace.getByRole("button", { name: /调研后判断/ }).click();
  const modeSelect = page.getByLabel("切换议题类型");
  await expect(modeSelect).toHaveValue("research");
  await expect(page.getByLabel("议题输入")).toHaveAttribute(
    "placeholder",
    "描述需要调研并形成判断的问题",
  );

  await modeSelect.selectOption("ask");
  await expect(modeSelect).toHaveValue("ask");
  await modeSelect.selectOption("discuss");
  await expect(modeSelect).toHaveValue("discuss");
  await expect(page.getByLabel("议题输入")).toHaveAttribute(
    "placeholder",
    "和刘亚楼讨论……",
  );

  await page.locator('input[type="file"]').setInputFiles({
    name: "材料.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await expect(page.getByText("材料.pdf", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "移除 PDF" }).click();

  await workspace.getByRole("button", { name: /帮我做决定/ }).click();
  const composer = page.getByLabel("议题输入");
  await composer.fill("验证决策模式上下文。");
  await page.getByRole("button", { name: "发送议题" }).click();
  const stop = page.getByRole("button", { name: "停止生成" });
  await expect(stop).toBeVisible();
  await expect(page.getByLabel("选择议题附件")).toBeDisabled();
  await expect(page.getByRole("button", { name: "添加附件" })).toBeDisabled();
  await stop.click();
  await expect(page.getByRole("button", { name: "发送议题" })).toBeVisible();
  await expect(page.getByLabel("选择议题附件")).toBeEnabled();

  await composer.fill("完成这项决策议题。");
  await page.getByRole("button", { name: "发送议题" }).click();
  await expect(
    page.getByText("本地 LangGraph 基线已连接。").last(),
  ).toBeVisible();
  await expect(
    page.locator('.cos-issue-list-item[data-selected="true"]'),
  ).toContainText("已形成建议");

  const latestRun = runPayloads.at(-1);
  expect(latestRun?.context?.mode).toBe("decide");
  expect(latestRun?.metadata?.mode).toBe("decide");

  const currentUrl = new URL(page.url());
  const threadId = currentUrl.searchParams.get("threadId");
  expect(currentUrl.searchParams.get("mode")).toBe("decide");
  if (!threadId) {
    throw new Error("Web did not persist the created thread ID in the URL.");
  }

  const threadResponse = await fetch(`${validationApiURL}/threads/${threadId}`);
  expect(threadResponse.ok).toBe(true);
  const thread = await threadResponse.json();
  expect(thread.metadata.mode).toBe("decide");

  await page.evaluate(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    window.history.replaceState(null, "", url);
  });
  expect(new URL(page.url()).searchParams.has("mode")).toBe(false);
  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page
      .getByRole("region", { name: "议题消息" })
      .getByText("完成这项决策议题。", { exact: true }),
  ).toBeVisible();
  await expect(modeSelect).toHaveValue("decide");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("mode"))
    .toBe("decide");

  await expect(
    page.getByRole("navigation", { name: "议题导航" }),
  ).toContainText("最近议题");
  await expect(
    page.locator('.cos-issue-list-item[data-selected="true"]'),
  ).toBeVisible();

  const mobile = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  await mobile.goto(baseURL, { waitUntil: "networkidle" });
  await expect(mobile.getByRole("status")).toContainText("第一版仅支持桌面端");
  await expect(mobile.getByRole("main")).toBeHidden();
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await mobile.close();

  console.log(
    `Browser validation passed for decision thread ${threadId}; desktop flow and mobile guard verified.`,
  );
} finally {
  await browser.close();
}
