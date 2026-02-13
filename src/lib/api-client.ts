import { CreateTaskRequest, CreateTaskResponse, Task } from "@/types/task";
import { Specialist } from "@/types/specialist";
import { WalletBalance } from "@/types/payment";

const API_URL = process.env.NEXT_PUBLIC_APP_URL || "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.statusText}`);
  }

  return response.json();
}

export async function submitTask(
  data: CreateTaskRequest
): Promise<CreateTaskResponse> {
  return request("/api/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTaskStatus(taskId: string): Promise<Task> {
  return request(`/api/tasks/${taskId}`);
}

export async function getSpecialists(): Promise<Specialist[]> {
  return request("/api/specialists");
}

export async function registerSpecialist(data: {
  name: string;
  description: string;
  capabilities: string;
  priceUsdc: number;
  walletAddress: string;
  aiModel: "claude" | "openai";
  apiKey?: string;
}): Promise<Specialist> {
  return request("/api/specialists", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteSpecialist(id: string): Promise<void> {
  return request(`/api/specialists?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getWalletBalance(): Promise<WalletBalance> {
  return request("/api/wallet/balance");
}

export async function getTaskHistory(): Promise<Task[]> {
  return request("/api/tasks");
}

export async function deleteTask(id: string): Promise<void> {
  return request(`/api/tasks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}
