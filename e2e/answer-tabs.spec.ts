import { test, expect } from "@playwright/test";

const CHAT_SSE = [
  `data: ${JSON.stringify({ type: "init", messageId: "fixt-msg-1", chunkIds: ["7", "11", "12"] })}\n\n`,
  `data: ${JSON.stringify({ type: "token", text: "Sample " })}\n\n`,
  `data: ${JSON.stringify({ type: "token", text: "answer." })}\n\n`,
  `data: ${JSON.stringify({ type: "done" })}\n\n`,
].join("");

test("answer tabs lazy-load on first click and cache thereafter", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
      body: CHAT_SSE,
    });
  });

  let impactCalls = 0;
  let codeCalls = 0;
  let storyCalls = 0;
  await page.route("**/api/chat/tab", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    if (body.tab === "impact") {
      impactCalls += 1;
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ num: "40", unit: "%", label: "Latency reduction on cold reads" }],
        }),
      });
      return;
    }
    if (body.tab === "code") {
      codeCalls += 1;
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chunk: {
            file: "src/cache.ts",
            language: "ts",
            code: "export const cache = new Map();",
            sourceProject: "infra",
            sourceUrl: null,
          },
        }),
      });
      return;
    }
    storyCalls += 1;
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
      body:
        `data: ${JSON.stringify({ type: "token", text: "It started " })}\n\n` +
        `data: ${JSON.stringify({ type: "token", text: "with a bug." })}\n\n` +
        `data: ${JSON.stringify({ type: "done" })}\n\n`,
    });
  });

  await page.goto("/");
  await page.getByPlaceholder(/Ask anything about Harshit/).fill("tell me about caches");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Sample answer.")).toBeVisible();

  await page.getByRole("tab", { name: /^impact$/i }).click();
  await expect(page.getByText("Latency reduction on cold reads")).toBeVisible();

  await page.getByRole("tab", { name: /^code$/i }).click();
  await expect(page.getByText("src/cache.ts")).toBeVisible();

  await page.getByRole("tab", { name: /^story$/i }).click();
  await expect(page.getByText("It started with a bug.")).toBeVisible();

  await page.getByRole("tab", { name: /^impact$/i }).click();
  await expect(page.getByText("Latency reduction on cold reads")).toBeVisible();
  expect(impactCalls).toBe(1);
  expect(codeCalls).toBe(1);
  expect(storyCalls).toBe(1);
});
