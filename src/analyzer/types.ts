export type BlockType =
  | "User"
  | "Static"
  | "Method"
  | "Class"
  | "WsMethod"
  | "WsRestFul";

export interface Suggestion {
  kind: "Local" | "Default";
  text: string;
  varName: string;
  blockName: string;
  blockType: BlockType;
}

export type IssueSeverity = "info" | "warning" | "error";

export interface Issue {
  ruleId: string;
  message: string;
  severity: IssueSeverity;
  line: number; // 1-based
  column: number; // 1-based
  functionName?: string;
}

export interface BlockResult {
  blockType: BlockType;
  blockName: string;
  locals: Suggestion[];
  defaults: Suggestion[];
}

export interface AnalysisResult {
  fileName: string;
  blocks: BlockResult[];
  issues: Issue[];
  summary: {
    blocksWithIssues: number;
    localsCount: number;
    defaultsCount: number;
    issuesCount: number;
  };
}
