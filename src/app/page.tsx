import Link from "next/link";
import { ArrowRight, Braces, GitBranch, ReceiptText, ShieldCheck } from "lucide-react";
import VerixMark from "@/components/VerixMark";

const systemRows = [
  ["Trace commitment", "Hash-chained execution events", "local"],
  ["Receipt integrity", "Canonical receipt payloads", "active"],
  ["Proof mode", "Workflow verifier adapter", "local"],
  ["Escrow mode", "Trustless Work coordination", "config"],
];

const primitives = [
  { label: "Agent registry", icon: Braces },
  { label: "Execution DAG", icon: GitBranch },
  { label: "Trace explorer", icon: GitBranch },
  { label: "Proof receipt", icon: ReceiptText },
  { label: "Escrow milestones", icon: ShieldCheck },
  { label: "Version hashes", icon: Braces },
];

export default function Home() {
  return (
    <main className="min-h-screen verix-shell">
      <header className="border-b border-border bg-surface/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <VerixMark />
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/marketplace"
              className="verix-control px-3 py-2 text-ink-secondary hover:text-ink"
            >
              Marketplace
            </Link>
            <Link
              href="/dashboard"
              className="bg-ink px-3 py-2 text-white transition-colors hover:bg-accent-hover"
            >
              Open console
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl grid-cols-1 gap-8 px-6 py-12 lg:grid-cols-[1fr_440px] lg:items-center">
        <div>
          <p className="verix-label mb-5">Verifiable autonomous work infrastructure</p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-ink">
            A cryptographic execution OS for multi-agent work.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-ink-secondary">
            Verix coordinates specialist agents, records structured execution
            traces, builds canonical receipts, and connects proof verification
            to escrow-aware settlement workflows.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {primitives.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary"
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-sm font-medium text-white transition-transform active:scale-[0.99]"
            >
              Start execution
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/receipts/demo_verix_golden_path"
              className="verix-control px-4 py-2.5 text-sm font-medium text-ink"
            >
              Inspect receipt
            </Link>
          </div>
        </div>

        <div className="verix-panel overflow-hidden">
          <div className="border-b border-border bg-surface-secondary px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="verix-label">Runtime state</p>
              <span className="verix-status verix-status-warning">demo aware</span>
            </div>
          </div>

          <div className="divide-y divide-border">
            {systemRows.map(([label, value, status]) => (
              <div key={label} className="grid grid-cols-[150px_1fr_72px] gap-3 px-4 py-3 text-sm">
                <span className="text-ink-muted">{label}</span>
                <span className="text-ink">{value}</span>
                <span className="verix-mono text-right text-[11px] uppercase text-ink-muted">
                  {status}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-border bg-[#111113] p-4 text-white">
            <p className="verix-label text-white/45">Execution packet</p>
            <pre className="verix-mono mt-3 overflow-x-auto text-[11px] leading-5 text-white/70">
{`{
  "task": "autonomous_workflow",
  "agents": ["CodeAuditor", "MarketAnalyst"],
  "commitments": ["traceRoot", "receiptHash"],
  "settlement": "trustless_work_adapter"
}`}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}
