import { AnalysisResult, Issue } from "./types";
import { run as runNoUnusedLocal } from "./rules/advpl/no-unused-local";
import { run as runRequireLocal } from "./rules/advpl/require-local";
import { run as runHungarian } from "./rules/advpl/hungarian-notation";
import { run as runSuggestDefaultParams } from "./rules/advpl/suggest-default-params";
import { run as runRequireExplicitPrivate } from "./rules/advpl/require-explicit-private";
import { run as runIncludeReplace } from "./rules/advpl/include-replace";
import { run as runRequireDocHeader } from "./rules/advpl/require-doc-header";
import { run as runRequireWithNoLock } from "./rules/advpl/require-with-nolock";
import { run as runUseCrlf } from "./rules/advpl/use-crlf";
import { run as runRequireFieldRef } from "./rules/advpl/require-field-reference";
import { run as runRequireFieldTable } from "./rules/advpl/require-field-table";
import { run as runNoUnusedStatic } from "./rules/advpl/no-unused-static-function";

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
    ignoredFiles?: string[];
  },
): AnalysisResult {
  const issues: Issue[] = [];

  // If the file is configured to be ignored, return an empty analysis result.
  if (options?.ignoredFiles && options.ignoredFiles.length > 0) {
    const fileLower = fileName.toLowerCase();
    const fileNorm = fileLower.replace(/\\/g, "/");
    const fileBase = fileNorm.split("/").pop() || fileNorm;
    for (const pat of options.ignoredFiles) {
      if (!pat) continue;
      const p = pat.toLowerCase();
      const pNorm = p.replace(/\\/g, "/");
      try {
        if (p.includes("*") || p.includes("?")) {
          // convert simple glob to regex: escape regex-special chars, then
          // convert '*' -> '.*' and '?' -> '.'; test against lowercased path
          const escaped = pNorm.replace(/([.+^${}()|[\\]\\\\])/g, "\\$1");
          const globRe =
            "^" + escaped.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
          const re = new RegExp(globRe, "i");
          if (re.test(fileNorm) || re.test(fileBase))
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

        // match by basename or path-suffix (avoid matching arbitrary substrings)
        if (fileBase === pNorm) {
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

        if (pNorm.includes("/")) {
          // pattern contains path segments: match full normalized suffix or exact
          if (fileNorm === pNorm || fileNorm.endsWith("/" + pNorm)) {
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
        } else {
          // no path in pattern: match basename or filename suffix
          if (fileNorm.endsWith("/" + pNorm) || fileLower.endsWith(p)) {
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
        }
      } catch (e) {
        // ignore bad pattern
      }
    }
  }

  const masterEnabled = options?.enableRules !== false;
  const enabledRules = options?.enabledRules || {};

  // run core advpl rules for now (respect masterEnabled and per-rule flags)
  // Prioritize unused static-function detection first
  if (
    masterEnabled &&
    enabledRules["advpl/no-unused-static-function"] !== false
  ) {
    issues.push(...runNoUnusedStatic(sourceText, fileName));
  }
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
  if (masterEnabled && enabledRules["advpl/require-with-nolock"] !== false) {
    issues.push(
      ...runRequireWithNoLock(sourceText, fileName, {
        database: options?.database,
      }),
    );
  }
  if (masterEnabled && enabledRules["advpl/use-crlf"] !== false) {
    issues.push(...runUseCrlf(sourceText, fileName));
  }

  if (
    masterEnabled &&
    enabledRules["advpl/require-field-reference"] !== false
  ) {
    issues.push(...runRequireFieldRef(sourceText, fileName));
  }
  if (masterEnabled && enabledRules["advpl/require-field-table"] !== false) {
    issues.push(...runRequireFieldTable(sourceText, fileName));
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
