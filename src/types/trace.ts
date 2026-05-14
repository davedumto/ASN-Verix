export type TraceEventType =
  | "coordinator_start"
  | "task_decomposed"
  | "spend_cap_check"
  | "spend_cap_exceeded"
  | "specialist_assigned"
  | "payment_initiated"
  | "payment_confirmed"
  | "payment_failed"
  | "specialist_invoked"
  | "specialist_completed"
  | "specialist_failed"
  | "task_completed"
  | "task_failed";

export interface ExecutionTraceEvent {
  id: string;
  taskId: string;
  sequence: number;
  eventType: TraceEventType;
  actor: string;
  displayMessage: string;
  inputHash?: string;
  outputHash?: string;
  eventHash: string;
  prevEventHash?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface PaymentSummaryItem {
  specialist: string;
  amount: number;
  txHash?: string;
  agentVersion?: number;
  versionHash?: string;
}

export interface ExecutionReceipt {
  id: string;
  taskId: string;
  taskInputHash: string;
  agentVersionHashes: string[];
  spendCap?: number;
  totalCost?: number;
  traceRoot: string;
  outputHash?: string;
  paymentSummary: PaymentSummaryItem[];
  receiptHash: string;
  status: "pending" | "proof_ready" | "verified";
  createdAt: string;
}
