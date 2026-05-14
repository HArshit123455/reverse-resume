import { test, expect } from "@playwright/test";

test("assistant message renders markdown + interactive citations", async ({ page }) => {
  // Intercept /api/chat and stream a fixture SSE response containing markdown + citations
  await page.route("**/api/chat", async (route) => {
    const events: string[] = [
      // Citation 1 arrives first so the marker can resolve
      `data: ${JSON.stringify({
        type: "citation",
        n: 1,
        chunk: {
          sourceType: "snippet",
          sourceProject: "reverse-resume",
          filePath: "content/snippets/postgres-token-bucket.mdx",
          title: "Postgres Token-Bucket",
          content: "Atomic per-IP rate limit using Postgres only.",
        },
      })}`,
      `data: ${JSON.stringify({ type: "token", text: "Yes — **one atomic SQL round trip**, no race.[1]\n\n" })}`,
      `data: ${JSON.stringify({ type: "token", text: "```ts\nconst x = 1;\n```\n" })}`,
      `data: ${JSON.stringify({ type: "done" })}`,
    ];
    const body = events.map((e) => `${e}\n\n`).join("");
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      body,
    });
  });

  await page.goto("/");
  await page.getByPlaceholder(/ask anything/i).fill("test question");
  await page.locator('button[type="submit"]').click();

  // Bold renders as <strong>
  const article = page.locator('article[aria-label="Assistant answer"]').last();
  await expect(article.locator("strong")).toHaveText("one atomic SQL round trip");

  // [1] becomes a focusable citation button
  const citationBtn = article.locator('button[aria-label*="Citation 1"]');
  await expect(citationBtn).toBeVisible();

  // Clicking the marker pulses the matching card (data-active="true")
  await citationBtn.click();
  const card = page.locator('[data-cite-n="1"]').first();
  await expect(card).toHaveAttribute("data-active", "true");

  // Fenced code block renders as a Shiki region
  await expect(article.getByRole("region", { name: /code excerpt/i })).toBeVisible();
});
