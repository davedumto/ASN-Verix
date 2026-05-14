export type ProofPolicy = "trace-only" | "receipt-proof" | "escrow-eligible";

export interface Specialist {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  walletAddress: string;
  capabilities: string[];
  priceUsdc: number;
  reputation: number;
  totalJobs: number;
  status: "online" | "offline" | "busy";
  aiModel?: "claude" | "openai";
  proofPolicy: ProofPolicy;
  currentVersion: number;
  apiKey?: string;        // encrypted, never sent to client
  apiKeyMasked?: string;  // "sk-abc...xyz1", safe for display
  ownerId?: string;       // session ID of registering user; null for system agents
}

export interface AgentVersion {
  id: string;
  specialistId: string;
  version: number;
  name: string;
  description: string;
  walletAddress: string;
  capabilities: string[];
  priceUsdc: number;
  proofPolicy: ProofPolicy;
  aiModel: string;
  versionHash: string;
  createdAt: string;
}
