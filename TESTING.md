# Verix End-to-End Testing Checklist

Manual QA walkthrough of the complete platform: landing → wallet → marketplace → agent creation → task submission → file upload → live execution → receipt → proof verification → escrow settlement → result download.

**Prerequisites:**
- Dev server running: `npm run dev` (clear `.next/` first if routes were recently changed)
- Albedo or Freighter browser extension installed and set to **Stellar Testnet**
- Demo data seeded: `npm run demo:seed`
- `.env.local` configured with `PROOF_MODE=local` and `ESCROW_MODE=demo` for local testing

---

## 1. Landing Page (`/`)

- [ ] Page loads without errors
- [ ] Header shows VerixMark logo + links to `/marketplace` and `/dashboard`
- [ ] "Start execution" CTA navigates to `/dashboard`
- [ ] "Inspect receipt" CTA navigates to `/receipts/demo_verix_golden_path`
- [ ] Runtime state panel shows correct modes (PROOF_MODE, ESCROW_MODE, network: Stellar Testnet)

---

## 2. Wallet Connection (`/dashboard`)

- [ ] Dashboard loads — sidebar + empty chat area with suggestion chips
- [ ] Wallet section shows "Not connected" state
- [ ] Click "Connect Wallet" → wallet picker modal opens with provider list
- [ ] Select **Albedo** → wallet connects and modal closes
- [ ] Select **Freighter** → wallet connects and modal closes
- [ ] Wallet address appears in sidebar (G… truncated)
- [ ] USDC balance loads correctly (testnet balance)
- [ ] XLM native balance loads
- [ ] Disconnect wallet → state resets to "Not connected"
- [ ] Re-connect → address and balance restore from cache without re-prompting
- [ ] After page reload, wallet-kit correctly restores the previously selected provider (Albedo or Freighter) so signing works without re-selecting

---

## 3. Marketplace (`/marketplace`)

- [ ] Navigate to `/marketplace` from header link or dashboard
- [ ] Stats bar shows correct totals: agents count, online count, verified jobs
- [ ] Built-in agents appear: CodeAuditor, MarketAnalyst, CreativeWriter
- [ ] Proof policy badges render correctly (Trace / Receipt / Escrow colors)
- [ ] Search: type `"code"` → only CodeAuditor shows
- [ ] Proof policy filter: select "Escrow eligible" → only CreativeWriter shows
- [ ] Sort by "Price ↑" → cheapest agent first
- [ ] Clear filters → all agents visible
- [ ] Click an agent card → navigates to `/marketplace/[id]`

---

## 4. Agent Profile (`/marketplace/[id]`)

Navigate to `/marketplace/specialist_code_auditor`:

- [ ] Name "CodeAuditor", description, and proof policy banner display correctly
- [ ] Stats row: Reputation 95, total jobs 142, verified jobs 2
- [ ] Capabilities list shows all 5 capabilities as chips
- [ ] Technical details: AI model = Claude, version 1, endpoint URL
- [ ] Payment wallet (Stellar G… address) shown with link to Stellar explorer
- [ ] Version history section shows v1 entry with version hash
- [ ] "Hire Agent" button → navigates to `/dashboard?agent=specialist_code_auditor`

---

## 5. Pre-Selecting an Agent

- [ ] From agent profile, click "Hire Agent" → dashboard opens
- [ ] Banner appears: "CodeAuditor — $1.00/task"
- [ ] "Switch to coordinator" link available
- [ ] Click it → banner disappears, coordinator auto-routes mode active

---

## 6. Publishing a New Agent (`/settings`)

Navigate via gear icon in dashboard top bar:

- [ ] Settings page loads with existing agents listed
- [ ] System agents (CodeAuditor, MarketAnalyst, CreativeWriter) show as read-only
- [ ] Click "Publish Agent" → form animates open
- [ ] Fill in the form:
  - Name: `TestAgent`
  - Price: `0.5`
  - Description: `Test agent for QA`
  - Capabilities: `testing, qa`
  - Proof Policy: `Receipt proof`
  - Wallet Address: your connected G… address
  - AI Model: `Groq`
- [ ] Submit → success message appears, TestAgent appears in list
- [ ] Navigate to `/marketplace` → TestAgent card appears
- [ ] Back to `/settings`, edit TestAgent: change price to `0.75` → version increments to 2
- [ ] Delete TestAgent → removed from list and marketplace

