"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowUp, LoaderCircle, Menu, Paperclip, Settings, Unplug, Wallet, X } from "lucide-react";
import ChatMessage, { ChatMessageData, ThinkingStep } from "@/components/ChatMessage";
import ChatSidebar from "@/components/ChatSidebar";
import ExecutionGraph from "@/components/ExecutionGraph";
import VerixMark from "@/components/VerixMark";
import { Task, TaskStatus, TaskResult, Subtask, TaskEvent } from "@/types/task";
import { ExecutionTraceEvent } from "@/types/trace";
import {
  submitTask,
  getTaskStatus,
  getWalletBalance,
  getTaskHistory,
  getSpecialists,
  deleteTask,
  getOrInitSession,
  getCurrentSession,
} from "@/lib/api-client";
import { Specialist } from "@/types/specialist";
import {
  clearCachedConnectedWallet,
  connectWallet,
  getCachedConnectedWallet,
  getWalletOptions,
  WalletProviderId,
} from "@/lib/wallet-connect";
import { DEMO_GOLDEN_PROMPT, DEMO_SPEND_CAP_USDC } from "@/lib/demo-scenario";
import { WalletBalance } from "@/types/payment";
import { toast } from "sonner";

// Pure helper — defined outside component so it is stable across renders
function traceEventToThinkingStep(e: ExecutionTraceEvent): ThinkingStep {
  const deriveStatus = (type: string): ThinkingStep["status"] => {
    if (type.includes("failed") || type.includes("exceeded")) return "error";
    if (type.includes("confirmed") || type.includes("completed")) return "success";
    if (type.includes("initiated") || type.includes("invoked") || type.includes("assigned")) return "pending";
    return "info";
  };
  return {
    message: e.displayMessage,
    status: deriveStatus(e.eventType),
    type: e.actor === "payment" ? "payment" : e.actor === "coordinator" ? "coordinator" : "specialist",
    timestamp: e.timestamp,
    actor: e.actor,
    eventType: e.eventType,
    eventHash: e.eventHash,
    sequence: e.sequence,
  };
}

const WALLET_BALANCE_CACHE_KEY = "verix_wallet_balance_cache";

