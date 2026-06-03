import { test, expect } from "@playwright/test";

test.describe("About page", () => {
  test("renders all five sections", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1, name: "Harshit Sindhu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Experience & education" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What I work with" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Achievements" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Download résumé/i })).toBeVisible();
  });

  test("timeline shows the current-role marker", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByText("Currently")).toBeVisible();
  });

  test("footer About link is reachable on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const aboutLink = page.getByRole("contentinfo").getByRole("link", { name: "About" });
    await aboutLink.scrollIntoViewIfNeeded();
    await aboutLink.click();
    await expect(page).toHaveURL(/\/about$/);
  });
});
