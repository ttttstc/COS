import { expect, test } from "@playwright/test";

test("connection setup keeps the ClauseOS optical environment", async ({
  page,
}) => {
  const opticalAssets = new Set<string>();
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/assets/optics/")) opticalAssets.add(url);
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "刘亚楼参谋台" }),
  ).toBeVisible();
  await expect(page.locator(".lyl-ambient-white-wash")).toHaveCount(1);
  await expect(page.locator(".lyl-glass-surface")).toHaveCount(1);
  await expect(page.locator(".lyl-glass-caustic")).toHaveCount(1);
  await expect(page.locator(".lyl-prism-corner-light")).toHaveCount(2);

  await expect
    .poll(() => [...opticalAssets].map((url) => new URL(url).pathname).sort())
    .toEqual([
      "/assets/optics/clauseos-caustic-light.png",
      "/assets/optics/clauseos-prism-dispersion.png",
    ]);
});
