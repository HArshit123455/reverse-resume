import { test, expect } from "@playwright/test";

test("audience pill persists to localStorage and changes the visible chip set", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ask my work anything." })).toBeVisible();

  // Curious is the default — verify a curious chip is visible
  await expect(page.locator("button").filter({ hasText: /What kind of work do you actually do/ })).toBeVisible();

  // Click Engineer
  await page.getByRole("radio", { name: /engineer/i }).click();
  await expect(page.getByRole("radio", { name: /engineer/i })).toHaveAttribute("aria-checked", "true");

  // Engineer chip should now be visible; the curious one should not
  await expect(page.locator("button").filter({ hasText: /Show me how you built production rate limiting/ })).toBeVisible();
  await expect(page.locator("button").filter({ hasText: /What kind of work do you actually do/ })).toHaveCount(0);

  // Reload — Engineer must persist
  await page.reload();
  await expect(page.getByRole("radio", { name: /engineer/i })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("button").filter({ hasText: /Show me how you built production rate limiting/ })).toBeVisible();
});
