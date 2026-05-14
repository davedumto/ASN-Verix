"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Specialist, ProofPolicy } from "@/types/specialist";
import { getSpecialists, registerSpecialist, deleteSpecialist, getOrInitSession, getCurrentSession } from "@/lib/api-client";

const PROOF_POLICY_OPTIONS: { value: ProofPolicy; label: string; description: string }[] = [
  {
    value: "trace-only",
    label: "Trace only",
    description: "Execution log stored locally — no on-chain proof",
  },
  {
    value: "receipt-proof",
    label: "Receipt proof",
    description: "Signed receipt generated per task — verifiable off-chain",
  },
  {
    value: "escrow-eligible",
    label: "Escrow eligible",
    description: "Trustless Work integration — payment released on verified completion",
  },
];

export default function SettingsPage() {
    const [specialists, setSpecialists] = useState<Specialist[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(getCurrentSession);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [capabilities, setCapabilities] = useState("");
    const [priceUsdc, setPriceUsdc] = useState("0.50");
    const [walletAddress, setWalletAddress] = useState("");
    const [aiModel, setAiModel] = useState<"claude" | "openai">("openai");
    const [proofPolicy, setProofPolicy] = useState<ProofPolicy>("trace-only");
    const [apiKey, setApiKey] = useState("");

    const canDeleteSpecialist = (s: Specialist) =>
        !s.ownerId || s.ownerId === sessionId;

    useEffect(() => {
        fetchSpecialists();
        getOrInitSession().then(setSessionId).catch(() => { });
    }, []);

    async function fetchSpecialists() {
        try {
            const data = await getSpecialists();
            setSpecialists(data);
        } catch {
            console.error("Failed to fetch specialists");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);

        try {
            await registerSpecialist({
                name,
                description,
                capabilities,
                priceUsdc: parseFloat(priceUsdc),
                walletAddress,
                aiModel,
                proofPolicy,
                apiKey: apiKey || undefined,
            });

            setMessage({ text: `${name} published to marketplace!`, type: "success" });
            setName("");
            setDescription("");
            setCapabilities("");
            setPriceUsdc("0.50");
            setWalletAddress("");
            setAiModel("openai");
            setProofPolicy("trace-only");
            setApiKey("");
            setShowForm(false);
            fetchSpecialists();
        } catch {
            setMessage({ text: "Failed to publish agent", type: "error" });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string, specialistName: string) {
        if (!confirm(`Remove ${specialistName}?`)) return;

        try {
            await deleteSpecialist(id);
            setMessage({ text: `${specialistName} removed`, type: "success" });
            fetchSpecialists();
        } catch {
            setMessage({ text: "Failed to remove specialist", type: "error" });
        }
    }

    const proofPolicyLabels: Record<ProofPolicy, string> = {
        "trace-only": "Trace",
        "receipt-proof": "Receipt",
        "escrow-eligible": "Escrow",
    };

    const proofPolicyColors: Record<ProofPolicy, string> = {
        "trace-only": "bg-blue-500/10 text-blue-400",
        "receipt-proof": "bg-violet-500/10 text-violet-400",
        "escrow-eligible": "bg-emerald-500/10 text-emerald-400",
    };

    return (
        <div className="min-h-screen bg-ink text-white">
            {/* Header */}
            <header className="border-b border-white/10 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
                                <Image src="/prism-logo.jpg" alt="Prism" width={32} height={32} className="object-cover w-full h-full" />
                            </div>
                            <span className="text-sm font-bold tracking-tight group-hover:text-white/80 transition-colors">PRISM</span>
                        </Link>
                        <span className="text-white/20 text-sm">/</span>
                        <span className="text-sm text-white/60">Agent Settings</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/marketplace"
                            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                            </svg>
                            Marketplace
                        </Link>
                        <Link
                            href="/dashboard"
                            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Title & Description */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">Specialist Agents</h1>
                    <p className="text-sm text-white/50">
                        Publish AI agents to the marketplace. Each published agent is versioned and assigned a proof policy — the coordinator uses this to route tasks and generate verifiable execution records.
                    </p>
                </div>

                {/* Status Message */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className={`mb-6 px-4 py-3 rounded-xl text-sm border ${message.type === "success"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-red-500/10 border-red-500/30 text-red-400"
                                }`}
                        >
                            {message.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Agent List */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                            Registered Agents ({specialists.length})
                        </h2>
                        <div className="flex items-center gap-2">
                            <Link
                                href="/marketplace"
                                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
                            >
                                View Marketplace
                            </Link>
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-white text-ink hover:bg-white/90 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Publish Agent
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-white/30 text-sm">Loading agents...</div>
                    ) : (
                        <div className="grid gap-3">
                            {specialists.map((s, i) => (
                                <motion.div
                                    key={s.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-white/[0.04] border border-white/10 rounded-xl p-4 group hover:border-white/20 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                                <h3 className="font-semibold text-sm">{s.name}</h3>
                                                <span className="px-2 py-0.5 rounded-md bg-white/8 text-[10px] font-mono text-white/40">
                                                    {s.aiModel || "openai"}
                                                </span>
                                                <span className="text-xs font-mono text-white/40">
                                                    ${s.priceUsdc.toFixed(2)}/task
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${proofPolicyColors[s.proofPolicy ?? "trace-only"]}`}>
                                                    {proofPolicyLabels[s.proofPolicy ?? "trace-only"]}
                                                </span>
                                                <span className="text-[10px] font-mono text-white/25">
                                                    v{s.currentVersion ?? 1}
                                                </span>
                                                {s.apiKeyMasked && (
                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-[10px] font-mono text-emerald-400/70">
                                                        🔑 {s.apiKeyMasked}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-white/40 mb-2 pl-[18px]">{s.description}</p>
                                            <div className="flex flex-wrap gap-1.5 pl-[18px]">
                                                {s.capabilities.map((c) => (
                                                    <span
                                                        key={c}
                                                        className="px-2 py-0.5 rounded-md bg-white/8 text-[10px] text-white/50"
                                                    >
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {canDeleteSpecialist(s) && (
                                            <button
                                                onClick={() => handleDelete(s.id, s.name)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10"
                                                title="Remove agent"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Registration Form */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: "hidden" }}
                        >
                            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 mb-8">
                                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-5">
                                    Publish New Agent
                                </h2>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Name */}
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">Agent Name *</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="e.g. DataScientist"
                                                required
                                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                                            />
                                        </div>

                                        {/* Price */}
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">Price (USDC per task) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={priceUsdc}
                                                onChange={(e) => setPriceUsdc(e.target.value)}
                                                required
                                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-xs text-white/40 mb-1.5">Description *</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="What this agent specializes in — the AI coordinator will use this to route tasks"
                                            required
                                            rows={2}
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
                                        />
                                    </div>

                                    {/* Capabilities */}
                                    <div>
                                        <label className="block text-xs text-white/40 mb-1.5">Capabilities (comma-separated)</label>
                                        <input
                                            type="text"
                                            value={capabilities}
                                            onChange={(e) => setCapabilities(e.target.value)}
                                            placeholder="e.g. data-analysis, machine-learning, statistics"
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                                        />
                                    </div>

                                    {/* Proof Policy */}
                                    <div>
                                        <label className="block text-xs text-white/40 mb-2">Proof Policy</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {PROOF_POLICY_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setProofPolicy(opt.value)}
                                                    className={`px-3.5 py-2.5 rounded-xl text-left border transition-colors ${proofPolicy === opt.value
                                                        ? "bg-white/15 border-white/30"
                                                        : "bg-white/[0.04] border-white/10 hover:border-white/20"
                                                        }`}
                                                >
                                                    <div className="text-xs font-medium text-white mb-0.5">{opt.label}</div>
                                                    <div className="text-[10px] text-white/35 leading-snug">{opt.description}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Wallet */}
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">Wallet Address</label>
                                            <input
                                                type="text"
                                                value={walletAddress}
                                                onChange={(e) => setWalletAddress(e.target.value)}
                                                placeholder="0x..."
                                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                                            />
                                        </div>

                                        {/* AI Model */}
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">AI Model</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setAiModel("openai")}
                                                    className={`flex-1 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${aiModel === "openai"
                                                        ? "bg-white/15 border-white/30 text-white"
                                                        : "bg-white/[0.04] border-white/10 text-white/40 hover:text-white/60"
                                                        }`}
                                                >
                                                    OpenAI (GPT-4o)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAiModel("claude")}
                                                    className={`flex-1 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${aiModel === "claude"
                                                        ? "bg-white/15 border-white/30 text-white"
                                                        : "bg-white/[0.04] border-white/10 text-white/40 hover:text-white/60"
                                                        }`}
                                                >
                                                    Claude 3.5
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* API Key */}
                                    <div>
                                        <label className="block text-xs text-white/40 mb-1.5">
                                            API Key
                                            <span className="text-white/20 ml-1">(encrypted at rest)</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="sk-... or your provider API key"
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowForm(false)}
                                            className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-white text-ink hover:bg-white/90 transition-colors disabled:opacity-50"
                                        >
                                            {submitting ? "Publishing..." : "Publish Agent"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Info Card */}
                <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">How AI Routing Works</h3>
                    <div className="space-y-2.5 text-xs text-white/40 leading-relaxed">
                        <p>
                            <span className="text-white/60 font-medium">1.</span> When you submit a task, the coordinator sends your prompt to an AI router along with all registered agent descriptions.
                        </p>
                        <p>
                            <span className="text-white/60 font-medium">2.</span> The AI analyzes your intent and selects the best specialists based on capabilities and proof policy.
                        </p>
                        <p>
                            <span className="text-white/60 font-medium">3.</span> Each selected specialist executes their part. An immutable version snapshot is recorded at invocation time.
                        </p>
                        <p>
                            <span className="text-white/60 font-medium">4.</span> Payments are made automatically on-chain via the x402 protocol. Escrow-eligible agents hold payment until completion is verified.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
