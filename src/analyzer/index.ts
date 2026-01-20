import { AnalysisResult, Issue } from "./types";
import { run as runNoUnusedLocal } from "./rules/advpl/no-unused-local";
import { run as runRequireLocal } from "./rules/advpl/require-local";
import { run as runHungarian } from "./rules/advpl/hungarian-notation";
import { run as runSuggestDefaultParams } from "./rules/advpl/suggest-default-params";
import { run as runRequireExplicitPrivate } from "./rules/advpl/require-explicit-private";
import { run as runIncludeReplace } from "./rules/advpl/include-replace";
import { run as runRequireDocHeader } from "./rules/advpl/require-doc-header";
import { run as runNoWithNoLock } from "./rules/advpl/no-with-nolock";
import { run as runUseCrlf } from "./rules/advpl/use-crlf";

export function analyzeDocument(
  sourceText: string,
  fileName: string,
  options?: {
    ignoredNames?: string[];
    hungarianSuggestInitializers?: boolean;
    hungarianIgnoreAsType?: boolean;
    requireDocHeaderRequireName?: boolean;
    requireDocHeaderIgnoreWsMethodInWsRestful?: boolean;
    database?: string;
    enableRules?: boolean;
    enabledRules?: Record<string, boolean>;
  }
): AnalysisResult {
  const issues: Issue[] = [];

  const masterEnabled = options?.enableRules !== false;
  const enabledRules = options?.enabledRules || {};

  // run core advpl rules for now (respect masterEnabled and per-rule flags)
  if (masterEnabled && enabledRules["advpl/no-unused-local"] !== false) {
    issues.push(...runNoUnusedLocal(sourceText, fileName, options));
  }
  if (
    masterEnabled &&
    enabledRules["advpl/require-explicit-private"] !== false
  ) {
    issues.push(...runRequireExplicitPrivate(sourceText, fileName, options));
  }
  if (
    masterEnabled &&
    enabledRules["advpl/suggest-default-for-params"] !== false
  ) {
    issues.push(...runSuggestDefaultParams(sourceText, fileName));
  }
  if (masterEnabled && enabledRules["advpl/require-local"] !== false) {
    issues.push(...runRequireLocal(sourceText, fileName, options));
  }
  if (masterEnabled && enabledRules["advpl/hungarian-notation"] !== false) {
    issues.push(...runHungarian(sourceText, fileName, options));
  }
  if (masterEnabled && enabledRules["advpl/require-doc-header"] !== false) {
    issues.push(...runRequireDocHeader(sourceText, fileName, options));
  }
  if (masterEnabled && enabledRules["advpl/include-replace"] !== false) {
    issues.push(...runIncludeReplace(sourceText, fileName));
  }
  if (masterEnabled && enabledRules["advpl/no-with-nolock"] !== false) {
    issues.push(
      ...runNoWithNoLock(sourceText, fileName, { database: options?.database })
    );
  }
  if (masterEnabled && enabledRules["advpl/use-crlf"] !== false) {
    issues.push(...runUseCrlf(sourceText, fileName));
  }

  const summary = {
    blocksWithIssues: 0,
    localsCount: 0,
    defaultsCount: 0,
    issuesCount: issues.length,
  };

  return { fileName, blocks: [], issues, summary };
}

export default { analyzeDocument };
