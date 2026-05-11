import { test, expect } from "@playwright/test";

test("recruiter can ask a question and see a streamed answer with citations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Ask my work anything.")).toBeVisible();

  const firstPrompt = page
    .locator("button")
    .filter({ hasText: /Have you actually built/ })
    .first();
  await firstPrompt.click();

  const assistantBubble = page.locator("div.bg-neutral-100").last();
  await expect(assistantBubble).not.toHaveText("…", { timeout: 8000 });

  const citations = page.locator("aside").locator("text=Show excerpt");
  await expect(citations.first()).toBeVisible({ timeout: 30000 });

  await citations.first().click();
  await expect(page.locator("aside").locator("pre,code").first()).toBeVisible();
});
