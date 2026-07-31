import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const target = process.argv[2] ?? "http://127.0.0.1:3000/control-gallery";
const url = existsSync(target) ? pathToFileURL(target).href : target;
const screenshotPath = process.argv[3];
const width = Number(process.argv[4] ?? 1440);
const height = Number(process.argv[5] ?? 900);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
  reducedMotion:
    process.env.REDUCED_MOTION === "1" ? "reduce" : "no-preference",
});
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(750);
if (screenshotPath) {
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    caret: "initial",
  });
}

const report = await page.evaluate(() => ({
  animations: document.getAnimations().map((animation) => ({
    className:
      animation.effect?.target instanceof Element
        ? animation.effect.target.className
        : "",
    name:
      animation instanceof CSSAnimation
        ? animation.animationName
        : "transition",
    playState: animation.playState,
    tagName:
      animation.effect?.target instanceof Element
        ? animation.effect.target.tagName
        : "",
  })),
  bodyBackground: getComputedStyle(document.body).backgroundColor,
  iElements: [...document.querySelectorAll("i")].map(
    (element) => element.outerHTML,
  ),
  verticalOverflow: [...document.querySelectorAll("body *")]
    .map((element) => ({
      bottom: Math.round(element.getBoundingClientRect().bottom),
      className: typeof element.className === "string" ? element.className : "",
      tagName: element.tagName,
    }))
    .filter((item) => item.bottom > window.innerHeight)
    .slice(0, 12),
  documentHeight: document.documentElement.scrollHeight,
  documentWidth: document.documentElement.scrollWidth,
  title: document.title,
  viewportWidth: window.innerWidth,
}));

console.log(JSON.stringify({ ...report, consoleErrors }, null, 2));
await browser.close();

if (consoleErrors.length > 0 || report.documentWidth > width)
  process.exitCode = 1;
