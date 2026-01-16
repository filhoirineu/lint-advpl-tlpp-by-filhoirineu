import { AnalysisResult, Issue } from "./types";
import { run as runNoUnusedLocal } from "./rules/advpl/no-unused-local";
import { run as runRequireLocal } from "./rules/advpl/require-local";
import { run as runHungarian } from "./rules/advpl/hungarian-notation";
import { run as runSuggestDefaultParams } from "./rules/advpl/suggest-default-params";

export function analyzeDocument(
  sourceText: string,
  fileName: string
): AnalysisResult {
  const issues: Issue[] = [];

  // run core advpl rules for now
  issues.push(...runNoUnusedLocal(sourceText, fileName));
  // suggest default params should run before require-local so defaults
  // are recognized and do not trigger require-local warnings
  issues.push(...runSuggestDefaultParams(sourceText, fileName));
  issues.push(...runRequireLocal(sourceText, fileName));
  issues.push(...runHungarian(sourceText, fileName));

  const summary = {
    blocksWithIssues: 0,
    localsCount: 0,
    defaultsCount: 0,
    issuesCount: issues.length,
  };

  return { fileName, blocks: [], issues, summary };
}

export default { analyzeDocument };
