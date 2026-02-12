export type Capability =
  | "security-analysis"
  | "market-research"
  | "creative-writing"
  | "code-review";

export interface Specialist {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  walletAddress: string;
  capabilities: Capability[];
  priceUsdc: number;
  reputation: number;
  totalJobs: number;
  status: "online" | "offline" | "busy";
}
