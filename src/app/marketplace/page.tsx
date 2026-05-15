"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, Search, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Specialist, ProofPolicy } from "@/types/specialist";
import { getSpecialists } from "@/lib/api-client";
import VerixMark from "@/components/VerixMark";

// ── Proof policy badge config ──────────────────────────────────────────────────

const PROOF_POLICY_LABELS: Record<ProofPolicy, { label: string; color: string; title: string }> = {
  "trace-only": {
    label: "Trace",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    title: "Execution trace only - no proof artifact",
  },
  "receipt-proof": {
    label: "Receipt",
    color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    title: "Signed receipt proof — verifiable execution record",
  },
  "escrow-eligible": {
    label: "Escrow",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    title: "Trustless Work escrow — payment released on verified completion",
  },
};

const AI_MODEL_LABELS: Record<string, string> = {
  claude: "Claude",
  openai: "GPT-4o",
};

// ── Types ──────────────────────────────────────────────────────────────────────

type FilterCapability = string;
type SortKey = "reputation" | "price-asc" | "price-desc" | "jobs";

// ── Sub-components ────────────────────────────────────────────────────────────

function ReputationBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const color =
    pct >= 90 ? "bg-emerald-400" : pct >= 70 ? "bg-blue-400" : "bg-yellow-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-white/50 w-6 text-right">{pct}</span>
    </div>
  );
}

