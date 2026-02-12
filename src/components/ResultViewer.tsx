"use client";

import { useState } from "react";
import { TaskResult } from "@/types/task";

const EXPLORER_URL = "https://staging-utter-unripe-menkar.explorer.staging-v3.skalenodes.com";

interface ResultViewerProps {
  result: TaskResult;
}

export default function ResultViewer({ result }: ResultViewerProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="bg-surface rounded-xl border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-ink">Results</h3>
        <span className="text-xs text-ink-muted font-mono">
          {result.totalTime.toFixed(1)}s &middot; ${result.totalCost.toFixed(2)}{" "}
          USDC
        </span>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 border-b border-border bg-surface-secondary">
        <p className="text-sm text-ink-secondary">{result.summary}</p>
      </div>

      {/* Deliverable Tabs */}
      {result.deliverables.length > 0 && (
        <>
          <div className="flex border-b border-border">
            {result.deliverables.map((d, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === i
                    ? "text-ink border-b-2 border-ink"
                    : "text-ink-muted hover:text-ink-secondary"
                }`}
              >
                {d.title}
              </button>
            ))}
          </div>

          <div className="p-6">
            <p className="text-xs text-ink-muted mb-2">
              By {result.deliverables[activeTab].specialistName}
            </p>
            <div className="prose prose-sm max-w-none text-ink-secondary whitespace-pre-wrap font-mono text-xs leading-relaxed bg-surface-secondary p-4 rounded-lg border border-border">
              {result.deliverables[activeTab].content}
            </div>
          </div>
        </>
      )}

      {/* Payment Audit Trail */}
      <div className="px-6 py-4 border-t border-border">
        <p className="text-xs text-ink-muted uppercase tracking-wide mb-3">
          Payment Audit Trail
        </p>
        <div className="space-y-3">
          {result.paymentBreakdown.map((p, i) => (
            <div key={i} className="bg-surface-secondary rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      p.status === "confirmed"
                        ? "bg-success"
                        : p.status === "failed"
                          ? "bg-error"
                          : "bg-warning"
                    }`}
                  />
                  <span className="text-sm font-medium text-ink">{p.specialist}</span>
                </div>
                <span className="font-mono font-semibold text-ink">
                  ${p.amount.toFixed(2)} USDC
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                {p.txHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Tx Hash</span>
                    <a
                      href={`${EXPLORER_URL}/tx/${p.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-secondary hover:text-ink underline"
                    >
                      {p.txHash.slice(0, 10)}...{p.txHash.slice(-8)}
                    </a>
                  </div>
                )}
                {p.blockNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Block</span>
                    <span className="text-ink-secondary">#{p.blockNumber}</span>
                  </div>
                )}
                {p.from && (
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">From (Coordinator)</span>
                    <span className="text-ink-secondary">{p.from.slice(0, 6)}...{p.from.slice(-4)}</span>
                  </div>
                )}
                {p.to && (
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">To ({p.specialist})</span>
                    <span className="text-ink-secondary">{p.to.slice(0, 6)}...{p.to.slice(-4)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Protocol</span>
                  <span className="text-ink-secondary">x402 on SKALE Calypso</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Gas Fee</span>
                  <span className="text-success">$0.00 (gasless)</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total Summary */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-sm text-ink-secondary">Total Paid</span>
          <span className="text-sm font-mono font-semibold text-ink">
            ${result.totalCost.toFixed(2)} USDC
          </span>
        </div>
      </div>
    </div>
  );
}
