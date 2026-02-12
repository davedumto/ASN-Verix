export type TaskStatus =
  | "pending"
  | "decomposing"
  | "discovering"
  | "processing"
  | "completed"
  | "failed";

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  totalCost?: number;
  result?: TaskResult;
  subtasks?: Subtask[];
  events?: TaskEvent[];
  spendCap?: number;
  createdAt: string;
  completedAt?: string;
}

export interface Subtask {
  id: string;
  capability: string;
  specialistId?: string;
  specialistName?: string;
  status: TaskStatus;
  cost?: number;
  result?: string;
}

export interface TaskResult {
  summary: string;
  deliverables: Deliverable[];
  paymentBreakdown: PaymentItem[];
  totalCost: number;
  totalTime: number;
}

export interface Deliverable {
  title: string;
  content: string;
  specialistName: string;
}

export interface PaymentItem {
  specialist: string;
  amount: number;
  txHash: string;
  blockNumber?: number;
  from?: string;
  to?: string;
  status: "pending" | "confirmed" | "failed";
}

export interface TaskEvent {
  type: "coordinator" | "specialist" | "payment" | "system";
  message: string;
  status: "info" | "success" | "error" | "pending";
  timestamp: string;
}

export interface CreateTaskRequest {
  description: string;
  spendCap?: number;
}

export interface CreateTaskResponse {
  task_id: string;
  estimated_cost: number;
  subtasks: string[];
}
