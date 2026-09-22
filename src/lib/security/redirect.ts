const ALLOWED_INTERNAL_PREFIXES = ["/dashboard", "/maps", "/login", "/register"];

export const DEFAULT_REDIRECT = "/dashboard";

/**
 * Validate a `next` query param is a safe in-app path.
 * Rejects absolute URLs, protocol-relative URLs, and unknown prefixes.
 */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next || next === "/") return DEFAULT_REDIRECT;

  const trimmed = next.trim();

  if (!trimmed.startsWith("/")) return DEFAULT_REDIRECT;
  // Block protocol-relative (//evil.com) and backslash tricks.
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return DEFAULT_REDIRECT;

  if (trimmed.includes("\\") || trimmed.includes(":")) return DEFAULT_REDIRECT;

  const pathname = trimmed.split("?")[0].split("#")[0];
  const allowed = ALLOWED_INTERNAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return allowed ? trimmed : DEFAULT_REDIRECT;
}

/**
 * Validate a code query param looks like a Supabase auth code.
 */
export function isPlausibleAuthCode(code: string): boolean {
  // PKCE auth codes are relatively short alphanumeric strings.
  return /^[A-Za-z0-9._~-]{10,}$/.test(code) && code.length <= 512;
}