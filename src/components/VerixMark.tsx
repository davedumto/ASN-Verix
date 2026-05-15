interface VerixMarkProps {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
  showWordmark?: boolean;
}

const sizeClasses = {
  sm: "h-6 w-6 text-[9px]",
  md: "h-8 w-8 text-[11px]",
  lg: "h-10 w-10 text-xs",
};

export default function VerixMark({
  size = "md",
  inverted = false,
  showWordmark = true,
}: VerixMarkProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} grid place-items-center border font-mono font-semibold ${
          inverted
            ? "border-white/20 bg-white text-ink"
            : "border-ink bg-ink text-white"
        }`}
      >
        VX
      </div>
      {showWordmark && (
        <div className="leading-none">
          <div
            className={`text-sm font-semibold tracking-tight ${
              inverted ? "text-white" : "text-ink"
            }`}
          >
            Verix
          </div>
          <div
            className={`mt-1 text-[9px] uppercase tracking-[0.16em] ${
              inverted ? "text-white/35" : "text-ink-muted"
            }`}
          >
            Execution OS
          </div>
        </div>
      )}
    </div>
  );
}
