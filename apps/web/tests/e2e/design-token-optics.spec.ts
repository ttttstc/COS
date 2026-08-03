import { expect, test } from "@playwright/test";

for (const width of [1440, 1280, 1024]) {
  test(`keeps the three-pane workbench inside the ${width}px desktop viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/workbench-preview");

    await expect(
      page.getByRole("navigation", { name: "议题导航" }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("region", { name: "参谋材料" })).toBeVisible();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test("keeps prism refraction local instead of stretching it across a panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/workbench-preview");

  const surface = page.locator(".cos-workbench__navigator-surface");
  const prism = surface.locator(
    '.lyl-prism-corner-light[data-corner="top-right"]',
  );
  const [surfaceBox, prismBox, prismStyle] = await Promise.all([
    surface.boundingBox(),
    prism.boundingBox(),
    prism.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundSize: style.backgroundSize,
        height: style.height,
        width: style.width,
      };
    }),
  ]);

  expect(surfaceBox).not.toBeNull();
  expect(prismBox).not.toBeNull();
  expect(prismStyle.backgroundSize).toBe("420px 236px");
  expect(prismStyle.width).toBe("36px");
  expect(prismStyle.height).toBe("16px");

  const prismArea = (prismBox?.width ?? 0) * (prismBox?.height ?? 0);
  const surfaceArea = (surfaceBox?.width ?? 1) * (surfaceBox?.height ?? 1);
  expect(prismArea / surfaceArea).toBeLessThan(0.01);
});

test("removes decorative transitions when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/workbench-preview");

  const transitionDuration = await page
    .locator(".cos-workbench__navigator-surface")
    .evaluate((element) => getComputedStyle(element).transitionDuration);

  expect(transitionDuration).toBe("0s");
});
