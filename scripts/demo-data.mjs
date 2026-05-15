import crypto from "node:crypto";

export const DEMO_OWNER_ID = "demo:golden-path";
export const DEMO_TASK_ID = "demo_verix_golden_path";
export const DEMO_SPEND_CAP_USDC = 5;
export const DEMO_GOLDEN_PROMPT =
  "Audit a Soroban escrow milestone release flow for security risks, compare the market positioning against existing AI work platforms, and produce a concise investor-ready launch memo with proof-backed settlement requirements.";

export const DEMO_SPECIALISTS = [
  {
    id: "specialist_code_auditor",
    name: "CodeAuditor",
    description:
      "Reviews Soroban contracts, escrow release logic, and application code for security risks and verification gaps.",
    endpoint: "/api/specialists/code-auditor/execute",
    walletAddress: `G${"A".repeat(55)}`,
    capabilities: [
      "security-analysis",
      "code-review",
      "vulnerability-detection",
      "smart-contract-audit",
      "soroban-audit",
    ],
    priceUsdc: 1,
    reputation: 95,
    totalJobs: 142,
    status: "online",
    aiModel: "claude",
    proofPolicy: "receipt-proof",
    currentVersion: 1,
  },
  {
    id: "specialist_market_analyst",
    name: "MarketAnalyst",
    description:
      "Analyzes market demand, competitor positioning, pricing, and go-to-market strategy for autonomous work products.",
    endpoint: "/api/specialists/market-analyst/execute",
    walletAddress: `G${"B".repeat(55)}`,
    capabilities: [
      "market-research",
      "financial-analysis",
      "competitive-intelligence",
      "defi-analytics",
      "market-positioning",
    ],
    priceUsdc: 0.75,
    reputation: 88,
    totalJobs: 98,
    status: "online",
    aiModel: "openai",
    proofPolicy: "trace-only",
    currentVersion: 1,
  },
  {
    id: "specialist_creative_writer",
    name: "CreativeWriter",
    description:
      "Synthesizes technical and market findings into polished launch memos, product narratives, and investor-ready reports.",
    endpoint: "/api/specialists/creative-writer/execute",
    walletAddress: `G${"C".repeat(55)}`,
    capabilities: [
      "creative-writing",
      "report-writing",
      "business-documents",
      "whitepaper-drafting",
      "launch-memo",
    ],
    priceUsdc: 0.5,
    reputation: 92,
    totalJobs: 215,
    status: "online",
    aiModel: "openai",
    proofPolicy: "escrow-eligible",
    currentVersion: 1,
  },
];

export function computeVersionHash(specialist, version = 1) {
  const payload = [
    specialist.name,
    String(version),
    Number(specialist.priceUsdc).toFixed(6),
    specialist.walletAddress.toLowerCase(),
    [...specialist.capabilities].sort().join(","),
    specialist.proofPolicy,
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
}
