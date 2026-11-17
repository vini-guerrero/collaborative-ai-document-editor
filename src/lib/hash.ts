// FNV-1a 32-bit constants (http://www.isthe.com/chongo/tech/comp/fnv/).
const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;
const HEX_RADIX = 16;
const HASH_HEX_WIDTH = 8;

/**
 * FNV-1a 32-bit hash of a string, as a fixed-width lowercase hex string (8 chars).
 * Hashes UTF-16 code units (`charCodeAt`), not UTF-8 bytes: JavaScript strings are
 * UTF-16 by spec, so the result is identical in every runtime without an encoder.
 * A lone surrogate hashes as its own code unit; non-ASCII text is stable across calls.
 * Synchronous and not cryptographic: it is used for cache keys and staleness checks
 * (D4, T10), never for security. Same input always yields the same output.
 */
export function fnv1a32(text: string): string {
  let hash = FNV_OFFSET_BASIS_32;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME_32);
  }
  // Math.imul yields a signed 32-bit value; >>> 0 restores the unsigned form for hex output.
  return (hash >>> 0).toString(HEX_RADIX).padStart(HASH_HEX_WIDTH, '0');
}
