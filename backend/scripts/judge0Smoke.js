import { normalizeExecution, executeTests } from "../src/codingAssessment.js";
if (!process.env.JUDGE0_BASE_URL) {
  console.error("Judge0 is not configured. Set JUDGE0_BASE_URL and any required authentication in backend/.env.");
  process.exitCode = 1;
} else {
  try {
    const input = normalizeExecution({ problemId: "array-sum", language: "Python", code: "import sys\na=list(map(int,sys.stdin.read().split()))\nprint(sum(a[1:]))" });
    const sample = await executeTests(input, false);
    const hidden = await executeTests(input, true);
    if (sample.passedTests !== sample.totalTests || hidden.passedTests !== hidden.totalTests) throw new Error("The known-correct smoke program did not pass.");
    console.log(JSON.stringify({ provider: "Judge0", sampleTests: sample.passedTests, hiddenTests: hidden.passedTests, status: "passed", note: "No user history or Placement state was changed." }));
  } catch { console.error("Judge0 smoke check failed. Verify its endpoint, authentication, language support, and availability. No score was recorded."); process.exitCode = 1; }
}
