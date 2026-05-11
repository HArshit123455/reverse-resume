import "dotenv/config";
import { db, closeDb } from "@/lib/db/client";
import { retrieve } from "@/lib/rag/retrieve";
import seed from "@/content/seed-questions.json";

interface SeedRow {
  id: string;
  question: string;
  must_cite_at_least_one_of: string[];
}

function chunkMatchesExpected(
  chunkSourcePath: string | null,
  sourceType: string,
  sourceProject: string | null,
  expected: string
): boolean {
  if (expected.startsWith("snippets/")) {
    return (
      sourceType === "snippet" &&
      (chunkSourcePath ?? "").endsWith(expected.slice("snippets/".length))
    );
  }
  if (expected.startsWith("experience/")) {
    const file = expected.slice("experience/".length).split("#")[0];
    return sourceType === "experience" && (chunkSourcePath ?? "").endsWith(file);
  }
  if (expected.startsWith("github/")) {
    const [, repo, ...rest] = expected.split("/");
    const path = rest.join("/");
    return sourceType === "github" && sourceProject === repo && chunkSourcePath === path;
  }
  return false;
}

async function main() {
  const database = db();
  const rows = seed as SeedRow[];
  let passed = 0;
  const failures: { id: string; question: string; topPaths: string[] }[] = [];

  for (const row of rows) {
    const result = await retrieve(database, row.question, { topK: 5 });
    const matched = result.some((c) =>
      row.must_cite_at_least_one_of.some((exp) =>
        chunkMatchesExpected(c.filePath, c.sourceType, c.sourceProject, exp)
      )
    );
    if (matched) {
      passed++;
    } else {
      failures.push({
        id: row.id,
        question: row.question,
        topPaths: result.map(
          (c) => `${c.sourceType}:${c.sourceProject ?? "-"}:${c.filePath}`
        ),
      });
    }
  }

  const recall = passed / rows.length;
  console.log(`recall@5 = ${recall.toFixed(3)} (${passed}/${rows.length})`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  [${f.id}] ${f.question}`);
      f.topPaths.forEach((p) => console.log(`     - ${p}`));
    }
  }

  await closeDb();
  if (recall < 0.9) {
    console.error(`\n✘ recall@5 below 0.9 threshold`);
    process.exit(1);
  }
  console.log(`\n✓ recall@5 ≥ 0.9`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