---

## 7. File Attachments

- [ ] Click the **paperclip icon** in the input bar → file picker opens
- [ ] Select a `.txt` or `.md` file → chip appears above the textarea showing filename
- [ ] Select a second file → second chip appears
- [ ] Click the `×` on a chip → file is removed from the list
- [ ] Attach a file > 500 KB → alert: "is too large (max 500 KB)"
- [ ] Submit a task with attachments — confirm in the terminal logs that the attachment content appears in the task description sent to the coordinator
- [ ] Specialist reports reference or address content from the attached file

---

## 8. Task Submission — Coordinator Auto-Routes

With wallet connected:

- [ ] Click the "Full Analysis" suggestion chip OR paste:
  > Audit a Soroban escrow milestone release flow for security risks, compare the market positioning against existing AI work platforms, and produce a concise investor-ready launch memo.
- [ ] Confirmation modal appears showing:
  - Task description preview
  - Specialist: "Coordinator (auto-select)"
  - Subtasks listed: CodeAuditor, MarketAnalyst, CreativeWriter
  - Estimated cost: ~$2.25 USDC
  - Spend cap selector (set to $10)
  - Your wallet USDC balance
- [ ] Click "Approve & Execute" → modal closes, task starts

---

## 9. Task Submission — Pinned Agent

- [ ] Go to `/marketplace/specialist_code_auditor` → "Hire Agent"
- [ ] Enter: `"Review this Soroban escrow contract for reentrancy vulnerabilities."`
- [ ] Confirmation modal: specialist = CodeAuditor, cost = $1.00
- [ ] Approve → execution starts with CodeAuditor only

---

## 10. Live Execution View

While task is running:

- [ ] Thinking block appears in chat, trace events stream in real time
- [ ] Steps appear in order:
  - "Coordinator received task"
  - "AI selected N specialist(s)"
  - "Spend cap check passed"
  - "Recording Stellar payout intent for [Agent]…"
  - "Paid $X.XX USDC to [Agent]"
  - "[Agent] is processing…"
  - "[Agent] delivered results"
  - "Task complete. N deliverable(s), N payment(s) confirmed."
- [ ] Execution graph panel updates as agents complete
- [ ] Elapsed time counter ticks throughout
- [ ] Task status in header updates: pending → decomposing → discovering → processing → completed

---

## 11. Task Result

After completion:

- [ ] Full deliverable text appears in chat (one block per specialist)
- [ ] Total cost shown (e.g., "Total: $2.25 USDC")
- [ ] "View Receipt" button visible in result card
- [ ] **Download button** visible in result card header (next to "View Receipt")
- [ ] Click **Download** → browser downloads `verix-report-<taskId>.md`
- [ ] Opened file contains: summary, each specialist's deliverable under its own heading, payment audit trail with tx hashes
- [ ] Task appears in sidebar task history with correct status

---

## 12. Receipt Explorer (`/receipts/[taskId]`)

Click "View Receipt" or navigate directly:

- [ ] Page loads with "Receipt Explorer" header and task ID
- [ ] Execution Receipt card shows:
  - Receipt hash (64 hex chars)
  - Trace root (64 hex chars)
  - Input hash and output hash
  - Spend cap and total cost
  - Agent version hashes (one per specialist invoked)
  - Payment summary (per-agent amounts)
- [ ] Proof status badge: "Verified" (green) with `PROOF_MODE=local`
- [ ] Integrity checks section shows all 5 passing:
  - `receipt_integrity` ✓
  - `spend_cap` ✓
  - `payment_correct` ✓
  - `agent_membership` ✓
  - `trace_commitment` ✓
- [ ] "View Trace" link navigates to `/trace/[taskId]`

---

## 13. Trace Explorer (`/trace/[taskId]`)

- [ ] Event chain shows all events ordered by sequence number (1, 2, 3…)
- [ ] Each event shows: actor badge (coordinator / payment / specialist), event type, display message, timestamp
- [ ] Hash chain is valid: each event's `prevEventHash` matches the previous event's `eventHash`
- [ ] Final `traceRoot` matches the value in the receipt
- [ ] Event status colors: amber = initiated/invoked, green = confirmed/completed, red = failed/exceeded

---

## 14. Live Escrow (`ESCROW_MODE=live`)

