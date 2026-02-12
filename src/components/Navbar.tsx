"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

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
        <div className="flex items-center gap-2.5">
          <Image
            src="/prism-logo.jpg"
            alt="Prism"
            width={50}
            height={50}
            className="object-contain w-[6em]"
          />
          <span className="text-2xl font-bold text-ink tracking-tight">
            PRISM
          </span>
        </div>

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
            <svg
              className={`w-3.5 h-3.5 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Dropdown card */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-xl border border-border shadow-lg z-50 overflow-hidden">
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
                        ? "SKALE Calypso"
                        : networkStatus === "loading"
                        ? "Connecting..."
                        : "Disconnected"}
                    </span>
                  </div>
                </div>

                {/* Gas */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Gas Fees</span>
                  <span className="text-xs font-medium text-green-600">$0.00 (gasless)</span>
                </div>

                {/* Protocol */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Protocol</span>
                  <span className="text-xs text-ink-secondary">x402</span>
                </div>
              </div>

              {/* Explorer link */}
              {walletAddress && walletAddress !== "Not configured" && (
                <div className="border-t border-border px-5 py-3">
                  <a
                    href={`https://staging-utter-unripe-menkar.explorer.staging-v3.skalenodes.com/address/${walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    View on Explorer
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
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
