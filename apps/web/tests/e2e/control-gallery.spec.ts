import { expect, test } from "@playwright/test";

import { expectNoA11yViolations, expectNoHorizontalOverflow } from "./helpers";

test.describe("ClauseOS Control Gallery", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/control-gallery");
    await expect(
      page.getByRole("heading", { name: "LYL ClauseOS 全量控件 Gallery" }),
    ).toBeVisible();
  });

  test("Cmd/Ctrl+K opens the searchable command palette", async ({ page }) => {
    const shortcut = process.platform === "darwin" ? "Meta+K" : "Control+K";

    await page.keyboard.press(shortcut);

    const dialog = page.getByRole("dialog", { name: "命令面板" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("textbox", { name: "搜索命令" }),
    ).toBeFocused();
    await expect(dialog.locator("section > h3")).toHaveText([
      "最近使用",
      "快捷操作",
      "建议命令",
    ]);

    await dialog.getByRole("textbox", { name: "搜索命令" }).fill("历史");
    await expect(
      dialog.getByRole("button", { name: /搜索历史议题/ }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("keeps split-button menu in the keyboard tab order", async ({
    page,
  }) => {
    const primary = page.getByRole("button", { name: "形成建议", exact: true });
    const menuTrigger = page.locator(
      '.cos-split-button__menu > summary[aria-label="形成建议的更多操作"]',
    );

    await primary.focus();
    await page.keyboard.press("Tab");
    await expect(menuTrigger).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("menuitem", { name: "保存草稿" }),
    ).toBeFocused();
  });

  test("exposes the remaining P0 semantic primitives", async ({ page }) => {
    const primitives = page.locator("#primitives");
    await expect(
      primitives.getByText("AmbientWhiteWash", { exact: true }),
    ).toBeVisible();
    await expect(primitives.locator(".lyl-ambient-white-wash")).toHaveCount(1);
    await expect(
      primitives.getByRole("status").filter({ hasText: "DesktopOnlyGuard" }),
    ).toBeVisible();

    const threePane = primitives.getByRole("group", {
      name: "ThreePaneShell / ClauseOSWorkbench 概念样例",
    });
    await expect(threePane.locator(".lyl-glass-surface")).toHaveCount(3);
    await expect(
      threePane.getByRole("region", { name: "三栏概念左侧滚动区" }),
    ).toBeVisible();
    await expect(
      threePane.getByRole("region", { name: "三栏概念右侧滚动区" }),
    ).toBeVisible();
    await expect(threePane.getByRole("separator")).toHaveCount(2);

    const defaultSplit = primitives.getByRole("separator", {
      name: "Default SplitHandle",
    });
    await expect(defaultSplit).toHaveAttribute("data-state", "idle");
    await defaultSplit.focus();
    await page.keyboard.press("ArrowRight");
    await expect(defaultSplit).toHaveAttribute("aria-valuenow", "400");
    await expect(
      primitives.getByRole("separator", { name: "Dragging SplitHandle" }),
    ).toHaveAttribute("data-state", "dragging");
    const disabledSplit = primitives.getByRole("separator", {
      name: "Disabled SplitHandle",
    });
    await expect(disabledSplit).toHaveAttribute("aria-disabled", "true");
    await expect(disabledSplit).toHaveAttribute("tabindex", "-1");
    await expect(
      primitives.getByRole("region", {
        name: "独立纵向 ScrollArea 示例",
      }),
    ).toBeVisible();

    const status = page.locator("#status");
    await expect(status.getByRole("img", { name: "有新议题" })).toBeVisible();
    await expect(
      status.getByRole("img", { name: "120 条待处理通知" }),
    ).toHaveText("99+");
    for (const label of ["低优先级", "中优先级", "高优先级", "紧急优先级"]) {
      await expect(status.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(
      status.getByRole("button", { name: "已归档（禁用）" }),
    ).toBeDisabled();
    for (const tag of ["产品判断", "外部调研", "历史依据"]) {
      await expect(status.getByText(tag, { exact: true })).toBeVisible();
    }

    const data = page.locator("#data");
    const table = data.getByRole("table", { name: "议题列表" });
    await expect(table.getByRole("columnheader")).toHaveText([
      "全选议题",
      "议题",
      "负责人",
      "状态",
      "优先级",
      "截止日期",
      "操作",
    ]);
    const firstSelection = table.getByRole("checkbox", {
      name: "选择个人参谋产品第一版如何切入",
    });
    await expect(firstSelection).toBeChecked();
    await firstSelection.focus();
    await page.keyboard.press("Space");
    await expect(firstSelection).not.toBeChecked();
    await expect(
      data.getByRole("list", { name: "议题关键时间线" }),
    ).toHaveCount(1);
    await expect(
      data.getByRole("list", { name: "横向议题处理进度" }),
    ).toHaveCount(1);
    await expect(data.getByRole("list", { name: "纵向调研过程" })).toHaveCount(
      1,
    );
    await expect(
      data.getByRole("link", { name: "打开外部证据来源" }),
    ).toHaveAttribute("target", "_blank");
    await expect(data.getByRole("separator")).toHaveCount(3);
  });

  test("shows navigation and business state-matrix examples", async ({
    page,
  }) => {
    const navigation = page.locator("#navigation");
    const expanded = navigation.locator('[data-gallery-state="expanded"]');
    const collapsed = navigation.locator('[data-gallery-state="collapsed"]');

    await expect(expanded.getByText("ClauseOS", { exact: true })).toBeVisible();
    await expect(
      expanded.getByRole("button", { name: "新建议题" }),
    ).toBeEnabled();
    await expect(
      expanded.getByRole("button", { name: "默认议题" }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(
      expanded.getByRole("button", { name: "选中议题" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      expanded.getByRole("button", { name: "禁用议题" }),
    ).toBeDisabled();
    await expect(
      expanded.getByRole("img", { name: "3 个待处理议题" }),
    ).toBeVisible();
    await expect(collapsed.locator('[data-compact="true"]')).toHaveCount(1);
    await expect(
      collapsed.getByRole("button", { name: "新建议题" }),
    ).toBeDisabled();
    await expect(
      collapsed.getByRole("button", { name: "折叠区议题" }),
    ).toBeHidden();

    const business = page.locator("#business");
    const loadingMode = business.getByRole("button", {
      name: /调研模式加载中/,
    });
    await expect(loadingMode).toBeDisabled();
    await expect(loadingMode).toHaveAttribute("aria-busy", "true");
    await expect(
      business.getByRole("button", { name: /诊断历史思维（禁用）/ }),
    ).toBeDisabled();
    const failedIssue = business
      .locator(".cos-issue-list-item")
      .filter({ hasText: "证据同步失败" });
    await expect(failedIssue).toContainText("处理失败");

    const evidence = business.locator(".cos-gallery__evidence-grid");
    for (const relation of ["支持", "反对", "限制", "背景"]) {
      await expect(evidence.getByText(relation, { exact: true })).toHaveCount(
        1,
      );
    }
    await expect(evidence.getByRole("link", { name: "查看原文" })).toHaveCount(
      4,
    );
  });

  test("shows ContextPopover, blocked Popovers, and DangerDialog states", async ({
    page,
  }) => {
    const overlays = page.locator("#overlays");
    await expect(
      overlays.getByText("议题 #12：没有真实使用证据前，不扩大产品边界。"),
    ).toBeVisible();

    const loadingPopover = overlays
      .locator("summary")
      .filter({ hasText: "加载上下文" });
    await expect(loadingPopover).toHaveAttribute("aria-disabled", "true");
    await expect(loadingPopover.locator("..")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(
      overlays.locator("summary").filter({ hasText: "上下文不可用" }),
    ).toHaveAttribute("aria-disabled", "true");

    await overlays.getByRole("button", { name: "打开危险确认" }).click();
    let dialog = page.getByRole("dialog", { name: "删除这个议题？" });
    await expect(
      dialog.getByRole("button", { name: "确认删除" }),
    ).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await overlays.getByRole("button", { name: "查看危险提交中" }).click();
    dialog = page.getByRole("dialog", { name: "删除这个议题？" });
    const submitting = dialog.getByRole("button", { name: "确认删除" });
    await expect(submitting).toBeDisabled();
    await expect(submitting).toHaveAttribute("aria-busy", "true");
    await dialog.getByRole("button", { name: "取消" }).click();
    await expect(dialog).toBeHidden();
  });

  test("filter popover is keyboard-operable", async ({ page }) => {
    const trigger = page.locator(".cos-filter-popover > summary");
    const design = page.getByRole("checkbox", { name: "方案设计" });

    await expect(design).toBeVisible();
    await trigger.click();
    await expect(design).toBeHidden();
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(design).toBeVisible();
    await page.getByRole("button", { name: "显示更多" }).click();
    await expect(
      page.getByRole("checkbox", { name: "决策记录" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "应用筛选" }).click();
    await expect(design).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(
      page.locator('.cos-gallery__popover-stage--filter [role="status"]'),
    ).toHaveText("已应用 1 个类别筛选");

    await trigger.click();
    await page.getByRole("button", { name: "重置" }).click();
    await expect(design).not.toBeChecked();
    await expect(
      page.locator('.cos-gallery__popover-stage--filter [role="status"]'),
    ).toHaveText("筛选条件已重置");
  });

  test("assignee menu uses roving focus and keeps presence in sync", async ({
    page,
  }) => {
    const picker = page.locator(".cos-gallery__assignee-picker");
    const trigger = picker.locator("summary");
    await picker.scrollIntoViewIfNeeded();
    await trigger.click();
    await trigger.click();

    const liu = picker.getByRole("menuitemradio", { name: /刘亚楼/ });
    const wen = picker.getByRole("menuitemradio", { name: /温曦/ });
    await expect(liu).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(wen).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(picker.getByRole("menu")).toBeHidden();
    await expect(trigger).toContainText("温曦");
    await expect(trigger.locator(".cos-avatar")).toHaveAttribute(
      "data-presence",
      "busy",
    );
  });

  test("confirmation modal traps focus and closes with Escape", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "取消" }).first().click();

    const dialog = page.getByRole("dialog", { name: "确认采纳建议？" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "确认采纳" }),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "关闭" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("keyboard focus has a visible indicator", async ({ page }) => {
    await page.keyboard.press("Tab");

    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
    const indicator = await focused.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        boxShadow: style.boxShadow,
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
      };
    });
    expect(
      indicator.boxShadow !== "none" ||
        (indicator.outlineStyle !== "none" && indicator.outlineWidth > 0),
    ).toBe(true);
  });

  test("reduced motion disables running animations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();

    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((animation) => animation.playState === "running").length,
        ),
      )
      .toBe(0);
  });

  test("gallery is accessible and never overflows horizontally", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await expectNoHorizontalOverflow(page);
    await expectNoA11yViolations(page);

    await page.setViewportSize({ width: 1024, height: 768 });
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("SSR hydration compatibility", () => {
  test("ignores extension attributes added to the root html element", async ({
    page,
  }) => {
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /hydrated|hydration/i.test(message.text())
      ) {
        hydrationErrors.push(message.text());
      }
    });

    await page.addInitScript(() => {
      const applyExtensionAttributes = () => {
        if (!document.documentElement) return false;
        document.documentElement.setAttribute(
          "data-yd-metadata-content-site",
          "common",
        );
        document.documentElement.setAttribute("data-yd-content-ready", "true");
        return true;
      };

      if (!applyExtensionAttributes()) {
        const observer = new MutationObserver(() => {
          if (applyExtensionAttributes()) observer.disconnect();
        });
        observer.observe(document, { childList: true, subtree: true });
      }
    });

    await page.goto("/control-gallery", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "LYL ClauseOS 全量控件 Gallery" }),
    ).toBeVisible();
    expect(hydrationErrors).toEqual([]);
  });
});