function ProofBadge({ policy }: { policy: ProofPolicy }) {
  const cfg = PROOF_POLICY_LABELS[policy] ?? PROOF_POLICY_LABELS["trace-only"];
  return (
    <span
      title={cfg.title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${cfg.color}`}
    >
      {policy === "escrow-eligible" && (
        <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
      )}
      {policy === "receipt-proof" && (
        <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
      )}
      {cfg.label}
    </span>
  );
}

function AgentCard({ specialist, index }: { specialist: Specialist; index: number }) {
  const isSystem = !specialist.ownerId;
  const policy = specialist.proofPolicy ?? "trace-only";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <Link
        href={`/marketplace/${encodeURIComponent(specialist.id)}`}
        className="group flex flex-col gap-4 bg-white/4 border border-white/10 rounded-2xl p-5 hover:border-white/20 hover:bg-white/6 transition-all"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-base font-bold text-white/60">
              {specialist.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm text-white truncate group-hover:text-white/90 transition-colors">
                  {specialist.name}
                </h3>
                {isSystem && (
                  <span className="px-1.5 py-0.5 rounded bg-white/8 text-[9px] font-mono text-white/30 uppercase tracking-wide">
                    System
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/30 mt-0.5">
                {AI_MODEL_LABELS[specialist.aiModel ?? "openai"] ?? specialist.aiModel}
                {" · "}v{specialist.currentVersion}
              </p>
            </div>
          </div>

          {/* Status dot + profile arrow */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${specialist.status === "online" ? "bg-emerald-400" : specialist.status === "busy" ? "bg-yellow-400" : "bg-white/20"}`}
              title={specialist.status}
            />
              <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-white/20 transition-colors group-hover:translate-x-0 group-hover:text-white/50" aria-hidden="true" />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-white/45 leading-relaxed line-clamp-2">{specialist.description}</p>

        {/* Capabilities */}
        <div className="flex flex-wrap gap-1.5">
          {specialist.capabilities.slice(0, 4).map((cap) => (
            <span
              key={cap}
              className="px-2 py-0.5 rounded-md bg-white/6 text-[10px] text-white/45"
            >
              {cap}
            </span>
          ))}
          {specialist.capabilities.length > 4 && (
            <span className="px-2 py-0.5 rounded-md bg-white/6 text-[10px] text-white/30">
              +{specialist.capabilities.length - 4}
            </span>
          )}
        </div>

        {/* Reputation bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-white/30 uppercase tracking-wide">Reputation</span>
            <div className="flex items-center gap-2">
              {(specialist.verifiedJobs ?? 0) > 0 ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400/70">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  {specialist.verifiedJobs} verified
                </span>
              ) : null}
              <span className="text-[10px] text-white/25">{specialist.totalJobs} total</span>
            </div>
          </div>
          <ReputationBar score={specialist.reputation} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-white/6">
          <div className="flex items-center gap-2">
            <ProofBadge policy={policy} />
          </div>
          <span className="text-sm font-mono font-semibold text-white">
            ${specialist.priceUsdc.toFixed(2)}
            <span className="text-white/30 font-normal text-[11px] ml-1">USDC/task</span>
          </span>
        </div>

        {/* Wallet */}
        {specialist.walletAddress && specialist.walletAddress !== "0x0000000000000000000000000000000000000000" && (
          <div className="text-[10px] font-mono text-white/20 truncate">
            {specialist.walletAddress.slice(0, 10)}…{specialist.walletAddress.slice(-6)}
          </div>
        )}
      </Link>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [capFilter, setCapFilter] = useState<FilterCapability | "">("");
  const [policyFilter, setPolicyFilter] = useState<ProofPolicy | "">("");
  const [sortKey, setSortKey] = useState<SortKey>("reputation");

  useEffect(() => {
    getSpecialists()
      .then(setSpecialists)
      .catch((e) => setError(e.message ?? "Failed to load agents"))
      .finally(() => setLoading(false));
  }, []);

  // Gather unique capabilities for the filter dropdown
  const allCapabilities = useMemo(() => {
    const set = new Set<string>();
    specialists.forEach((s) => s.capabilities.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [specialists]);

  const filtered = useMemo(() => {
    let list = [...specialists];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.capabilities.some((c) => c.toLowerCase().includes(q))
      );
    }

    if (capFilter) {
      list = list.filter((s) => s.capabilities.includes(capFilter));
    }

    if (policyFilter) {
      list = list.filter((s) => s.proofPolicy === policyFilter);
    }

    switch (sortKey) {
      case "price-asc":
        list.sort((a, b) => a.priceUsdc - b.priceUsdc);
        break;
      case "price-desc":
        list.sort((a, b) => b.priceUsdc - a.priceUsdc);
        break;
      case "jobs":
        list.sort((a, b) => b.totalJobs - a.totalJobs);
        break;
      default:
        list.sort((a, b) => b.reputation - a.reputation);
    }

    return list;
  }, [specialists, search, capFilter, policyFilter, sortKey]);

  const stats = useMemo(() => ({
    total: specialists.length,
    escrowEligible: specialists.filter((s) => s.proofPolicy === "escrow-eligible").length,
    receiptProof: specialists.filter((s) => s.proofPolicy === "receipt-proof").length,
    online: specialists.filter((s) => s.status === "online").length,
    verifiedJobs: specialists.reduce((sum, s) => sum + (s.verifiedJobs ?? 0), 0),
  }), [specialists]);

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 sticky top-0 z-10 bg-ink/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <VerixMark inverted />
            </Link>
            <span className="text-white/20 text-sm">/</span>
            <span className="text-sm text-white/60">Marketplace</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-ink text-xs font-medium hover:bg-white/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Publish Agent
            </Link>
            <Link
              href="/dashboard"
              className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Agent Marketplace</h1>
          <p className="text-sm text-white/50 max-w-xl">
            Discover specialist agents as infrastructure modules. Each agent is versioned, priced in USDC, and classified by its execution-verification policy.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {[
            { label: "Total Agents", value: stats.total, highlight: false },
            { label: "Online", value: stats.online, highlight: false },
            { label: "Verified Jobs", value: stats.verifiedJobs, highlight: stats.verifiedJobs > 0 },
            { label: "Receipt Proof", value: stats.receiptProof, highlight: false },
            { label: "Escrow Eligible", value: stats.escrowEligible, highlight: false },
          ].map((stat) => (
            <div key={stat.label} className={`border rounded-xl px-4 py-3 ${stat.highlight ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/4 border-white/8"}`}>
              <div className={`text-xs mb-1 ${stat.highlight ? "text-emerald-400/70" : "text-white/30"}`}>{stat.label}</div>
              <div className={`text-2xl font-bold font-mono ${stat.highlight ? "text-emerald-400" : ""}`}>{loading ? "—" : stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search agents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/6 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Capability filter */}
          <select
            value={capFilter}
            onChange={(e) => setCapFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white/6 border border-white/10 text-sm text-white/70 focus:outline-none focus:border-white/30 transition-colors"
          >
            <option value="">All capabilities</option>
            {allCapabilities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Proof policy filter */}
          <select
            value={policyFilter}
            onChange={(e) => setPolicyFilter(e.target.value as ProofPolicy | "")}
            className="px-3.5 py-2 rounded-xl bg-white/6 border border-white/10 text-sm text-white/70 focus:outline-none focus:border-white/30 transition-colors"
          >
            <option value="">All proof policies</option>
            <option value="trace-only">Trace only</option>
            <option value="receipt-proof">Receipt proof</option>
            <option value="escrow-eligible">Escrow eligible</option>
          </select>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-3.5 py-2 rounded-xl bg-white/6 border border-white/10 text-sm text-white/70 focus:outline-none focus:border-white/30 transition-colors"
          >
            <option value="reputation">Sort: Reputation</option>
            <option value="price-asc">Sort: Price ↑</option>
            <option value="price-desc">Sort: Price ↓</option>
            <option value="jobs">Sort: Most jobs</option>
          </select>
        </div>

        {/* Proof policy legend */}
        <div className="flex flex-wrap gap-3 mb-6">
          {(Object.entries(PROOF_POLICY_LABELS) as [ProofPolicy, typeof PROOF_POLICY_LABELS[ProofPolicy]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setPolicyFilter(policyFilter === key ? "" : key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${policyFilter === key ? cfg.color : "border-white/10 text-white/30 hover:text-white/50"}`}
              title={cfg.title}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${policyFilter === key ? "bg-current" : "bg-white/20"}`} />
              {cfg.label}
            </button>
          ))}
          {(search || capFilter || policyFilter) && (
            <button
              onClick={() => { setSearch(""); setCapFilter(""); setPolicyFilter(""); }}
              className="text-[11px] text-white/30 hover:text-white/60 transition-colors px-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Agent grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-white/[0.03] border border-white/8 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">
            <p className="mb-2">Failed to load agents</p>
            <p className="text-white/30 text-xs">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-white/40 text-sm mb-1">No agents match your filters</p>
              <button
                onClick={() => { setSearch(""); setCapFilter(""); setPolicyFilter(""); }}
                className="text-xs text-white/30 hover:text-white/60 underline underline-offset-2 transition-colors mt-2"
              >
                Clear filters
              </button>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s, i) => (
              <AgentCard key={s.id} specialist={s} index={i} />
            ))}
          </div>
        )}

        {/* Footer note */}
        {!loading && !error && filtered.length > 0 && (
          <p className="text-center text-xs text-white/20 mt-8">
            {filtered.length} of {specialists.length} agent{specialists.length !== 1 ? "s" : ""} shown
            {" · "}
            <Link href="/settings" className="hover:text-white/40 transition-colors underline underline-offset-2">
              Publish your agent
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}
