import { test, expect } from "@playwright/test";

test("Konami sequence triggers sparkle + toast", async ({ page }) => {
  await page.goto("/");
  // Click somewhere neutral so the body has focus (not the chat textarea — Konami
  // ignores keydowns when an input/textarea is the activeElement).
  await page.locator("header").click();
  for (const k of [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ]) {
    await page.keyboard.press(k);
  }
  await expect(
    page.getByRole("status").filter({ hasText: /konami/i })
  ).toBeVisible({ timeout: 2000 });
});
