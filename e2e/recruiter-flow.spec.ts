import { test, expect } from "@playwright/test";

test("recruiter can ask a question and see a streamed answer with citations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ask my work anything." })).toBeVisible();

  const firstPrompt = page
    .locator("button")
    .filter({ hasText: /Have you built/ })
    .first();
  await firstPrompt.click();

  // Assistant answer renders inside <article aria-label="Assistant answer">
  const assistantArticle = page.locator('article[aria-label="Assistant answer"]').last();
  await expect(assistantArticle).toBeVisible({ timeout: 8000 });
  // Has at least some content (not just "…")
  await expect(assistantArticle).not.toHaveText("", { timeout: 30000 });

  // Citations panel surfaces "Show excerpt" buttons; toggle the first
  const showExcerptButtons = page.locator('button:has-text("Show excerpt")');
  await expect(showExcerptButtons.first()).toBeVisible({ timeout: 30000 });
  await showExcerptButtons.first().click();

  // After expanding, a Shiki code region appears
  await expect(page.locator('[role="region"][aria-label*="Code excerpt"]').first()).toBeVisible();
});
