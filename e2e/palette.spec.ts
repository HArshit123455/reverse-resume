import { test, expect } from "@playwright/test";

test("Cmd-K opens the palette with 4 default sections; Esc closes", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Navigate")).toBeVisible();
  await expect(dialog.getByText("Audience")).toBeVisible();
  await expect(dialog.getByText("Connect")).toBeVisible();
  await expect(dialog.getByText("Settings")).toBeVisible();
  // Hidden section must NOT render in default open.
  await expect(dialog.getByText("Hidden")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("clicking the header Cmd-K pill opens the palette", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open command palette" }).click();
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
});

test("typing 'matrix' surfaces the Enter the Matrix hidden command", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await page.getByLabel("Search commands").fill("matrix");
  await expect(dialog.getByText("Enter the Matrix")).toBeVisible();
});