function readCachedWalletBalance(address: string): WalletBalance | null {
  if (typeof window === "undefined" || !address) return null;

  try {
    const raw = localStorage.getItem(WALLET_BALANCE_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as WalletBalance & { cachedAt?: number };
    if (cached.address !== address) return null;
    if (cached.error) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeCachedWalletBalance(balance: WalletBalance) {
  if (typeof window === "undefined" || !balance.address?.startsWith("G")) return;
  localStorage.setItem(
    WALLET_BALANCE_CACHE_KEY,
    JSON.stringify({ ...balance, cachedAt: Date.now() })
  );
}

export default function Dashboard() {
  // Core state
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletAssetCode, setWalletAssetCode] = useState("USDC");
  const [walletAssetIssuer, setWalletAssetIssuer] = useState<string | null>(null);
  const [nativeBalance, setNativeBalance] = useState<number | null>(null);
  const [hasConfiguredAsset, setHasConfiguredAsset] = useState(true);
  const [hasAnyRequestedAsset, setHasAnyRequestedAsset] = useState(true);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletSource, setWalletSource] = useState<"connected-wallet" | "coordinator">("coordinator");
  const [walletProvider, setWalletProvider] = useState<WalletProviderId | null>(null);
  const [walletProviderName, setWalletProviderName] = useState<string | null>(null);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [walletOptions, setWalletOptions] = useState<Array<{
    id: WalletProviderId;
    name: string;
    description: string;
    availability: "available" | "extension-required" | "external";
  }>>([]);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [isWalletOptionsLoading, setIsWalletOptionsLoading] = useState(false);
  const [isWalletBalanceRefreshing, setIsWalletBalanceRefreshing] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<
    "connected" | "disconnected" | "loading"
  >("loading");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spendCap, setSpendCap] = useState(10);

  // Chat state
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<Array<{ name: string; content: string; type: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const thinkingIdRef = useRef<string | null>(null);

  // Task history
  const [taskHistory, setTaskHistory] = useState<Task[]>([]);

  // Session
  const [sessionId, setSessionId] = useState<string | null>(getCurrentSession);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | null>(null);

  // Confirmation modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDescription, setPendingDescription] = useState("");

  // Graph events for live execution DAG
  const [graphEvents, setGraphEvents] = useState<ExecutionTraceEvent[]>([]);

  // Server event tracking
  const syncedEventsCount = useRef(0);
  const walletBalanceRequestId = useRef(0);

  // SSE connection for live trace events
  const sseRef = useRef<EventSource | null>(null);

  const selectedSpecialist = useMemo(
    () => specialists.find((s) => s.id === selectedSpecialistId) ?? null,
    [specialists, selectedSpecialistId]
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Helper: add a thinking step to the current thinking block
  const addThinkingStep = useCallback(
    (step: ThinkingStep) => {
      setMessages((prev) => {
        const updated = [...prev];
        const thinkingIdx = updated.findIndex(
          (m) => m.id === thinkingIdRef.current
        );
        if (thinkingIdx !== -1) {
          const thinking = { ...updated[thinkingIdx] };
          thinking.thinkingSteps = [...(thinking.thinkingSteps || []), step];
          updated[thinkingIdx] = thinking;
        }
        return updated;
      });
    },
    []
  );

  // Helper: finalize thinking block with duration
  const finalizeThinking = useCallback(
    (duration: number) => {
      setMessages((prev) => {
        const updated = [...prev];
        const thinkingIdx = updated.findIndex(
          (m) => m.id === thinkingIdRef.current
        );
        if (thinkingIdx !== -1) {
          const thinking = { ...updated[thinkingIdx] };
          thinking.thinkingDuration = duration;
          updated[thinkingIdx] = thinking;
        }
        return updated;
      });
    },
    []
  );

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const applyWalletBalance = useCallback(
    (data: WalletBalance, fallbackSource: "connected-wallet" | "coordinator") => {
      setWalletBalance(data.balance);
      setWalletAssetCode(data.assetCode ?? "USDC");
      setWalletAssetIssuer(data.assetIssuer ?? null);
      setNativeBalance(data.nativeBalance ?? null);
      setHasConfiguredAsset(data.hasConfiguredAsset ?? true);
      setHasAnyRequestedAsset(data.hasAnyRequestedAsset ?? true);
      setWalletAddress(data.address);
      setWalletSource(data.source ?? fallbackSource);
    },
    []
  );

  // Fetch wallet balance without blocking the connected account shell.
  const fetchWalletBalance = useCallback(async (address?: string) => {
    const requestId = walletBalanceRequestId.current + 1;
    walletBalanceRequestId.current = requestId;
    setIsWalletBalanceRefreshing(true);
    if (address?.startsWith("G")) {
      setNetworkStatus("connected");
    } else {
      setNetworkStatus("loading");
    }

    try {
      const data = await getWalletBalance(address);
      if (requestId !== walletBalanceRequestId.current) return;
      applyWalletBalance(data, address ? "connected-wallet" : "coordinator");
      if (data.error) {
        setWalletError(data.error);
      } else {
        writeCachedWalletBalance(data);
        setWalletError(null);
      }
      setNetworkStatus("connected");
    } catch (error) {
      if (requestId !== walletBalanceRequestId.current) return;
      if (address?.startsWith("G")) {
        setNetworkStatus("connected");
        setWalletError(error instanceof Error ? error.message : "Balance refresh failed.");
      } else {
        setNetworkStatus("disconnected");
      }
    } finally {
      if (requestId === walletBalanceRequestId.current) {
        setIsWalletBalanceRefreshing(false);
      }
    }
  }, [applyWalletBalance]);

  const refreshActiveWalletBalance = useCallback(() => {
    void fetchWalletBalance(
      walletSource === "connected-wallet" && walletAddress.startsWith("G")
        ? walletAddress
        : undefined
    );
  }, [fetchWalletBalance, walletAddress, walletSource]);

  const handleConnectWallet = useCallback(async (providerId: WalletProviderId) => {
    setIsWalletConnecting(true);
    setWalletError(null);
    setNetworkStatus("loading");
    try {
      const wallet = await connectWallet(providerId);
      setWalletProvider(wallet.provider);
      setWalletProviderName(wallet.providerName);
      setWalletSource("connected-wallet");
      setWalletAddress(wallet.address);
      setNetworkStatus("connected");
      setShowWalletPicker(false);
      void fetchWalletBalance(wallet.address);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Wallet connection failed.");
      setNetworkStatus("disconnected");
    } finally {
      setIsWalletConnecting(false);
    }
  }, [fetchWalletBalance]);

  const handleDisconnectWallet = useCallback(async () => {
    clearCachedConnectedWallet();
    setWalletProvider(null);
    setWalletProviderName(null);
    setWalletSource("coordinator");
    setWalletError(null);
    setWalletAddress("");
    setWalletBalance(0);
    setWalletAssetIssuer(null);
    setNativeBalance(null);
    setNetworkStatus("loading");
    void fetchWalletBalance();
  }, [fetchWalletBalance]);

  // Fetch task history
  const fetchHistory = useCallback(async () => {
    try {
      const tasks = await getTaskHistory();
      setTaskHistory(
        tasks.filter((t) => t.status === "completed" || t.status === "failed")
      );
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    const cachedWallet = getCachedConnectedWallet();
    if (cachedWallet) {
      setWalletProvider(cachedWallet.provider);
      setWalletProviderName(cachedWallet.providerName);
      setWalletAddress(cachedWallet.address);
      setWalletSource("connected-wallet");
      setNetworkStatus("connected");

      const cachedBalance = readCachedWalletBalance(cachedWallet.address);
      if (cachedBalance) {
        applyWalletBalance(cachedBalance, "connected-wallet");
      }

      void fetchWalletBalance(cachedWallet.address);
    } else {
      void fetchWalletBalance();
    }

    fetchHistory();
    getSpecialists()
      .then((data) => {
        setSpecialists(data);
        if (typeof window !== "undefined") {
          const agentId = new URLSearchParams(window.location.search).get("agent");
          if (agentId && data.some((s) => s.id === agentId)) {
            setSelectedSpecialistId(agentId);
          }
        }
      })
      .catch(() => { });
    // Ensure the session is initialised and cached in localStorage
    getOrInitSession().then(setSessionId).catch(() => { });
  }, [applyWalletBalance, fetchWalletBalance, fetchHistory]);

  useEffect(() => {
    if (!showWalletPicker || walletOptions.length > 0 || isWalletOptionsLoading) return;

    setIsWalletOptionsLoading(true);
    getWalletOptions()
      .then(setWalletOptions)
      .catch(() => setWalletOptions([]))
      .finally(() => setIsWalletOptionsLoading(false));
  }, [isWalletOptionsLoading, showWalletPicker, walletOptions.length]);

  // Add a chat message
  const addMessage = useCallback(
    (
      role: ChatMessageData["role"],
      content: string,
      status?: ChatMessageData["status"],
      extra?: Partial<ChatMessageData>
    ) => {
      const msg: ChatMessageData = {
        id: crypto.randomUUID(),
        role,
        content,
        timestamp: new Date().toISOString(),
        status,
        ...extra,
      };
      setMessages((prev) => [...prev, msg]);
    },
    []
  );

  // Sync legacy task events into the thinking block (fallback when no trace events)
  const syncEvents = useCallback(
    (events: TaskEvent[]) => {
      if (!events || events.length <= syncedEventsCount.current) return;

      const newEvents = events.slice(syncedEventsCount.current);
      syncedEventsCount.current = events.length;

      for (const event of newEvents) {
        addThinkingStep({
          message: event.message,
          status: event.status,
          type: event.type,
          timestamp: event.timestamp,
        });
      }
    },
    [addThinkingStep]
  );

  // Sync structured trace events into the thinking block (preferred over legacy events)
  const syncTraceEvents = useCallback(
    (traceEvents: ExecutionTraceEvent[]) => {
      if (!traceEvents || traceEvents.length <= syncedEventsCount.current) return;

      const newEvents = traceEvents.slice(syncedEventsCount.current);
      syncedEventsCount.current = traceEvents.length;

      for (const event of newEvents) {
        addThinkingStep(traceEventToThinkingStep(event));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addThinkingStep]
  );

  // Elapsed time counter
  useEffect(() => {
    if (
      !taskStatus ||
      taskStatus === "completed" ||
      taskStatus === "failed" ||
      taskStatus === "pending"
    )
      return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 0.1);
    }, 100);

    return () => clearInterval(interval);
  }, [taskStatus]);

  // SSE subscription — streams trace events with ~1s latency while a task is active.
  // The existing 2s polling useEffect remains active as fallback: syncTraceEvents
  // checks syncedEventsCount so events processed by SSE are not re-added.
  useEffect(() => {
    if (!taskId) return;

    const sse = new EventSource(`/api/executions/${encodeURIComponent(taskId)}/events`);
    sseRef.current = sse;

    sse.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as { type: string; payload: unknown };
        if (msg.type === "trace_event") {
          const event = msg.payload as ExecutionTraceEvent;
          if (event.sequence >= syncedEventsCount.current) {
            addThinkingStep(traceEventToThinkingStep(event));
            syncedEventsCount.current = event.sequence + 1;
            setGraphEvents((prev) => {
              if (prev.some((ev) => ev.sequence === event.sequence)) return prev;
              return [...prev, event].sort((a, b) => a.sequence - b.sequence);
            });
          }
        } else if (msg.type === "task_complete") {
          sse.close();
          sseRef.current = null;
        }
      } catch {
        // ignore malformed messages
      }
    };

    sse.onerror = () => {
      sse.close();
      sseRef.current = null;
    };

    return () => {
      sse.close();
      sseRef.current = null;
    };
  }, [taskId, addThinkingStep]);

  // Estimate cost
  const estimateCost = (description: string) => {
    if (selectedSpecialist) {
      setEstimatedCost(selectedSpecialist.priceUsdc);
      return;
    }

    const lower = description.toLowerCase();
    const hasCode =
      lower.includes("code") ||
      lower.includes("security") ||
      lower.includes("audit");
    const hasMarket =
      lower.includes("market") ||
      lower.includes("investment") ||
      lower.includes("analysis");
    const hasWriting =
      lower.includes("memo") ||
      lower.includes("report") ||
      lower.includes("write");

    let cost = 0;
    if (hasCode) cost += 1.0;
    if (hasMarket) cost += 0.75;
    if (hasWriting) cost += 0.5;

    setEstimatedCost(cost || 2.25);
  };

  // Poll task status
  useEffect(() => {
    if (!taskId) return;

    const interval = setInterval(async () => {
      try {
        const task = await getTaskStatus(taskId);
        setTaskStatus(task.status);

        if (task.subtasks) setSubtasks(task.subtasks);
        if (task.totalCost) setTotalCost(task.totalCost);
        if (task.traceEvents && task.traceEvents.length > 0) {
          syncTraceEvents(task.traceEvents);
          setGraphEvents(task.traceEvents);
        } else if (task.events) {
          syncEvents(task.events);
        }

        if (task.result) {
          setResult(task.result);
          // Finalize thinking block
          finalizeThinking(elapsedTime);
          // Add result as a proper chat response — include receipt when available
          addMessage("result", "Task completed successfully", "success", {
            result: task.result,
            taskId: taskId ?? undefined,
            receipt: task.receipt ?? undefined,
            walletAddress: task.walletAddress,
            approvalStatus: task.approvalStatus,
            approvedAt: task.approvedAt,
            approvedByWallet: task.approvedByWallet,
            approvalResultHash: task.approvalResultHash,
          });
          refreshActiveWalletBalance();
          clearInterval(interval);
        }
        if (task.status === "failed") {
          finalizeThinking(elapsedTime);
          addMessage("system", "Task failed.", "error");
          refreshActiveWalletBalance();
          clearInterval(interval);
        }
      } catch {
        // Silently retry
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [taskId, addMessage, syncEvents, syncTraceEvents, refreshActiveWalletBalance]);

  // File attachment handler
  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 500_000) {
        toast.error(`"${file.name}" is too large (max 500 KB).`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setAttachments((prev) => {
          if (prev.some((a) => a.name === file.name)) return prev;
          return [...prev, { name: file.name, content, type: file.type }];
        });
      };
      reader.readAsText(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Step 1: User submits → show confirmation
  const handleRequestSubmit = () => {
    const description = inputValue.trim();
    if (!description || isSubmitting) return;
    if (walletSource !== "connected-wallet" || !walletAddress.startsWith("G")) {
      setWalletError("Connect a Stellar wallet before submitting a Verix execution.");
      setShowWalletPicker(true);
      return;
    }
    estimateCost(description);
    setPendingDescription(description);
    setShowConfirm(true);
  };

  // Step 2: User confirms → actually submit
  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    const description = pendingDescription;
    setIsSubmitting(true);

    // Add user message to chat
    addMessage("user", description);
    setInputValue("");
    setAttachments([]);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    // Reset state for new task
    setSubtasks([]);
    setResult(null);
    setTotalCost(0);
    setElapsedTime(0);
    setGraphEvents([]);
    syncedEventsCount.current = 0;
    sseRef.current?.close();
    sseRef.current = null;

    // Create thinking block
    const thinkingId = crypto.randomUUID();
    thinkingIdRef.current = thinkingId;
    const thinkingMsg: ChatMessageData = {
      id: thinkingId,
      role: "thinking",
      content: "",
      timestamp: new Date().toISOString(),
      thinkingSteps: [
        {
          message: "Received your task. Analyzing...",
          status: "info",
          type: "coordinator",
          timestamp: new Date().toISOString(),
        },
      ],
    };
    setMessages((prev) => [...prev, thinkingMsg]);

    try {
      const response = await submitTask({
        description,
        spendCap,
        walletAddress,
        walletProvider: walletProviderName ?? walletProvider ?? undefined,
        requestedSpecialistId: selectedSpecialist?.id,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setTaskId(response.task_id);
      setTaskStatus("decomposing");
      setEstimatedCost(response.estimated_cost);
      toast.success("Task submitted — execution started.");
      // Stamp the taskId onto the thinking message so EscrowTimeline can load it
      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((m) => m.id === thinkingIdRef.current);
        if (idx !== -1) updated[idx] = { ...updated[idx], taskId: response.task_id };
        return updated;
      });

      addThinkingStep({
        message: selectedSpecialist
          ? `Marketplace agent pinned: ${selectedSpecialist.name}.`
          : `Task decomposed into ${response.subtasks.length} subtask(s).`,
        status: "success",
        type: "coordinator",
        timestamp: new Date().toISOString(),
      });

      response.subtasks.forEach((s) => {
        addThinkingStep({
          message: `Subtask identified: ${s}`,
          status: "info",
          type: "coordinator",
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      addThinkingStep({
        message: `Error: ${msg}`,
        status: "error",
        type: "system",
        timestamp: new Date().toISOString(),
      });
      toast.error(`Task submission failed: ${msg}`);
      setTaskStatus("failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load past task
  const handleViewHistory = async (historicTaskId: string) => {
    try {
      const task = await getTaskStatus(historicTaskId);
      setTaskId(historicTaskId);
      setTaskStatus(task.status);

      if (task.subtasks) setSubtasks(task.subtasks);
      if (task.totalCost) setTotalCost(task.totalCost);
      if (task.result) setResult(task.result);

      // Rebuild chat messages from stored events
      const rebuiltMessages: ChatMessageData[] = [];

      // Add the original user prompt
      rebuiltMessages.push({
        id: crypto.randomUUID(),
        role: "user",
        content: task.description,
        timestamp: task.createdAt,
      });

      // Add events as a thinking block — prefer structured trace events over legacy blob
      const hasTrace = task.traceEvents && task.traceEvents.length > 0;
      const hasLegacy = task.events && task.events.length > 0;

      if (hasTrace && task.traceEvents) {
        const thinkingSteps: ThinkingStep[] = task.traceEvents.map(traceEventToThinkingStep);
        const firstTime = new Date(task.traceEvents[0].timestamp).getTime();
        const lastTime = new Date(task.traceEvents[task.traceEvents.length - 1].timestamp).getTime();
        const duration = (lastTime - firstTime) / 1000;

        rebuiltMessages.push({
          id: crypto.randomUUID(),
          role: "thinking",
          content: "",
          timestamp: task.traceEvents[0].timestamp,
          thinkingSteps,
          thinkingDuration: duration > 0 ? duration : undefined,
          taskId: historicTaskId,
        });
      } else if (hasLegacy && task.events) {
        const thinkingSteps: ThinkingStep[] = task.events.map((e) => ({
          message: e.message,
          status: e.status,
          type: e.type,
          timestamp: e.timestamp,
        }));

        const firstTime = new Date(task.events[0].timestamp).getTime();
        const lastTime = new Date(
          task.events[task.events.length - 1].timestamp
        ).getTime();
        const duration = (lastTime - firstTime) / 1000;

        rebuiltMessages.push({
          id: crypto.randomUUID(),
          role: "thinking",
          content: "",
          timestamp: task.events[0].timestamp,
          thinkingSteps,
          thinkingDuration: duration > 0 ? duration : undefined,
          taskId: historicTaskId,
        });
      }

      // Add result if present — include receipt so the card can show proof status
      if (task.result) {
        rebuiltMessages.push({
          id: crypto.randomUUID(),
          role: "result",
          content: "Task completed successfully",
          status: "success",
          timestamp: task.completedAt || task.createdAt,
          result: task.result,
          taskId: historicTaskId,
          receipt: task.receipt ?? undefined,
          walletAddress: task.walletAddress,
          approvalStatus: task.approvalStatus,
          approvedAt: task.approvedAt,
          approvedByWallet: task.approvedByWallet,
          approvalResultHash: task.approvalResultHash,
        });
      }

      setMessages(rebuiltMessages);
      setSidebarOpen(false);
    } catch {
      // ignore
    }
  };

  // New Task
  const handleNewTask = () => {
    setTaskStatus(null);
    setTaskId(null);
    setMessages([]);
    setSubtasks([]);
    setResult(null);
    setTotalCost(0);
    setEstimatedCost(null);
    setElapsedTime(0);
    setInputValue("");
    syncedEventsCount.current = 0;
    thinkingIdRef.current = null;
    sseRef.current?.close();
    sseRef.current = null;
    refreshActiveWalletBalance();
    fetchHistory();
    setSidebarOpen(false);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  // Handle Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRequestSubmit();
    }
  };

  const isWorking =
    taskStatus &&
    taskStatus !== "completed" &&
    taskStatus !== "failed";
  const isDone = taskStatus === "completed" || taskStatus === "failed";
  const hasMessages = messages.length > 0;

  // Status labels
  const statusLabels: Record<TaskStatus, string> = {
    pending: "Pending",
    funding_pending: "Awaiting Escrow Funding",
    decomposing: "Decomposing Task",
    discovering: "Finding Specialists",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
  };

  return (
    <div className="h-screen flex overflow-hidden verix-shell">
      {/* Sidebar */}
      <ChatSidebar
        taskHistory={taskHistory}
        activeTaskId={taskId}
        onNewTask={handleNewTask}
        onSelectTask={handleViewHistory}
        onDeleteTask={async (id) => {
          try {
            await deleteTask(id);
            setTaskHistory((prev) => prev.filter((t) => t.id !== id));
            if (taskId === id) {
              setTaskId(null);
              setMessages([]);
              setResult(null);
              setSubtasks([]);
              setTaskStatus(null);
            }
          } catch (e) {
            console.error("Failed to delete task:", e);
          }
        }}
        sessionId={sessionId}
        walletBalance={walletBalance}
        walletAssetCode={walletAssetCode}
        walletAssetIssuer={walletAssetIssuer}
        nativeBalance={nativeBalance}
        hasConfiguredAsset={hasConfiguredAsset}
        hasAnyRequestedAsset={hasAnyRequestedAsset}
        walletAddress={walletAddress}
        walletSource={walletSource}
        walletProvider={walletProvider}
        walletProviderName={walletProviderName}
        isWalletConnecting={isWalletConnecting}
        isWalletBalanceRefreshing={isWalletBalanceRefreshing}
        onOpenWalletPicker={() => setShowWalletPicker(true)}
        onDisconnectWallet={handleDisconnectWallet}
        networkStatus={networkStatus}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        specialists={specialists}
        collapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 shrink-0 border-b border-border bg-surface flex items-center px-4 gap-3">
          {/* Hamburger for mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-tertiary transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex-1 min-w-0">
            {isWorking && taskStatus ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse-subtle" />
                <span className="text-sm font-medium text-ink">
                  {statusLabels[taskStatus]}
                </span>
                <span className="text-xs text-ink-muted font-mono">
                  {elapsedTime.toFixed(1)}s
                </span>
              </div>
            ) : isDone ? (
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${taskStatus === "completed" ? "bg-success" : "bg-error"
                    }`}
                />
                <span className="text-sm font-medium text-ink">
                  {taskStatus === "completed"
                    ? "Task Complete"
                    : "Task Failed"}
                </span>
                {totalCost > 0 && (
                  <span className="text-xs text-ink-muted font-mono">
                    ${totalCost.toFixed(2)} USDC
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm font-medium text-ink">Execution console</span>
            )}
          </div>

          {/* Wallet badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-secondary border border-border">
            {isWalletBalanceRefreshing ? (
              <LoaderCircle className="h-3 w-3 animate-spin text-ink-muted" aria-hidden="true" />
            ) : (
              <span
                className={`w-1.5 h-1.5 rounded-full ${networkStatus === "connected"
                  ? "bg-success"
                  : networkStatus === "loading"
                    ? "bg-warning animate-pulse"
                    : "bg-error"
                  }`}
              />
            )}
            <span className="text-xs font-mono font-semibold text-ink">
              ${walletBalance.toFixed(2)}
              <span className="ml-1 text-[10px] text-ink-muted">{walletAssetCode}</span>
            </span>
          </div>

          {walletSource === "connected-wallet" ? (
            <button
              onClick={handleDisconnectWallet}
              className="hidden h-8 items-center gap-1.5 border border-border bg-surface px-2.5 text-xs font-medium text-ink-secondary hover:border-border-strong hover:text-ink sm:inline-flex"
              title="Disconnect wallet"
            >
              <Unplug className="h-3.5 w-3.5" aria-hidden="true" />
              Wallet
            </button>
          ) : (
            <button
              onClick={() => setShowWalletPicker(true)}
              disabled={isWalletConnecting}
              className="hidden h-8 items-center gap-1.5 border border-border bg-surface px-2.5 text-xs font-medium text-ink-secondary hover:border-border-strong hover:text-ink disabled:opacity-50 sm:inline-flex"
            >
              {isWalletConnecting ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Connect wallet
            </button>
          )}

          {/* Settings link */}
          <Link
            href="/settings"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-tertiary transition-colors"
            title="Agent Settings"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto chat-scrollbar">
          {!hasMessages ? (
            /* Empty state - command center */
            <div className="flex flex-col items-center justify-center h-full px-6 py-12">
              <div className="mb-6">
                <VerixMark size="lg" />
              </div>
              <p className="verix-label mb-3">Autonomous work command center</p>
              <h1 className="text-3xl font-semibold text-ink mb-3 tracking-tight">
                Start a verifiable execution.
              </h1>
              <p className="text-sm text-ink-secondary text-center max-w-xl mb-10 leading-6">
                {selectedSpecialist
                  ? `Submit work directly to ${selectedSpecialist.name}, capture a hash-chained trace, and produce a canonical receipt for verification.`
                  : "Submit complex work, route it to specialist agents, capture a hash-chained trace, and produce a canonical receipt for local proof verification and escrow coordination."}
              </p>

              {/* Suggestion Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
                {[
                  {
                    icon: "SEC",
                    title: "Security Audit",
                    desc: "Analyze codebase for security vulnerabilities",
                  },
                  {
                    icon: "MRK",
                    title: "Market Research",
                    desc: "Research a company's market position and competitors",
                  },
                  {
                    icon: "MEM",
                    title: "Investment Memo",
                    desc: "Create a professional investment analysis document",
                  },
                  {
                    icon: "DAG",
                    title: "Full Analysis",
                    desc: "Audit code, research market, and write investment memo",
                  },
                ].map((chip) => (
                  <button
                    key={chip.title}
                    onClick={() => {
                      setInputValue(chip.desc);
                      inputRef.current?.focus();
                    }}
                    className="text-left p-4 rounded-md border border-border bg-surface hover:border-border-strong transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-8 items-center justify-center border border-border bg-surface-secondary font-mono text-[9px] font-semibold text-ink-muted">
                        {chip.icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink group-hover:text-accent transition-colors">
                          {chip.title}
                        </p>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {chip.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* How it works */}
              <div className="mt-12 text-center">
                <p className="verix-label mb-4">
                  Execution pipeline
                </p>
                <div className="flex items-center gap-4 text-xs text-ink-muted">
                  <span>Submit</span>
                  <span className="text-ink-muted/30">/</span>
                  <span>Route</span>
                  <span className="text-ink-muted/30">/</span>
                  <span>Trace</span>
                  <span className="text-ink-muted/30">/</span>
                  <span>Receipt</span>
                  <span className="text-ink-muted/30">/</span>
                  <span>Verify</span>
                </div>
              </div>
            </div>
          ) : (
            /* Chat Thread */
            <div className="max-w-3xl mx-auto px-4 py-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {/* Typing indicator when working */}
              {isWorking && (
                <div className="flex gap-3 py-2 pr-16">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-white border border-border">
                    <span className="grid h-8 w-8 place-items-center bg-ink text-[10px] font-semibold text-white">VX</span>
                  </div>
                  <div className="px-4 py-3 bg-surface border border-border rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-1">
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-ink-muted" />
                      <span
                        className="typing-dot w-1.5 h-1.5 rounded-full bg-ink-muted"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <span
                        className="typing-dot w-1.5 h-1.5 rounded-full bg-ink-muted"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Live Execution Graph — shown when a task is active */}
        {taskId && graphEvents.length > 0 && (
          <ExecutionGraph traceEvents={graphEvents} taskStatus={taskStatus} />
        )}

        {/* Input Bar */}
        <div className="shrink-0 border-t border-border bg-surface">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {selectedSpecialist && (
              <div className="mb-3 flex flex-col gap-2 rounded-md border border-border bg-surface-secondary px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="verix-label mb-1">Marketplace agent selected</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-ink">{selectedSpecialist.name}</span>
                    <span className="font-mono text-xs text-ink-muted">
                      ${selectedSpecialist.priceUsdc.toFixed(2)} USDC
                    </span>
                    <span className="text-xs text-ink-muted">v{selectedSpecialist.currentVersion}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSpecialistId(null)}
                  className="self-start border border-border px-2 py-1 text-xs text-ink-muted hover:border-border-strong hover:text-ink sm:self-auto"
                >
                  Use coordinator
                </button>
              </div>
            )}
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-ink-muted">
              <span>Golden path: marketplace hire &gt; escrow &gt; proof &gt; approval &gt; settlement</span>
              <button
                type="button"
                onClick={() => {
                  setInputValue(DEMO_GOLDEN_PROMPT);
                  setSpendCap(DEMO_SPEND_CAP_USDC);
                  inputRef.current?.focus();
                }}
                className="rounded border border-border px-2 py-1 font-medium text-ink hover:border-border-strong"
              >
                Load demo flow
              </button>
            </div>
            <div className="bg-surface border border-border rounded-md focus-within:border-border-strong transition-all">
              {/* Attachment chips */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-1">
                  {attachments.map((a) => (
                    <span key={a.name} className="flex items-center gap-1 rounded border border-border bg-surface-secondary px-2 py-0.5 text-[11px] text-ink-muted max-w-[180px]">
                      <Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{a.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((x) => x.name !== a.name))}
                        className="ml-0.5 shrink-0 hover:text-ink"
                        aria-label={`Remove ${a.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative flex items-end gap-2 px-4 py-2">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.md,.csv,.json,.js,.ts,.tsx,.jsx,.py,.sh,.yaml,.yml,.toml,.xml,.html,.css"
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                {/* Attach button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  title="Attach files"
                  className="shrink-0 text-ink-muted hover:text-ink disabled:opacity-30 transition-colors mb-1.5"
                >
                  <Paperclip className="h-4 w-4" aria-hidden="true" />
                </button>

                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    walletSource === "connected-wallet"
                      ? selectedSpecialist
                        ? `Describe the task for ${selectedSpecialist.name}...`
                        : "Describe your task..."
                      : "Connect a wallet to submit an execution..."
                  }
                  rows={1}
                  disabled={isSubmitting}
                  className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted resize-none focus:outline-none py-1.5 max-h-40 chat-scrollbar"
                />
                <button
                  onClick={handleRequestSubmit}
                  disabled={!inputValue.trim() || isSubmitting}
                  className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center shrink-0 hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all mb-0.5"
                >
                  {isSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-ink-muted text-center mt-2">
              Proof receipts verify workflow integrity; escrow settlement depends on configured Trustless Work mode.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showWalletPicker && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-5 max-w-lg w-full mx-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="verix-label mb-2">Wallet required</p>
                <h3 className="text-lg font-semibold text-ink">Connect a Stellar wallet</h3>
                <p className="text-sm text-ink-secondary mt-1">
                  Verix uses your wallet as the execution payer identity and balance source.
                </p>
              </div>
              <button
                onClick={() => setShowWalletPicker(false)}
                className="border border-border px-2 py-1 text-xs text-ink-muted hover:text-ink"
              >
                Close
              </button>
            </div>

            {walletError && (
              <div className="bg-error/10 text-error text-sm p-3 rounded-lg mb-4">
                {walletError}
              </div>
            )}

            <div className="grid gap-2">
              {isWalletOptionsLoading && walletOptions.length === 0 && (
                <div className="flex items-center justify-center gap-2 border border-border bg-surface-secondary px-4 py-6 text-sm text-ink-muted">
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Detecting available Stellar wallets...
                </div>
              )}

              {!isWalletOptionsLoading && walletOptions.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setWalletOptions([]);
                    setIsWalletOptionsLoading(true);
                    getWalletOptions()
                      .then(setWalletOptions)
                      .catch(() => setWalletOptions([]))
                      .finally(() => setIsWalletOptionsLoading(false));
                  }}
                  className="border border-border bg-surface-secondary px-4 py-3 text-sm text-ink-secondary hover:border-border-strong hover:text-ink"
                >
                  Retry wallet detection
                </button>
              )}

              {walletOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleConnectWallet(option.id)}
                  disabled={isWalletConnecting}
                  className="flex items-center justify-between gap-4 border border-border bg-surface-secondary px-4 py-3 text-left hover:border-border-strong disabled:opacity-50"
                >
                  <div>
                    <div className="text-sm font-semibold text-ink">{option.name}</div>
                    <div className="text-xs text-ink-muted mt-0.5">{option.description}</div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wide ${
                    option.availability === "available"
                      ? "text-success"
                      : option.availability === "external"
                        ? "text-warning"
                        : "text-ink-muted"
                  }`}>
                    {option.availability === "available"
                      ? "detected"
                      : option.availability === "external"
                        ? "external"
                        : "install"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 max-w-md w-full mx-4 shadow-lg">
            <h3 className="text-lg font-semibold text-ink mb-2">
              Confirm Task Submission
            </h3>
            <p className="text-sm text-ink-secondary mb-4">
              Review the details before autonomous agents begin working and
              making payments.
            </p>

            <div className="bg-surface-secondary rounded-lg border border-border p-4 space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Task</span>
                <span className="text-ink text-right max-w-[60%] truncate">
                  {pendingDescription}
                </span>
              </div>
              {selectedSpecialist && (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Selected Agent</span>
                  <span className="text-ink text-right max-w-[60%] truncate">
                    {selectedSpecialist.name} · v{selectedSpecialist.currentVersion}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Estimated Cost</span>
                <span className="font-mono font-semibold text-ink">
                  ${estimatedCost?.toFixed(2) ?? "0.00"} USDC
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Spend Cap</span>
                <span className="font-mono text-ink">
                  ${spendCap.toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Wallet Balance</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-ink">
                  {isWalletBalanceRefreshing && (
                    <LoaderCircle className="h-3 w-3 animate-spin text-ink-muted" aria-hidden="true" />
                  )}
                  ${walletBalance.toFixed(2)} {walletAssetCode}
                </span>
              </div>
              {nativeBalance !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Native Balance</span>
                  <span className="font-mono text-ink">
                    {nativeBalance.toFixed(2)} XLM
                  </span>
                </div>
              )}
              {walletAssetIssuer && (
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-ink-muted">Asset Issuer</span>
                  <span className="truncate font-mono text-xs text-ink">
                    {walletAssetIssuer}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Wallet Source</span>
                <span className="text-ink">
                  {walletSource === "connected-wallet" ? "Connected wallet" : "Coordinator fallback"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Network</span>
                <span className="text-ink">Stellar Testnet / Soroban</span>
              </div>
            </div>

            {estimatedCost !== null && !isWalletBalanceRefreshing && estimatedCost > walletBalance && (
              <div className="bg-error/10 text-error text-sm p-3 rounded-lg mb-4">
                Insufficient balance. You need ${estimatedCost.toFixed(2)} but
                only have ${walletBalance.toFixed(2)} {walletAssetCode}.
                {!hasConfiguredAsset && hasAnyRequestedAsset
                  ? " Your wallet has USDC, but it is not issued by the configured escrow asset issuer."
                  : !hasConfiguredAsset && nativeBalance !== null
                    ? ` Your wallet has ${nativeBalance.toFixed(2)} XLM, but no balance for the configured USDC issuer.`
                    : ""}
              </div>
            )}

            {!hasConfiguredAsset && hasAnyRequestedAsset && (
              <div className="bg-warning/10 text-warning text-sm p-3 rounded-lg mb-4">
                This wallet has {walletAssetCode}, but its issuer does not match the configured escrow asset issuer.
                The balance is visible for review; live escrow funding may still require the configured asset.
              </div>
            )}

            {walletError && (
              <div className="bg-error/10 text-error text-sm p-3 rounded-lg mb-4">
                {walletError}
              </div>
            )}

            {estimatedCost !== null && estimatedCost > spendCap && (
              <div className="bg-warning/10 text-warning text-sm p-3 rounded-lg mb-4">
                Estimated cost exceeds your spend cap of $
                {spendCap.toFixed(2)}.
              </div>
            )}

            {/* Spend cap adjuster */}
            <div className="mb-4">
              <label className="text-xs text-ink-muted uppercase tracking-wide block mb-2">
                Spend Cap (max per task)
              </label>
              <div className="flex items-center gap-2">
                {[5, 10, 25, 50].map((cap) => (
                  <button
                    key={cap}
                    onClick={() => setSpendCap(cap)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors ${spendCap === cap
                      ? "bg-ink text-surface border-ink"
                      : "bg-surface-secondary text-ink-secondary border-border hover:border-border-strong"
                      }`}
                  >
                    ${cap}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-ink-secondary border border-border rounded-lg hover:bg-surface-tertiary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={
                  (estimatedCost !== null && !isWalletBalanceRefreshing && estimatedCost > walletBalance) ||
                  isSubmitting ||
                  walletSource !== "connected-wallet"
                }
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-accent text-surface rounded-lg hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Approve & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
