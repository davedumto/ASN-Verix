interface SpecialistCardProps {
  name: string;
  capability: string;
  price: string;
  reputation: number;
  status: "online" | "offline" | "busy";
}

const statusColors = {
  online: "bg-success",
  offline: "bg-ink-muted",
  busy: "bg-warning",
};

export default function SpecialistCard({
  name,
  capability,
  price,
  reputation,
  status,
}: SpecialistCardProps) {
  return (
    <div className="bg-surface rounded-xl border border-border p-6 hover:border-border-strong transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold text-ink">{name}</h4>
          <p className="text-sm text-ink-secondary mt-0.5">{capability}</p>
        </div>
        <span
          className={`w-2 h-2 rounded-full mt-1.5 ${statusColors[status]}`}
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className="text-sm font-mono font-semibold text-ink">
          {price}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-muted">Rep</span>
          <span className="text-sm font-semibold text-ink">
            {reputation}
            <span className="text-ink-muted font-normal">/100</span>
          </span>
        </div>
      </div>
    </div>
  );
}
