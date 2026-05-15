"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { SpecialistProfile, ProofPolicy, AgentVersion } from "@/types/specialist";
import { getSpecialistProfile } from "@/lib/api-client";
import { stellarAccountExplorerUrl } from "@/lib/stellar-config";

// ── Constants ──────────────────────────────────────────────────────────────────

const PROOF_POLICY_CONFIG: Record<
  ProofPolicy,
  { label: string; description: string; color: string; icon: React.ReactNode }
> = {
  "trace-only": {
    label: "Trace Only",
    description: "Execution logs are recorded locally. No cryptographic proof is generated.",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
  "receipt-proof": {
    label: "Receipt Proof",
    description: "A signed receipt is generated per task, providing a verifiable off-chain execution record.",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  "escrow-eligible": {
    label: "Escrow Eligible",
    description: "Trustless Work escrow integration — payment is held and released only upon verified completion.",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-2.054-.518-3.99-1.428-5.68" />
      </svg>
    ),
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl px-4 py-3.5 border ${highlight ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/[0.04] border-white/8"}`}>
      <div className={`text-xs mb-1 ${highlight ? "text-emerald-400/70" : "text-white/30"}`}>{label}</div>
      <div className={`text-2xl font-bold font-mono ${highlight ? "text-emerald-400" : "text-white"}`}>{value}</div>
      {sub && <div className="text-[10px] text-white/25 mt-0.5">{sub}</div>}
    </div>
  );
}

function VersionRow({ version, isCurrent }: { version: AgentVersion; isCurrent: boolean }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors ${isCurrent ? "bg-white/[0.06] border-white/15" : "bg-white/[0.02] border-white/[0.06]"}`}>
      <div className="shrink-0 mt-0.5">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${isCurrent ? "bg-white/15 text-white" : "bg-white/[0.06] text-white/30"}`}>
          v{version.version}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {isCurrent && (
            <span className="text-[9px] font-medium bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded">
              CURRENT
            </span>
          )}
          <span className="text-xs text-white/40">
            ${Number(version.priceUsdc).toFixed(2)} USDC · {version.proofPolicy}
          </span>
          <span className="text-[10px] text-white/20">
            {new Date(version.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {version.capabilities.map((cap) => (
            <span key={cap} className="text-[10px] text-white/35 bg-white/[0.04] px-1.5 py-0.5 rounded">
              {cap}
            </span>
          ))}
        </div>
        <div className="font-mono text-[9px] text-white/20 truncate" title={version.versionHash}>
          hash: {version.versionHash.slice(0, 24)}…
        </div>
      </div>
    </div>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export default function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [profile, setProfile] = useState<SpecialistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSpecialistProfile(id)
      .then(setProfile)
      .catch((e) => setError(e.message ?? "Failed to load agent"))
      .finally(() => setLoading(false));
  }, [id]);

  const isSystem = !profile?.ownerId;
  const policy = profile?.proofPolicy ?? "trace-only";
  const policyCfg = PROOF_POLICY_CONFIG[policy];

  const successRate = profile?.reputation.successRate ?? 100;
  const scoreColor =
    (profile?.reputation.score ?? 50) >= 90
      ? "text-emerald-400"
      : (profile?.reputation.score ?? 50) >= 70
      ? "text-blue-400"
      : "text-yellow-400";

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 sticky top-0 z-10 bg-ink/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
                <Image src="/prism-logo.jpg" alt="Prism" width={32} height={32} className="object-cover w-full h-full" />
              </div>
              <span className="text-sm font-bold tracking-tight group-hover:text-white/80 transition-colors">PRISM</span>
            </Link>
            <span className="text-white/20 text-sm">/</span>
            <Link href="/marketplace" className="text-sm text-white/60 hover:text-white/80 transition-colors">
              Marketplace
            </Link>
            {profile && (
              <>
                <span className="text-white/20 text-sm">/</span>
                <span className="text-sm text-white/60 truncate max-w-[140px]">{profile.name}</span>
              </>
            )}
          </div>
          <Link
            href="/marketplace"
            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Marketplace
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="h-24 rounded-2xl bg-white/[0.04] animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
            <div className="h-48 rounded-2xl bg-white/[0.04] animate-pulse" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-white/50 mb-1">Agent not found</p>
            <p className="text-white/25 text-xs mb-6">{error}</p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              ← Back to Marketplace
            </Link>
          </div>
        )}

        {/* Profile content */}
        {profile && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Hero card */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
              <div className="flex items-start gap-5">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-bold text-white/50 shrink-0">
                  {profile.name.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                    <h1 className="text-xl font-bold">{profile.name}</h1>
                    {isSystem && (
                      <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white/40 uppercase tracking-wide">
                        System Agent
                      </span>
                    )}
                    <span
                      className={`w-2 h-2 rounded-full ${profile.status === "online" ? "bg-emerald-400" : profile.status === "busy" ? "bg-yellow-400" : "bg-white/20"}`}
                      title={profile.status}
                    />
                    <span className="text-xs text-white/30 capitalize">{profile.status}</span>
                  </div>

                  <p className="text-sm text-white/50 leading-relaxed mb-4">{profile.description}</p>

                  {/* Proof policy banner */}
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${policyCfg.color}`}>
                    {policyCfg.icon}
                    <span>{policyCfg.label}</span>
                    <span className="text-xs font-normal opacity-70">— {policyCfg.description}</span>
                  </div>
                </div>

                {/* Price */}
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-bold font-mono">${profile.priceUsdc.toFixed(2)}</div>
                  <div className="text-xs text-white/30">USDC per task</div>
                  <div className="text-[10px] font-mono text-white/20 mt-1">v{profile.currentVersion}</div>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Reputation Score"
                value={profile.reputation.score}
                sub="out of 100"
                highlight={profile.reputation.score >= 90}
              />
              <StatCard
                label="Success Rate"
                value={`${successRate}%`}
                sub={`${profile.reputation.totalJobs} total jobs`}
              />
              <StatCard
                label="Verified Jobs"
                value={profile.reputation.verifiedJobs}
                sub="receipt-backed"
                highlight={profile.reputation.verifiedJobs > 0}
              />
              <StatCard
                label="Demo Jobs"
                value={profile.reputation.demoJobs}
                sub="unverified"
              />
            </div>

            {/* Two-column detail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Capabilities */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Capabilities</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs text-white/60"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Reputation breakdown */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Reputation Breakdown</h2>
                <div className="space-y-3">
                  {/* Score bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className={`font-medium ${scoreColor}`}>Score</span>
                      <span className={`font-mono ${scoreColor}`}>{profile.reputation.score}/100</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${profile.reputation.score >= 90 ? "bg-emerald-400" : profile.reputation.score >= 70 ? "bg-blue-400" : "bg-yellow-400"}`}
                        style={{ width: `${profile.reputation.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-white/50">Verified completions</span>
                      </div>
                      <span className="font-mono text-emerald-400">{profile.reputation.verifiedJobs}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-white/50">Demo completions</span>
                        <span className="text-[9px] text-white/25 bg-white/[0.04] px-1 rounded">unverified</span>
                      </div>
                      <span className="font-mono text-white/40">{profile.reputation.demoJobs}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        <span className="text-white/50">Success rate</span>
                      </div>
                      <span className="font-mono text-white/60">{successRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical details */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Technical Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-white/30 mb-1">AI Model</div>
                  <div className="font-mono text-white/70">
                    {profile.aiModel === "claude" ? "Claude (Anthropic)" : "GPT-4o (OpenAI)"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/30 mb-1">Current Version</div>
                  <div className="font-mono text-white/70">v{profile.currentVersion}</div>
                </div>
                <div>
                  <div className="text-xs text-white/30 mb-1">Endpoint</div>
                  <div className="font-mono text-white/40 text-xs truncate">{profile.endpoint}</div>
                </div>
                {profile.walletAddress && profile.walletAddress.startsWith("G") && (
                  <div>
                    <div className="text-xs text-white/30 mb-1">Payment Wallet</div>
                    <a
                      href={stellarAccountExplorerUrl(profile.walletAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1.5 group"
                    >
                      <span>{profile.walletAddress.slice(0, 12)}…{profile.walletAddress.slice(-6)}</span>
                      <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Version history */}
            {profile.versions.length > 0 && (
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
                  Version History
                  <span className="ml-2 text-white/20 font-normal normal-case">({profile.versions.length})</span>
                </h2>
                <div className="space-y-2">
                  {profile.versions.map((v) => (
                    <VersionRow
                      key={v.id}
                      version={v}
                      isCurrent={v.version === profile.currentVersion}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-white/20 mt-3 leading-relaxed">
                  Each version is an immutable snapshot. Tasks reference the version active at invocation time so execution receipts can cryptographically prove the exact agent metadata used.
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-ink text-sm font-medium hover:bg-white/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                Submit a Task
              </Link>
              <Link
                href="/marketplace"
                className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
              >
                Browse Marketplace
              </Link>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
