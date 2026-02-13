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
  apiKey?: string;        // encrypted, never sent to client
  apiKeyMasked?: string;  // "sk-abc...xyz1", safe for display
}
