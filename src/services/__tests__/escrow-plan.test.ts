import { describe, expect, it } from "vitest";
import { releaseConditionForProofPolicy } from "@/services/escrow";

describe("escrow milestone release policy mapping", () => {
  it("requires proof verification for escrow-eligible agents", () => {
    expect(releaseConditionForProofPolicy("escrow-eligible")).toBe("proof_verified");
  });

  it("requires receipt readiness for receipt-proof agents", () => {
    expect(releaseConditionForProofPolicy("receipt-proof")).toBe("receipt_ready");
  });

  it("uses manual release for trace-only and unknown policies", () => {
    expect(releaseConditionForProofPolicy("trace-only")).toBe("manual");
    expect(releaseConditionForProofPolicy(undefined)).toBe("manual");
  });
});
