import { chromium } from "@playwright/test";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";

const baseURL = (
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000"
).replace(/\/$/, "");
const evidenceDirectory = fileURLToPath(
  new URL("../../../docs/validation/issue-20/", import.meta.url),
);
const manifestPath = `${evidenceDirectory}/manifest.json`;

mkdirSync(evidenceDirectory, { recursive: true });
for (const filename of [
  "control-gallery-1440.png",
  "workbench-1440-new.png",
  "workbench-1440-running.png",
  "workbench-1440-waiting.png",
  "workbench-1440-formal.png",
  "workbench-1280-formal.png",
  "workbench-1024-formal.png",
  "workbench-960-desktop-only.png",
  "control-gallery-command-palette.png",
  "control-gallery-filter-popover.png",
  "control-gallery-icon-states.png",
  "control-gallery-table.png",
  "control-gallery-avatars.png",
  "control-gallery-modal.png",
  "control-gallery-toast.png",
  "control-gallery-keyboard-focus.png",
  "workbench-reduced-motion.png",
  "manifest.json",
]) {
  rmSync(`${evidenceDirectory}/${filename}`, { force: true });
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const evidence = [];
const failures = [];

function readPngDimensions(path) {
  const png = readFileSync(path);
  const signature = "89504e470d0a1a0a";
  if (png.subarray(0, 8).toString("hex") !== signature) {
    throw new Error(`${path} is not a PNG`);
  }
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

async function waitForStablePage(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (dimensions.scrollWidth > dimensions.clientWidth) {
    throw new Error(
      `${label} overflows horizontally: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px`,
    );
  }
}

async function capture({
  filename,
  fullPage = false,
  label,
  prepare,
  reducedMotion = "no-preference",
  route,
  viewport,
}) {
  const context = await browser.newContext({
    colorScheme: "dark",
    deviceScaleFactor: 1,
    reducedMotion,
    viewport,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  const path = `${evidenceDirectory}/${filename}`;
  try {
    const response = await page.goto(`${baseURL}${route}`);
    if (!response?.ok()) {
      throw new Error(
        `${label} returned HTTP ${response?.status() ?? "unknown"}`,
      );
    }
    await waitForStablePage(page);
    await prepare?.(page);
    await assertNoHorizontalOverflow(page, label);
    await page.screenshot({
      path,
      fullPage,
      animations: "disabled",
      caret: "initial",
    });

    if (consoleErrors.length > 0) {
      throw new Error(`${label} console errors: ${consoleErrors.join(" | ")}`);
    }

    const dimensions = readPngDimensions(path);
    if (dimensions.width !== viewport.width) {
      throw new Error(
        `${label} PNG width ${dimensions.width}px does not match ${viewport.width}px`,
      );
    }
    if (
      (!fullPage && dimensions.height !== viewport.height) ||
      (fullPage && dimensions.height < viewport.height)
    ) {
      throw new Error(
        `${label} PNG height ${dimensions.height}px is invalid for ${viewport.height}px viewport`,
      );
    }

    evidence.push({
      bytes: statSync(path).size,
      filename,
      height: dimensions.height,
      label,
      reducedMotion,
      route,
      viewport,
      width: dimensions.width,
    });
  } catch (error) {
    failures.push(
      `${label}: ${error instanceof Error ? error.message : error}`,
    );
  } finally {
    await context.close();
  }
}

const desktop1440 = { width: 1440, height: 900 };

await capture({
  filename: "control-gallery-1440.png",
  fullPage: true,
  label: "Control Gallery",
  route: "/control-gallery",
  viewport: desktop1440,
});

for (const [state, label, filenameState] of [
  ["new", "1440 new issue", "new"],
  ["running", "1440 in progress", "running"],
  ["waiting", "1440 waiting for decision", "waiting"],
  ["ready", "1440 formal counsel", "formal"],
]) {
  await capture({
    filename: `workbench-1440-${filenameState}.png`,
    label,
    route: `/workbench-preview?state=${state}`,
    viewport: desktop1440,
  });
}

await capture({
  filename: "workbench-1280-formal.png",
  label: "1280 formal counsel",
  route: "/workbench-preview?state=ready",
  viewport: { width: 1280, height: 800 },
});

await capture({
  filename: "workbench-1024-formal.png",
  label: "1024 compact desktop",
  route: "/workbench-preview?state=ready",
  viewport: { width: 1024, height: 768 },
});

await capture({
  filename: "workbench-960-desktop-only.png",
  label: "960 desktop-only guard",
  prepare: async (page) => {
    await page.getByRole("status").waitFor();
  },
  route: "/workbench-preview?state=ready",
  viewport: { width: 960, height: 720 },
});

await capture({
  filename: "control-gallery-command-palette.png",
  label: "Command palette",
  prepare: async (page) => {
    await page.keyboard.press("Control+K");
    await page.getByRole("dialog", { name: "命令面板" }).waitFor();
  },
  route: "/control-gallery",
  viewport: desktop1440,
});

await capture({
  filename: "control-gallery-filter-popover.png",
  label: "Filter popover",
  prepare: async (page) => {
    await page.locator("#overlays").scrollIntoViewIfNeeded();
    await page.getByRole("checkbox", { name: "方案设计" }).waitFor();
  },
  route: "/control-gallery",
  viewport: desktop1440,
});

await capture({
  filename: "control-gallery-icon-states.png",
  label: "Icon visual states",
  prepare: async (page) => {
    await page.locator("#actions").scrollIntoViewIfNeeded();
    await page.getByRole("group", { name: "图标按钮状态矩阵" }).waitFor();
  },
  route: "/control-gallery",
  viewport: desktop1440,
});

await capture({
  filename: "control-gallery-table.png",
  label: "Glass table",
  prepare: async (page) => {
    await page.locator("#data").scrollIntoViewIfNeeded();
    await page.getByRole("table", { name: "议题列表" }).waitFor();
  },
  route: "/control-gallery",
  viewport: desktop1440,
});

await capture({
  filename: "control-gallery-avatars.png",
  label: "Avatar system",
  prepare: async (page) => {
    await page.locator("#feedback").scrollIntoViewIfNeeded();
    await page.getByRole("group", { name: "头像在线状态矩阵" }).waitFor();
  },
  route: "/control-gallery",
  viewport: desktop1440,
});

await capture({
  filename: "control-gallery-modal.png",
  label: "Confirmation modal",
  prepare: async (page) => {
    await page.locator("#overlays").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "取消" }).first().click();
    await page.getByRole("dialog", { name: "确认采纳建议？" }).waitFor();
  },
  route: "/control-gallery",
  viewport: desktop1440,
});

await capture({
  filename: "control-gallery-toast.png",
  label: "Toast",
  prepare: async (page) => {
    await page.locator("#feedback").scrollIntoViewIfNeeded();
    await page.getByText("已采纳建议", { exact: true }).waitFor();
  },
  route: "/control-gallery",
  viewport: desktop1440,
});

await capture({
  filename: "control-gallery-keyboard-focus.png",
  label: "Keyboard focus",
  prepare: async (page) => {
    const actions = page.locator("#actions");
    const firstControl = actions.getByRole("button", { name: "新建议题" });
    const focusedControl = actions.getByRole("button", {
      name: "玻璃次按钮",
    });
    await firstControl.scrollIntoViewIfNeeded();
    const baseline = await focusedControl.evaluate((element) => {
      const style = getComputedStyle(element);
      return { boxShadow: style.boxShadow, outline: style.outline };
    });
    await firstControl.focus();
    await page.keyboard.press("Tab");
    if (
      !(await focusedControl.evaluate(
        (element) => element === document.activeElement,
      ))
    ) {
      throw new Error("Tab did not move focus to the expected control");
    }
    const indicatorVisible = await focusedControl.evaluate(
      (element, before) => {
        const style = getComputedStyle(element);
        return (
          style.boxShadow !== before.boxShadow ||
          style.outline !== before.outline ||
          (style.outlineStyle !== "none" &&
            Number.parseFloat(style.outlineWidth) > 0)
        );
      },
      baseline,
    );
    if (!indicatorVisible) throw new Error("focus-visible indicator is absent");
  },
  route: "/control-gallery",
  viewport: desktop1440,
});

await capture({
  filename: "workbench-reduced-motion.png",
  label: "Reduced motion",
  prepare: async (page) => {
    const runningAnimations = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running").length,
    );
    if (runningAnimations > 0) {
      throw new Error(
        `${runningAnimations} animation(s) still running with reduced motion`,
      );
    }
  },
  reducedMotion: "reduce",
  route: "/workbench-preview?state=running",
  viewport: desktop1440,
});

await browser.close();

writeFileSync(
  manifestPath,
  `${JSON.stringify(
    {
      baseURL,
      capturedAt: new Date().toISOString(),
      evidence,
      failures,
    },
    null,
    2,
  )}\n`,
);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Captured ${evidence.length} Issue #20 screenshots in ${evidenceDirectory}`,
  );
  for (const item of evidence) {
    console.log(
      `${item.filename}: ${item.width}x${item.height}, ${item.bytes} bytes`,
    );
  }
}
