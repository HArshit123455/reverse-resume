import { test, expect } from "@playwright/test";

test("sticky followup appears after first turn and stays visible on scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ask my work anything." })).toBeVisible();

  // No follow-up before the first question
  await expect(page.locator("[data-sticky-followup]")).toHaveCount(0);

  // Ask a curious question
  await page.locator("button").filter({ hasText: /What kind of work do you actually do/ }).first().click();

  // Wait for the streaming answer to start
  const assistantArticle = page.locator('article[aria-label="Assistant answer"]').last();
  await expect(assistantArticle).toBeVisible({ timeout: 8000 });
  await expect(assistantArticle).not.toHaveText("", { timeout: 30000 });

  // Sticky followup is mounted
  const followup = page.locator("[data-sticky-followup]");
  await expect(followup).toBeVisible();
  await expect(followup.getByPlaceholder(/Ask a follow-up/)).toBeVisible();

  // Scroll the page; followup must remain visible at the bottom of the viewport
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }));
  await expect(followup).toBeInViewport();
});
