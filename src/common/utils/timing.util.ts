import { timingSafeEqual as nodeTimingSafeEqual } from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks.
 * Used for comparing hashes, tokens, and other sensitive strings.
 *
 * Returns false if either input is null, undefined, or empty, or if
 * the lengths differ (acceptable for fixed-length hash comparison).
 */
export function timingSafeEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return nodeTimingSafeEqual(bufA, bufB);
}
