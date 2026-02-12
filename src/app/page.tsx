"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

// Shared animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const, delay },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const, delay },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-ink">
      {/* Nav — white bar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 bg-surface border-b border-border"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
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
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium bg-ink text-surface rounded-lg hover:bg-ink/90 transition-colors"
          >
            Launch App
          </Link>
        </div>
      </motion.nav>

      {/* Hero — dark, dramatic */}
      <section className="relative flex-1 flex items-center overflow-hidden">
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — copy */}
            <div>
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.1}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-surface/10 mb-8"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium text-surface/60">
                  Live on SKALE Calypso — Zero Gas
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.2}
                className="text-5xl sm:text-6xl lg:text-7xl font-bold text-surface tracking-tight leading-[1.05] mb-6"
              >
                Agents that
                <br />
                think, work,
                <br />
                <span className="text-ink-muted">&amp; pay.</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.35}
                className="text-lg text-surface/50 mb-10 max-w-md leading-relaxed"
              >
                Submit a complex task. Watch autonomous AI specialists decompose,
                execute, and settle payments on-chain — all in real time.
              </motion.p>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.5}
                className="flex items-center gap-4"
              >
                <Link
                  href="/dashboard"
                  className="group px-7 py-3.5 text-sm font-semibold bg-surface text-ink rounded-xl hover:bg-surface/90 transition-all"
                >
                  Try a live task
                  <span className="inline-block ml-2 group-hover:translate-x-0.5 transition-transform">
                    &rarr;
                  </span>
                </Link>
                <a
                  href="https://github.com/davedumto/agent-specialization-network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-7 py-3.5 text-sm font-medium text-surface/60 border border-surface/10 rounded-xl hover:border-surface/25 hover:text-surface/80 transition-colors"
                >
                  Source code
                </a>
              </motion.div>
            </div>

            {/* Right — visual task flow */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
              className="hidden lg:block"
            >
              <div className="relative">
                {/* Flow visualization */}
                <div className="space-y-4">
                  {/* Task input */}
                  <motion.div
                    variants={scaleIn}
                    initial="hidden"
                    animate="visible"
                    custom={0.4}
                    className="bg-surface/[0.05] backdrop-blur border border-surface/10 rounded-2xl p-5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-surface/10 flex items-center justify-center">
                        <span className="text-surface/60 text-sm">&#9654;</span>
                      </div>
                      <span className="text-xs font-medium text-surface/40 uppercase tracking-wider">
                        Task Input
                      </span>
                    </div>
                    <p className="text-sm text-surface/70 font-mono leading-relaxed">
                      {'"'}Analyze the security of this smart contract, research
                      comparable protocols, and write an investment memo{'"'}
                    </p>
                  </motion.div>

                  {/* Connector */}
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.3, delay: 0.6 }}
                    className="flex justify-center origin-top"
                  >
                    <div className="w-px h-6 bg-surface/10" />
                  </motion.div>

                  {/* Decomposition */}
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-3 gap-3"
                  >
                    {[
                      { name: "CodeAuditor", tag: "Security", cost: "$1.00" },
                      { name: "MarketAnalyst", tag: "Research", cost: "$0.75" },
                      { name: "CreativeWriter", tag: "Writing", cost: "$0.50" },
                    ].map((agent, i) => (
                      <motion.div
                        key={agent.name}
                        variants={scaleIn}
                        custom={0.7 + i * 0.1}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ y: -2, borderColor: "rgba(255,255,255,0.2)" }}
                        className="bg-surface/[0.05] border border-surface/10 rounded-xl p-4 group transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="w-2 h-2 rounded-full bg-success" />
                          <span className="text-[10px] font-mono text-surface/30">
                            {agent.cost}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-surface/80 mb-0.5">
                          {agent.name}
                        </p>
                        <p className="text-[10px] text-surface/30">
                          {agent.tag}
                        </p>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Connector */}
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.3, delay: 1.0 }}
                    className="flex justify-center origin-top"
                  >
                    <div className="w-px h-6 bg-surface/10" />
                  </motion.div>

                  {/* Result */}
                  <motion.div
                    variants={scaleIn}
                    initial="hidden"
                    animate="visible"
                    custom={1.1}
                    className="bg-surface/[0.05] backdrop-blur border border-surface/10 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                          <span className="text-success text-sm">&#10003;</span>
                        </div>
                        <span className="text-xs font-medium text-surface/40 uppercase tracking-wider">
                          Deliverables
                        </span>
                      </div>
                      <span className="text-xs font-mono text-success/70">
                        $2.25 USDC
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {["Security Audit", "Market Report", "Investment Memo"].map(
                        (d) => (
                          <span
                            key={d}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-surface/[0.08] text-surface/50"
                          >
                            {d}
                          </span>
                        )
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Divider — transition from dark to light */}
      <div className="bg-ink">
        <div className="max-w-6xl mx-auto px-6">
          <div className="border-t border-surface/10" />
        </div>
      </div>

      {/* How it works */}
      <section className="bg-ink">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-0"
          >
            {[
              { icon: "01", label: "Describe", detail: "Natural language task" },
              { icon: "02", label: "Decompose", detail: "AI-powered splitting" },
              { icon: "03", label: "Execute", detail: "Specialist agents work" },
              { icon: "04", label: "Settle", detail: "On-chain USDC payments" },
            ].map((step, i) => (
              <motion.div
                key={step.icon}
                variants={fadeUp}
                className="relative flex items-center"
              >
                <div className="flex-1 text-center py-6 px-4">
                  <span className="text-3xl font-bold text-surface/[0.08] block mb-2 select-none">
                    {step.icon}
                  </span>
                  <p className="text-sm font-semibold text-surface/80 mb-1">
                    {step.label}
                  </p>
                  <p className="text-xs text-surface/30">{step.detail}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:block text-surface/15 text-lg select-none">
                    &rarr;
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features — light section */}
      <section className="bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-4"
            >
              Built for agentic commerce
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={0.1}
              className="text-ink-secondary max-w-lg mx-auto"
            >
              Every component designed for autonomous agent-to-agent economic activity.
            </motion.p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {[
              {
                title: "x402 Payment Protocol",
                desc: "Agents pay each other in USDC using HTTP-native x402 payments. No manual approvals. No custodial wallets. Every specialist has their own keypair.",
                tag: "Payments",
              },
              {
                title: "Zero Gas on SKALE",
                desc: "Deployed on SKALE Calypso — a gasless EVM chain. Agents transact freely without gas overhead eating into micro-payment margins.",
                tag: "Infrastructure",
              },
              {
                title: "Reputation-Weighted Discovery",
                desc: "Specialists are ranked by delivery history. The coordinator routes tasks to the highest-performing agents, not just the cheapest.",
                tag: "Trust",
              },
              {
                title: "Full Audit Trail",
                desc: "Every payment, every agent decision, every deliverable — timestamped and verifiable on the block explorer. Complete transparency.",
                tag: "Verification",
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group bg-surface-secondary rounded-2xl border border-border p-8 hover:border-border-strong hover:shadow-md transition-shadow"
              >
                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-ink-muted mb-4">
                  {feature.tag}
                </span>
                <h3 className="text-lg font-semibold text-ink mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats — light bg, monochrome numbers */}
      <section className="bg-surface border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { value: "$0.00", label: "Gas per transaction" },
              { value: "3", label: "Specialist agents" },
              { value: "<5s", label: "Average task time" },
              { value: "100%", label: "On-chain verified" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="text-center"
              >
                <p className="text-3xl font-bold text-ink font-mono mb-1">
                  {stat.value}
                </p>
                <p className="text-xs text-ink-muted">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA — dark again */}
      <section className="bg-ink">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            className="text-3xl sm:text-4xl font-bold text-surface tracking-tight mb-4"
          >
            See it in action
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0.1}
            className="text-sm text-surface/50 mb-10 max-w-md mx-auto"
          >
            Submit a task, watch agents collaborate in real time, and verify every
            USDC payment on the block explorer.
          </motion.p>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0.2}
          >
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold bg-surface text-ink rounded-xl hover:bg-surface/90 transition-all"
            >
              Launch Dashboard
              <span className="group-hover:translate-x-0.5 transition-transform">
                &rarr;
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="bg-ink border-t border-surface/10"
      >
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-surface/30">
          <span>Built at SF Agentic Commerce x402 Hackathon, Feb 2026</span>
          <span className="font-semibold text-surface/50">PRISM</span>
        </div>
      </motion.footer>
    </div>
  );
}
