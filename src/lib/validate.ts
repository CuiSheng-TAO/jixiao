export function sanitizeText(text: unknown, maxLen = 5000): string {
  if (!text || typeof text !== "string") return "";
  return text.slice(0, maxLen).trim();
}

export function validateStars(score: unknown): number | null {
  const n = Number(score);
  if (!Number.isInteger(n) || n < 0 || n > 5) return null;
  return n;
}