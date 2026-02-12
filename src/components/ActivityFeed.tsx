"use client";

export interface Activity {
  id: string;
  type: "system" | "payment" | "specialist" | "coordinator";
  message: string;
  status: "info" | "success" | "error" | "pending";
  timestamp: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const typeLabels: Record<Activity["type"], string> = {
  system: "System",
  payment: "Payment",
  specialist: "Specialist",
  coordinator: "Coordinator",
};

const statusColors: Record<Activity["status"], string> = {
  info: "bg-surface-tertiary text-ink-secondary",
  success: "bg-success/10 text-success",
  error: "bg-error/10 text-error",
  pending: "bg-warning/10 text-warning",
};

const dotColors: Record<Activity["status"], string> = {
  info: "bg-ink-muted",
  success: "bg-success",
  error: "bg-error",
  pending: "bg-warning",
};

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="bg-surface rounded-xl border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-ink">Activity</h3>
      </div>

      <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="px-6 py-12 text-center text-ink-muted text-sm">
            Activity will appear here once a task is submitted.
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="px-6 py-3.5 flex items-start gap-3"
            >
              <div
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColors[activity.status]}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink">{activity.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${statusColors[activity.status]}`}
                  >
                    {typeLabels[activity.type]}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
