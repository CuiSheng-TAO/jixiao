const SCREENSHOT_IMPORT_PREFIX = "由截图补录导入：";

type ImportedSupervisorEvalLike = {
  performanceComment?: string | null;
  abilityComment?: string | null;
  candidComment?: string | null;
  progressComment?: string | null;
  altruismComment?: string | null;
  rootComment?: string | null;
};

const REQUIRED_COMMENT_FIELDS: Array<keyof ImportedSupervisorEvalLike> = [
  "performanceComment",
  "abilityComment",
  "candidComment",
  "progressComment",
  "altruismComment",
  "rootComment",
];

function hasPlaceholderPrefix(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(SCREENSHOT_IMPORT_PREFIX);
}

export function isScreenshotImportedComment(value: string | null | undefined) {
  return hasPlaceholderPrefix(value);
}

export function hasPendingImportedSupervisorEvalComments(
  evaluation: ImportedSupervisorEvalLike | null | undefined,
) {
  if (!evaluation) return false;

  return REQUIRED_COMMENT_FIELDS.some((field) =>
    hasPlaceholderPrefix(evaluation[field]),
  );
}

export { SCREENSHOT_IMPORT_PREFIX };
