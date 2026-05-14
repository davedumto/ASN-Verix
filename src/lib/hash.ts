import { createHash } from "crypto";

/**
 * SHA-256 of an arbitrary UTF-8 string. Returns a lowercase hex digest.
 */
export function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Deterministic JSON serialization with recursively sorted keys.
 * Arrays are serialized in insertion order; object keys are sorted
 * lexicographically at every nesting level so the output is the same
 * regardless of how the object was constructed.
 */
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value ?? null);
  }
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) =>
      `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`
  );
  return "{" + pairs.join(",") + "}";
}

/**
 * SHA-256 of the canonical (sorted-key) JSON serialization of obj.
 * Used for event hashing and receipt hashing so the digest is stable
 * across runtimes and key-insertion orders.
 */
export function hashCanonical(obj: Record<string, unknown>): string {
  return sha256(canonicalize(obj));
}
