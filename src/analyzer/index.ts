import { AnalysisResult, Issue } from "./types";
import { run as runNoUnusedLocal } from "./rules/advpl/no-unused-local";
import { run as runRequireLocal } from "./rules/advpl/require-local";
import { run as runHungarian } from "./rules/advpl/hungarian-notation";
import { run as runSuggestDefaultParams } from "./rules/advpl/suggest-default-params";
import { run as runRequireExplicitPrivate } from "./rules/advpl/require-explicit-private";

export function analyzeDocument(
  sourceText: string,
  fileName: string,
  options?: { ignoredNames?: string[]; hungarianSuggestInitializers?: boolean }
): AnalysisResult {
  const issues: Issue[] = [];

  // run core advpl rules for now
  issues.push(...runNoUnusedLocal(sourceText, fileName, options));
  // prefer explicit Private declarations instead of SetPrvt(...)
  issues.push(...runRequireExplicitPrivate(sourceText, fileName, options));
  // suggest default params should run before require-local so defaults
  // are recognized and do not trigger require-local warnings
  issues.push(...runSuggestDefaultParams(sourceText, fileName));
  issues.push(...runRequireLocal(sourceText, fileName, options));
  issues.push(...runHungarian(sourceText, fileName, options));

  const summary = {
    blocksWithIssues: 0,
    localsCount: 0,
    defaultsCount: 0,
    issuesCount: issues.length,
  };

  return { fileName, blocks: [], issues, summary };
}

export default { analyzeDocument };
