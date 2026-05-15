import { describe, it, expect } from "vitest";
import { sha256, hashCanonical } from "../hash";

// Known-good SHA-256 digests for fixed inputs — anchors the implementation to
// the standard, not just to itself.
const KNOWN = {
  empty: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  hello: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
};

describe("sha256", () => {
  it("matches known digest for empty string", () => {
    expect(sha256("")).toBe(KNOWN.empty);
  });

  it("matches known digest for 'hello'", () => {
    expect(sha256("hello")).toBe(KNOWN.hello);
  });

  it("returns a 64-character lowercase hex string", () => {
    expect(sha256("any input")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input always produces same output", () => {
    const input = "determinism test";
    expect(sha256(input)).toBe(sha256(input));
    expect(sha256(input)).toBe(sha256(input));
  });

  it("differs for different inputs", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
    expect(sha256("abc")).not.toBe(sha256("ABC"));
    expect(sha256("hello")).not.toBe(sha256("hello "));
  });

  it("is sensitive to whitespace and casing", () => {
    expect(sha256("Hello")).not.toBe(sha256("hello"));
    expect(sha256("a b")).not.toBe(sha256("ab"));
  });
});

describe("hashCanonical", () => {
  it("is deterministic — same object always produces same hash", () => {
    const obj = { taskId: "t1", sequence: 0, actor: "coordinator" };
    expect(hashCanonical(obj)).toBe(hashCanonical(obj));
  });

  it("is key-order independent — insertion order does not matter", () => {
    const h1 = hashCanonical({ a: 1, b: 2, c: "three" });
    const h2 = hashCanonical({ c: "three", a: 1, b: 2 });
    const h3 = hashCanonical({ b: 2, c: "three", a: 1 });
    expect(h1).toBe(h2);
    expect(h2).toBe(h3);
  });

  it("changes when a field value changes", () => {
    const base = { taskId: "t1", sequence: 0, actor: "coordinator" };
    const changed = { taskId: "t1", sequence: 0, actor: "payment" };
    expect(hashCanonical(base)).not.toBe(hashCanonical(changed));
  });

  it("changes when a numeric field changes", () => {
    expect(hashCanonical({ seq: 0 })).not.toBe(hashCanonical({ seq: 1 }));
  });

  it("changes when a field is added", () => {
    const h1 = hashCanonical({ a: 1 });
    const h2 = hashCanonical({ a: 1, b: null });
    expect(h1).not.toBe(h2);
  });

  it("handles null values and distinguishes them from missing keys", () => {
    const withNull = hashCanonical({ x: null });
    const withNull2 = hashCanonical({ x: null });
    expect(withNull).toBe(withNull2);
    expect(withNull).not.toBe(hashCanonical({ x: "null" }));
    expect(withNull).not.toBe(hashCanonical({ x: 0 }));
  });

  it("sorts nested object keys recursively", () => {
    const h1 = hashCanonical({ outer: { z: 99, a: "first" } });
    const h2 = hashCanonical({ outer: { a: "first", z: 99 } });
    expect(h1).toBe(h2);
  });

  it("preserves array insertion order — [1,2,3] !== [3,2,1]", () => {
    const asc = hashCanonical({ arr: [1, 2, 3] });
    const desc = hashCanonical({ arr: [3, 2, 1] });
    expect(asc).not.toBe(desc);
  });

  it("same array content always hashes identically", () => {
    expect(hashCanonical({ arr: [1, 2, 3] })).toBe(hashCanonical({ arr: [1, 2, 3] }));
  });

  it("produces a 64-character hex string", () => {
    expect(hashCanonical({ any: "object" })).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles the canonical trace event shape", () => {
    const event = {
      taskId: "clxyz123",
      sequence: 0,
      eventType: "coordinator_start",
      actor: "coordinator",
      inputHash: null,
      outputHash: null,
      prevEventHash: null,
    };
    const h1 = hashCanonical(event);
    const h2 = hashCanonical(event);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});