Set `.env.local`:
```
ESCROW_MODE=live
TRUSTLESS_WORK_SIGNING_MODE=wallet
COORDINATOR_STELLAR_PRIVATE_KEY=S...
```

Then restart the dev server and submit a task.

### Deploy & Fund (wallet signing)

- [ ] Task starts → `EscrowTimeline` panel appears in the thinking block within ~2.5 seconds of escrow creation
- [ ] Status shows **Funding Pending** and "Wallet signature required" with **Sign deploy** button
- [ ] Click **Sign deploy** → Albedo/Freighter popup opens showing the deploy XDR
- [ ] Sign in Albedo → TW confirms deployment (`201 SUCCESS`)
- [ ] Panel updates: second signing prompt appears for the **fund transaction**
- [ ] Click **Sign funding** → Albedo/Freighter popup opens for the fund XDR
- [ ] Sign → `201 SUCCESS`; status updates to **Funded**; milestones show `Created → Funded` track
- [ ] Agents begin executing (coordinator_execution_resume job enqueued)

### Milestone Release (after payout approval)

- [ ] Task completes and proof is verified → "Approve payout" button appears
- [ ] Click **Approve payout** → wallet signs the approval
- [ ] Server automatically runs 3-step on-chain release for each eligible milestone:
  - `change-milestone-status` signed with `COORDINATOR_STELLAR_PRIVATE_KEY`
  - `approve-milestone` signed with `COORDINATOR_STELLAR_PRIVATE_KEY`
  - `release-milestone-funds` signed with `COORDINATOR_STELLAR_PRIVATE_KEY`
- [ ] Milestone tracks in EscrowTimeline update to **Released**
- [ ] "View on Trustless Work" link opens escrow viewer showing milestones as Released
- [ ] Wallet USDC balance decreases by the escrowed amount
- [ ] Click **Retry release** if any milestone shows Failed — server re-attempts the release flow

### Sync

- [ ] Click **Sync** in the EscrowTimeline → fetches live on-chain status from TW indexer
- [ ] Milestone statuses update to match on-chain state

---

## 15. Edge Case — Spend Cap Exceeded

- [ ] Submit any task with spend cap set to $0.10
- [ ] Task fails immediately with: "Estimated cost exceeds your spend cap"
- [ ] Task appears in history with "failed" status
- [ ] Trace explorer shows a `spend_cap_exceeded` event

---

## 16. Edge Case — No Wallet Connected

- [ ] Disconnect wallet
- [ ] Try to submit a task → submit button is disabled OR error shown:
  "A connected Stellar wallet is required to submit a task"
- [ ] Task cannot proceed without a valid Stellar public key

---

## 17. Edge Case — Wrong Wallet Signs Escrow

- [ ] Connect wallet A, submit task (escrow payer = wallet A)
- [ ] Disconnect and connect wallet B
- [ ] Click Sign in EscrowTimeline → error: "Connected wallet does not match the task payer wallet."
- [ ] Reconnect wallet A → signing proceeds normally

---

## Known Issues & Fixes

| Symptom | Fix |
|---------|-----|
| All API routes return 404 or hang on compile | Delete `.next/` and restart: `rm -rf .next && npm run dev` |
| `[wallet] GET` log never appears in terminal | Make sure no `proxy.ts` or `middleware.ts` is in `src/` |
| DB queries hang forever | URL-encode `@` in DATABASE_URL password as `%40` |
| Wallet balance returns 0 with error | Stellar Horizon has a 6s timeout; check network connectivity to `horizon-testnet.stellar.org` |
| Task hangs at payment stage | Switch `ESCROW_MODE=demo` in `.env.local` to avoid live Trustless Work API calls |
| "Not found" on receipt page | Proof generation is async; wait a few seconds after task completion and refresh |
| EscrowTimeline sign button never appears | Check browser console for `[EscrowTimeline]` logs; verify `taskId` is stamped onto the thinking message after task submission |
| TW returns 400 "milestone must be completed" | Ensure `COORDINATOR_STELLAR_PRIVATE_KEY` is set — server needs the key to sign change-status and approve XDRs |
| Albedo signing fails after page reload | Wallet kit re-initialises without a selected provider on reload; `getAuthorizedWallet()` now calls `setWallet()` automatically using the cached provider ID |
| `receipt_amount_mismatch` blocks milestone release | Caused by all specialists sharing the same wallet address; specialist-name matching now takes priority over address matching |
