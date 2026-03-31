import type { SessionUser } from "@/lib/session";

const NORMALIZATION_VIEWER_NAMES = new Set(["吴承霖", "邱翔", "禹聪琪"]);

function hasNormalizationAccess(user: Pick<SessionUser, "role" | "name">) {
  return user.role === "ADMIN" || NORMALIZATION_VIEWER_NAMES.has(user.name);
}

export function canAccessScoreNormalization(user: Pick<SessionUser, "role" | "name">) {
  return hasNormalizationAccess(user);
}

export function canApplyScoreNormalization(user: Pick<SessionUser, "role" | "name">) {
  return hasNormalizationAccess(user);
}
