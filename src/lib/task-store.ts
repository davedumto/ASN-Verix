import { Task } from "@/types/task";
import { prisma } from "@/lib/db";

/**
 * Write-through task storage: in-memory Map + Prisma persistence.
 * Reads from memory for speed; writes persist to PostgreSQL.
 * On startup, loads existing tasks from the database.
 */
class TaskStore {
    /* package-visible for HMR migration */
    tasks: Map<string, Task> = new Map();
    private loadPromise: Promise<void> | null = null;

    /** Load all tasks from the database into memory (runs once, waits if in-flight) */
    private ensureLoaded(): Promise<void> {
        if (this.loadPromise) return this.loadPromise;
        this.loadPromise = (async () => {
            try {
                const dbTasks = await prisma.task.findMany({
                    orderBy: { createdAt: "desc" },
                });
                for (const t of dbTasks) {
                    // Only load tasks not already in memory (in-flight tasks win)
                    if (!this.tasks.has(t.id)) {
                        const task: Task = {
                            id: t.id,
                            description: t.description,
                            status: t.status as Task["status"],
                            totalCost: t.totalCost ? Number(t.totalCost) : undefined,
                            spendCap: t.spendCap ? Number(t.spendCap) : undefined,
                            result: t.result as unknown as Task["result"],
                            events: (t.events as unknown as Task["events"]) ?? [],
                            createdAt: t.createdAt.toISOString(),
                            completedAt: t.completedAt?.toISOString(),
                        };
                        this.tasks.set(t.id, task);
                    }
                }
                console.log(`[TaskStore] Loaded ${dbTasks.length} task(s) from database`);
            } catch (error) {
                console.error("[TaskStore] Failed to load from database:", error);
            }
        })();
        return this.loadPromise;
    }

    async set(id: string, task: Task): Promise<void> {
        this.tasks.set(id, task);
        console.log(`[TaskStore] Stored task ${id}, total tasks: ${this.tasks.size}`);
        // Persist to database
        try {
            await prisma.task.upsert({
                where: { id },
                create: {
                    id,
                    description: task.description,
                    status: task.status,
                    totalCost: task.totalCost,
                    spendCap: task.spendCap,
                    result: task.result as object ?? undefined,
                    events: task.events as object[] ?? [],
                    createdAt: new Date(task.createdAt),
                    completedAt: task.completedAt ? new Date(task.completedAt) : null,
                },
                update: {
                    description: task.description,
                    status: task.status,
                    totalCost: task.totalCost,
                    spendCap: task.spendCap,
                    result: task.result as object ?? undefined,
                    events: task.events as object[] ?? [],
                    completedAt: task.completedAt ? new Date(task.completedAt) : null,
                },
            });
        } catch (error) {
            console.error(`[TaskStore] Failed to persist task ${id}:`, error);
        }
    }

    get(id: string): Task | undefined {
        const task = this.tasks.get(id);
        console.log(`[TaskStore] Retrieved task ${id}: ${task ? 'found' : 'not found'}`);
        return task;
    }

    async update(id: string, updates: Partial<Task>): Promise<void> {
        const existing = this.tasks.get(id);
        if (existing) {
            const updated = { ...existing, ...updates };
            this.tasks.set(id, updated);
            console.log(`[TaskStore] Updated task ${id}`);
            // Persist to database
            try {
                await prisma.task.update({
                    where: { id },
                    data: {
                        status: updated.status,
                        totalCost: updated.totalCost,
                        spendCap: updated.spendCap,
                        result: updated.result as object ?? undefined,
                        events: updated.events as object[] ?? [],
                        completedAt: updated.completedAt ? new Date(updated.completedAt) : null,
                    },
                });
            } catch (error) {
                console.error(`[TaskStore] Failed to persist update for task ${id}:`, error);
            }
        } else {
            console.warn(`[TaskStore] Cannot update non-existent task ${id}`);
        }
    }

    has(id: string): boolean {
        return this.tasks.has(id);
    }

    async delete(id: string): Promise<boolean> {
        const result = this.tasks.delete(id);
        console.log(`[TaskStore] Deleted task ${id}: ${result}`);
        if (result) {
            try {
                await prisma.task.delete({ where: { id } });
            } catch (error) {
                console.error(`[TaskStore] Failed to delete task ${id} from DB:`, error);
            }
        }
        return result;
    }

    clear(): void {
        this.tasks.clear();
        console.log(`[TaskStore] Cleared all tasks`);
    }

    size(): number {
        return this.tasks.size;
    }

    async getAll(): Promise<Task[]> {
        await this.ensureLoaded();
        return Array.from(this.tasks.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
}

// Use globalThis to survive Turbopack/HMR module re-evaluations in dev mode
const globalForTaskStore = globalThis as unknown as {
  __taskStore: TaskStore | undefined;
};

function getOrCreateStore(): TaskStore {
  const cached = globalForTaskStore.__taskStore;
  if (cached && typeof cached.getAll === "function") {
    return cached;
  }
  const fresh = new TaskStore();
  if (cached) {
    try {
      const oldTasks = (cached as unknown as { tasks: Map<string, Task> }).tasks;
      if (oldTasks instanceof Map) {
        oldTasks.forEach((task, id) => fresh.tasks.set(id, task));
        console.log(`[TaskStore] Migrated ${oldTasks.size} task(s) from stale instance`);
      }
    } catch {
      // ignore migration errors
    }
  }
  return fresh;
}

export const taskStore = getOrCreateStore();

if (process.env.NODE_ENV !== "production") {
  globalForTaskStore.__taskStore = taskStore;
}
