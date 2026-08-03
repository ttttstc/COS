import { expect, test } from "@playwright/test";

test("home presents an immersive space hero with one entry action", async ({
  page,
}) => {
  let heroAssetLoaded = false;
  page.on("response", (response) => {
    if (response.url().includes("/assets/home/clauseos-orbital-hero.png")) {
      heroAssetLoaded = response.ok();
    }
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "刘亚楼参谋台" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "拆解复杂议题、调研关键事实、权衡多方约束，并给出清晰可执行的决策建议。",
    ),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "设置" })).toHaveCount(0);
  await expect(page.locator(".cos-stream-home__media")).toBeVisible();
  const enterButton = page.getByRole("button", { name: /进入参谋台/ });
  await expect(enterButton).toBeVisible();
  await expect.poll(() => heroAssetLoaded).toBe(true);

  await enterButton.click();
  await page.getByRole("button", { name: "打开设置" }).click();
  await expect(page.getByRole("heading", { name: "连接设置" })).toBeVisible();
  await expect(page.getByLabel("服务地址*")).toHaveValue(
    "http://localhost:2024",
  );
});
