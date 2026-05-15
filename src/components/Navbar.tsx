"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { stellarAccountExplorerUrl } from "@/lib/stellar-config";
import VerixMark from "@/components/VerixMark";

interface NavbarProps {
  walletBalance: number;
  walletAddress: string;
  networkStatus: "connected" | "disconnected" | "loading";
}

export default function Navbar({
  walletBalance,
  walletAddress,
  networkStatus,
}: NavbarProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shortAddress =
    walletAddress && walletAddress.length > 10
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : walletAddress;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const statusColor =
    networkStatus === "connected"
      ? "bg-green-500"
      : networkStatus === "loading"
      ? "bg-yellow-500 animate-pulse"
      : "bg-red-400";

  return (
    <nav className="bg-surface border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <VerixMark />

        {/* Wallet trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl border border-border hover:border-ink/20 bg-surface-secondary hover:bg-surface transition-all cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
            <span className="text-sm font-mono font-semibold text-ink">
              {networkStatus === "loading"
                ? "..."
                : `$${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {/* Dropdown card */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-md border border-border z-50 overflow-hidden">
              {/* Balance header */}
              <div className="px-5 pt-5 pb-4">
                <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">
                  Coordinator Wallet
                </p>
                <p className="text-3xl font-bold font-mono text-ink leading-tight">
                  ${networkStatus === "loading"
                    ? "..."
                    : walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-base font-medium text-ink-muted ml-1.5">USDC</span>
                </p>
              </div>

              {/* Details rows */}
              <div className="border-t border-border px-5 py-3 space-y-3">
                {/* Address */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Address</span>
                  <span className="text-xs font-mono text-ink-secondary">
                    {shortAddress || "Not connected"}
                  </span>
                </div>

                {/* Network */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Network</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                    <span className="text-xs text-ink-secondary">
                      {networkStatus === "connected"
                        ? "Stellar Testnet"
                        : networkStatus === "loading"
                        ? "Connecting..."
                        : "Disconnected"}
                    </span>
                  </div>
                </div>

                {/* Gas */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Gas Fees</span>
                  <span className="text-xs font-medium text-green-600">Low-fee Soroban</span>
                </div>

                {/* Protocol */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Protocol</span>
                  <span className="text-xs text-ink-secondary">Trustless Work</span>
                </div>
              </div>

              {/* Explorer link */}
              {walletAddress && walletAddress !== "Not configured" && (
                <div className="border-t border-border px-5 py-3">
                  <a
                    href={stellarAccountExplorerUrl(walletAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    View on Explorer
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
