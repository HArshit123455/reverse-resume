import { test, expect } from "@playwright/test";

test("about page renders the key blocks", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "Harshit Sindhu", level: 1 })).toBeVisible();
  await expect(page.getByText("Where I've worked")).toBeVisible();
  await expect(page.getByRole("link", { name: /Download résumé/i })).toBeVisible();
});

test("header About link navigates to /about", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
});
