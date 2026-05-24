import { test, expect } from "@playwright/test";

test("typing 'mumma' in the chat input triggers love mode + toast", async ({ page }) => {
  await page.goto("/");
  const input = page.getByPlaceholder(/Ask anything about Harshit/i);
  await input.fill("hi mumma");
  await input.press("Enter");
  // html[data-mode="love"] flips for 7s — the existing CSS shifts --accent to pink.
  await expect(page.locator("html[data-mode='love']")).toHaveCount(1, { timeout: 2000 });
  await expect(page.getByRole("status").filter({ hasText: /Mumma/ })).toBeVisible();
});
