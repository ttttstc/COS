import { expect, test, type Page } from "@playwright/test";

import { expectNoA11yViolations, expectNoHorizontalOverflow } from "./helpers";

const MATERIAL_TABS = ["参谋结论", "关键证据", "历史依据", "调研过程"];

async function openPreview(page: Page, state: string) {
  await page.goto(`/workbench-preview?state=${state}`);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "议题导航" }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "参谋材料" }),
  ).toBeVisible();
}

async function expectMaterialTabs(page: Page) {
  const tablist = page.getByRole("tablist", { name: "参谋材料" });
  await expect(tablist).toBeVisible();
  await expect(tablist.getByRole("tab")).toHaveCount(4);

  for (const label of MATERIAL_TABS) {
    await expect(
      tablist.getByRole("tab", { name: new RegExp(label) }),
    ).toBeVisible();
  }
}

test.describe("ClauseOS workbench fixture states", () => {
  test("new state exposes four issue modes and composer", async ({ page }) => {
    await openPreview(page, "new");
    const workspace = page.getByRole("main");

    for (const mode of [
      "下一步做什么",
      "帮我做决定",
      "调研后判断",
      "诊断历史思维",
    ]) {
      await expect(
        workspace.getByRole("button", { name: new RegExp(mode) }),
      ).toBeVisible();
    }
    await expect(
      workspace.getByRole("textbox", { name: "议题输入" }),
    ).toBeVisible();
    await expectMaterialTabs(page);
  });

  test("running state exposes research progress", async ({ page }) => {
    await openPreview(page, "running");
    const workspace = page.getByRole("main");

    await expect(workspace.getByText(/调研中|正在调研/).first()).toBeVisible();
    const progress = workspace.getByRole("list", {
      name: "议题处理进度",
    });
    await expect(progress).toBeVisible();
    await expect(progress).toHaveClass(/cos-stage-progress/);
    await expect(progress.locator('[aria-current="step"]')).toBeVisible();
    await expectMaterialTabs(page);

    await page.getByRole("tab", { name: /调研过程/ }).click();
    const material = page.getByRole("complementary", { name: "参谋材料" });
    const researchProgress = material.getByRole("list", { name: "调研过程" });
    await expect(researchProgress).toBeVisible();
    await expect(researchProgress).toHaveClass(/cos-research-progress/);
    await expect(researchProgress.locator("li")).toHaveCount(3);
    await expect(material.locator(".cos-stage-progress")).toHaveCount(0);
  });

  test("waiting state exposes an interrupt that needs a decision", async ({
    page,
  }) => {
    await openPreview(page, "waiting");

    const interrupt = page
      .getByRole("main")
      .getByRole("alert", { name: "先确定验证顺序" });
    await expect(interrupt).toBeVisible();
    await expect(interrupt.getByRole("radio")).toHaveCount(2);
    await expectMaterialTabs(page);
  });

  test("ready state exposes formal counsel output", async ({ page }) => {
    await openPreview(page, "ready");
    const workspace = page.getByRole("main");

    await expect(
      workspace.getByRole("heading", { name: "主要矛盾" }),
    ).toBeVisible();
    await expect(
      workspace.getByRole("heading", { name: "明确建议" }),
    ).toBeVisible();
    await expect(
      workspace.getByRole("meter", { name: /置信度|信心/ }),
    ).toBeVisible();
    await expect(
      workspace.getByRole("heading", { name: "改判条件" }),
    ).toBeVisible();
    await expectMaterialTabs(page);
    await expectNoA11yViolations(page);
  });
});

test.describe("ClauseOS desktop layout", () => {
  for (const viewport of [
    { width: 1440, height: 900, navigation: 272, material: 392, maximum: 520 },
    { width: 1280, height: 800, navigation: 240, material: 360, maximum: 392 },
    { width: 1024, height: 768, navigation: 72, material: 320, maximum: 320 },
  ]) {
    test(`${viewport.width}px uses canonical panel widths`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openPreview(page, "ready");

      const navigation = page.getByRole("navigation", { name: "议题导航" });
      const material = page.getByRole("complementary", { name: "参谋材料" });
      await expect(navigation).toBeVisible();
      await expect(material).toBeVisible();

      const [navigationBox, materialBox] = await Promise.all([
        navigation.boundingBox(),
        material.boundingBox(),
      ]);
      expect(
        Math.abs((navigationBox?.width ?? 0) - viewport.navigation),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs((materialBox?.width ?? 0) - viewport.material),
      ).toBeLessThanOrEqual(1);
      const separator = page.getByRole("separator", {
        name: "调整参谋材料宽度",
      });
      await expect(separator).toHaveAttribute(
        "aria-valuemax",
        String(viewport.maximum),
      );
      if (viewport.maximum === 320) {
        await expect(separator).toHaveAttribute("tabindex", "-1");
      }
      if (viewport.width === 1280) {
        const issueItems = navigation.locator(".cos-issue-list-item");
        const itemBoxes = await issueItems.evaluateAll((items) =>
          items.map((item) => item.getBoundingClientRect().height),
        );
        expect(Math.max(...itemBoxes)).toBeLessThanOrEqual(72);
        await expect(
          navigation
            .locator(".cos-issue-status-badge")
            .filter({ hasText: "待用户裁决" }),
        ).toBeVisible();
      }
      await expectNoHorizontalOverflow(page);
    });
  }

  test("issue rows reveal a working overflow menu", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPreview(page, "ready");
    const navigation = page.getByRole("navigation", { name: "议题导航" });
    const issue = navigation.locator(".cos-issue-list-item").first();
    await issue.hover();
    await issue.locator("summary").click();
    await expect(
      issue.getByRole("menuitem", { name: "打开议题" }),
    ).toBeVisible();
  });

  test("below 1024px shows the desktop-only guard", async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 720 });
    await page.goto("/workbench-preview?state=ready");

    await expect(page.getByRole("status")).toContainText("第一版仅支持桌面端");
    await expect(page.getByRole("main")).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });

  test("material tab, collapsed state, and keyboard width survive reload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPreview(page, "ready");

    const evidenceTab = page.getByRole("tab", { name: /关键证据/ });
    await evidenceTab.click();
    await page.reload();
    await expect(page.getByRole("tab", { name: /关键证据/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const separator = page.getByRole("separator", {
      name: "调整参谋材料宽度",
    });
    await separator.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(separator).toHaveAttribute("aria-valuenow", "400");
    await page.reload();
    await expect(
      page.getByRole("separator", { name: "调整参谋材料宽度" }),
    ).toHaveAttribute("aria-valuenow", "400");

    await page.getByRole("button", { name: "收起参谋材料" }).first().click();
    await page.reload();
    await expect(
      page.getByRole("complementary", { name: "参谋材料" }),
    ).toBeHidden();
    await expect(
      page.getByRole("button", { name: "展开参谋材料" }),
    ).toBeVisible();
  });
});
