"use client";

import Image from "next/image";
import { Task } from "@/types/task";

interface ChatSidebarProps {
    taskHistory: Task[];
    activeTaskId: string | null;
    onNewTask: () => void;
    onSelectTask: (taskId: string) => void;
    walletBalance: number;
    walletAddress: string;
    networkStatus: "connected" | "disconnected" | "loading";
    isOpen: boolean;
    onToggle: () => void;
    collapsed: boolean;
    onCollapseToggle: () => void;
}

const EXPLORER_URL =
    "https://staging-utter-unripe-menkar.explorer.staging-v3.skalenodes.com";

export default function ChatSidebar({
    taskHistory,
    activeTaskId,
    onNewTask,
    onSelectTask,
    walletBalance,
    walletAddress,
    networkStatus,
    isOpen,
    onToggle,
    collapsed,
    onCollapseToggle,
}: ChatSidebarProps) {
    const shortAddress =
        walletAddress && walletAddress.length > 10
            ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
            : walletAddress;

    const statusColor =
        networkStatus === "connected"
            ? "bg-emerald-400"
            : networkStatus === "loading"
                ? "bg-yellow-400 animate-pulse"
                : "bg-red-400";

    // -------- Collapsed sidebar (desktop only) --------
    if (collapsed) {
        return (
            <aside className="hidden lg:flex flex-col w-16 bg-ink shrink-0 items-center py-4 gap-3 border-r border-white/10">
                {/* Expand button */}
                <button
                    onClick={onCollapseToggle}
                    className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                    title="Expand sidebar"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>

                {/* New task */}
                <button
                    onClick={onNewTask}
                    className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title="New Task"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>

                <div className="flex-1" />

                {/* Wallet indicator */}
                <div className="flex flex-col items-center gap-1.5 pb-1">
                    <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                    <span className="text-[9px] font-mono text-white/50 leading-none">
                        ${walletBalance.toFixed(0)}
                    </span>
                </div>
            </aside>
        );
    }

    // -------- Full sidebar --------
    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-30 lg:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:relative z-40 inset-y-0 left-0 w-72 bg-ink flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    }`}
            >
                {/* Header */}
                <div className="px-4 pt-5 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                            <Image
                                src="/prism-logo.jpg"
                                alt="Prism"
                                width={28}
                                height={28}
                                className="object-cover w-full h-full"
                            />
                        </div>
                        <span className="text-sm font-bold text-white tracking-tight">
                            PRISM
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Collapse button (desktop) */}
                        <button
                            onClick={onCollapseToggle}
                            className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            title="Collapse sidebar"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                            </svg>
                        </button>
                        {/* Close button (mobile) */}
                        <button
                            onClick={onToggle}
                            className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* New Task Button */}
                <div className="px-3 pb-3">
                    <button
                        onClick={onNewTask}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/15 text-white/90 hover:bg-white/10 transition-all text-sm font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        New Task
                    </button>
                </div>

                {/* Task History */}
                <div className="flex-1 overflow-y-auto chat-scrollbar px-2 space-y-0.5">
                    {taskHistory.length === 0 ? (
                        <div className="px-3 py-8 text-center">
                            <p className="text-xs text-white/30">No tasks yet</p>
                            <p className="text-[10px] text-white/20 mt-1">
                                Submit a task to get started
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider px-3 pt-3 pb-1.5">
                                History
                            </p>
                            {taskHistory.map((task) => (
                                <button
                                    key={task.id}
                                    onClick={() => onSelectTask(task.id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all group ${activeTaskId === task.id
                                        ? "bg-white/15 text-white"
                                        : "text-white/60 hover:text-white/90 hover:bg-white/8"
                                        }`}
                                >
                                    <p className="truncate text-[13px] leading-snug">
                                        {task.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${task.status === "completed"
                                                ? "bg-emerald-400"
                                                : "bg-red-400"
                                                }`}
                                        />
                                        <span className="text-[10px] text-white/30">
                                            {new Date(task.createdAt).toLocaleDateString([], {
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </span>
                                        {task.totalCost !== undefined && (
                                            <span className="text-[10px] font-mono text-white/30">
                                                ${task.totalCost.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </>
                    )}
                </div>

                {/* Specialists */}
                <div className="border-t border-white/10 px-3 py-3">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider px-1 mb-2">
                        Specialists
                    </p>
                    <div className="space-y-1">
                        {[
                            { name: "CodeAuditor", cap: "Security", price: "$1.00", emoji: "🛡️" },
                            { name: "MarketAnalyst", cap: "Research", price: "$0.75", emoji: "📊" },
                            { name: "CreativeWriter", cap: "Writing", price: "$0.50", emoji: "✍️" },
                        ].map((s) => (
                            <div
                                key={s.name}
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-white/50 text-xs"
                            >
                                <span className="text-sm">{s.emoji}</span>
                                <span className="flex-1 truncate">{s.name}</span>
                                <span className="font-mono text-white/25 text-[10px]">
                                    {s.price}
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Wallet Card */}
                <div className="border-t border-white/10 px-3 py-3">
                    <div className="rounded-xl bg-white/[0.06] border border-white/10 overflow-hidden">
                        {/* Balance */}
                        <div className="px-4 pt-3.5 pb-3">
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                                Coordinator Wallet
                            </p>
                            <p className="text-2xl font-bold font-mono text-white leading-tight">
                                ${networkStatus === "loading"
                                    ? "..."
                                    : walletBalance.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                <span className="text-xs font-medium text-white/40 ml-1">USDC</span>
                            </p>
                        </div>

                        {/* Details */}
                        <div className="border-t border-white/8 px-4 py-2.5 space-y-2">
                            {/* Address */}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-white/30">Address</span>
                                <span className="text-[10px] font-mono text-white/50">
                                    {shortAddress || "Not connected"}
                                </span>
                            </div>
                            {/* Network */}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-white/30">Network</span>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                                    <span className="text-[10px] text-white/50">
                                        {networkStatus === "connected"
                                            ? "SKALE Calypso"
                                            : networkStatus === "loading"
                                                ? "Connecting..."
                                                : "Disconnected"}
                                    </span>
                                </div>
                            </div>
                            {/* Gas */}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-white/30">Gas Fees</span>
                                <span className="text-[10px] font-medium text-emerald-400">
                                    $0.00 (gasless)
                                </span>
                            </div>
                            {/* Protocol */}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-white/30">Protocol</span>
                                <span className="text-[10px] text-white/50">x402</span>
                            </div>
                        </div>

                        {/* Explorer link */}
                        {walletAddress && walletAddress !== "Not configured" && (
                            <div className="border-t border-white/8 px-4 py-2">
                                <a
                                    href={`${EXPLORER_URL}/address/${walletAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                                >
                                    View on Explorer
                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                    </svg>
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
