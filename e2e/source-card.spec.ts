import { test, expect } from "@playwright/test";

test("source card excerpts expand and collapse", async ({ page }) => {
  await page.goto("/");

  // Ask anything that will produce citations
  await page.locator("button").filter({ hasText: /What kind of work do you actually do/ }).first().click();

  // Wait for the desktop rail to show at least one Show-excerpt button
  const showButtons = page.locator('[data-sources-rail] button:has-text("Show excerpt")');
  await expect(showButtons.first()).toBeVisible({ timeout: 30000 });

  // Expand the first card
  const firstShow = showButtons.first();
  await firstShow.click();
  await expect(page.locator('[role="region"][aria-label*="Code excerpt"]').first()).toBeVisible();
  // Button now reads "Hide excerpt"
  await expect(page.locator('[data-sources-rail] button:has-text("Hide excerpt")').first()).toBeVisible();

  // Collapse it again
  await page.locator('[data-sources-rail] button:has-text("Hide excerpt")').first().click();
  await expect(page.locator('[data-sources-rail] button:has-text("Show excerpt")').first()).toBeVisible();
});

test("mobile sources rail collapses into a details accordion", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "viewport behavior is browser-agnostic; run once");
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/");

  await page.locator("button").filter({ hasText: /What kind of work do you actually do/ }).first().click();

  // Mobile rail is a <details> element
  const mobileRail = page.locator("[data-sources-rail-mobile]");
  await expect(mobileRail).toBeVisible();
  // It starts collapsed
  expect(await mobileRail.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
  // Click the summary to open it
  await mobileRail.locator("summary").click();
  expect(await mobileRail.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);
});
