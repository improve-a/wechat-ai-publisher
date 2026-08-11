export type ValidatorMode = "preview" | "wechat-draft";
export type ValidatorSeverity = "error" | "warning";

export interface ValidatorIssue {
  code: string;
  message: string;
  severity: ValidatorSeverity;
  path?: string;
  layoutBlockId?: string;
  sourceBlockIds?: string[];
}

export interface ValidatorResult {
  valid: boolean;
  errors: ValidatorIssue[];
  warnings: ValidatorIssue[];
}

export interface ValidatorOptions {
  mode: ValidatorMode;
}
