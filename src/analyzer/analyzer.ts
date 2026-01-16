import { AnalysisResult } from "./types";

// Fresh scaffold: minimal analyzer stub that returns no issues.
export function analyzeDocument(
  _sourceText: string,
  fileName: string
): AnalysisResult {
  return {
    fileName,
    blocks: [],
    issues: [],
    summary: {
      blocksWithIssues: 0,
      localsCount: 0,
      defaultsCount: 0,
      issuesCount: 0,
    },
  };
}

export default { analyzeDocument };
