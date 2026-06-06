"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface GrantData {
  capability: string;
  status: string;
  granted_by?: string | null;
  expires_at?: string | null;
  constraints?: Record<string, unknown> | null;
}

interface AgentData {
  agent_id: string;
  name: string;
  status: string;
  mode: string;
  host_id: string;
  agent_capability_grants: GrantData[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

interface LogEntry {
  id: number;
  type: string;
  actorId: string | null;
  actorType: string | null;
  agentId: string | null;
  hostId: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

function timeAgo(date: string | null) {
  if (!date) return "Never";
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatEventMessage(log: LogEntry): string {
  const action = log.type.split(".").pop() ?? log.type;
  const capability = log.data && "capability" in log.data ? String(log.data.capability) : null;
  
  const messages: Record<string, string> = {
    registered: "Agent registered",
    connected: "Connected to provider",
    revoked: "Agent access revoked",
    disconnected: "Agent disconnected",
    granted: capability ? `Granted "${capability}"` : "Capability granted",
    requested: capability ? `Requested "${capability}"` : "Capability requested",
    executed: capability ? `Executed "${capability}"` : "Capability executed",
    denied: capability ? `Denied "${capability}"` : "Capability denied",
    approved: capability ? `Approved "${capability}"` : "Capability approved",
  };
  
  return messages[action] ?? log.type.replace(/\./g, " ");
}

function formatConstraintValue(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return String(value);
  }
  
  const ops = value as Record<string, unknown>;
  const parts: string[] = [];
  
  if (ops.eq !== undefined) parts.push(`= ${ops.eq}`);
  if (ops.in !== undefined && Array.isArray(ops.in)) {
    const items = ops.in.map(String);
    parts.push(items.length === 1 ? items[0] : items.join(", "));
  }
  if (ops.not_in !== undefined && Array.isArray(ops.not_in)) {
    const items = ops.not_in.map(String);
    parts.push(`not ${items.join(", ")}`);
  }
  if (ops.max !== undefined) parts.push(`≤ $${ops.max}`);
  if (ops.min !== undefined) parts.push(`≥ $${ops.min}`);
  
  return parts.join(", ") || JSON.stringify(value);
}

const eventCategoryStyles: Record<string, string> = {
  agent: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  host: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  capability: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  ciba: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
};

export default function DelegationDashboard() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/agent/list?status=active");
      if (res.ok) {
        const data = await res.json();
        const activeAgents = data.agents ?? [];
        setAgents(activeAgents);
        
        // Auto-select first active agent
        if (activeAgents.length > 0 && !selectedAgent) {
          setSelectedAgent(activeAgents[0]);
        }
        
        // Update selected agent if it exists
        if (selectedAgent) {
          const updated = activeAgents.find((a: AgentData) => a.agent_id === selectedAgent.agent_id);
          if (updated) {
            setSelectedAgent(updated);
          } else {
            // Agent no longer active, clear selection
            setSelectedAgent(activeAgents[0] || null);
          }
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  const fetchLogs = useCallback(async (agentId: string) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ agent_id: agentId, limit: "100" });
      const res = await fetch(`/api/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = autoRefresh ? setInterval(fetchAgents, 5000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchAgents, autoRefresh]);

  useEffect(() => {
    if (selectedAgent) {
      fetchLogs(selectedAgent.agent_id);
      const interval = autoRefresh ? setInterval(() => fetchLogs(selectedAgent.agent_id), 5000) : null;
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [selectedAgent, fetchLogs, autoRefresh]);

  const handleRevoke = async () => {
    if (!selectedAgent) return;
    
    setRevoking(true);
    try {
      const res = await fetch("/api/auth/agent/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: selectedAgent.agent_id }),
      });
      
      if (res.ok) {
        // Refresh agents list
        await fetchAgents();
        // Show success message
        alert("Agent revoked successfully. All future actions will be blocked.");
      }
    } catch {
      alert("Failed to revoke agent. Please try again.");
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-foreground/10 border-t-foreground/60 animate-spin" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-xl">
          <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-500"
            >
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h3 className="text-[15px] font-semibold text-foreground/80 mb-2">No Active Agents</h3>
          <p className="text-[13px] text-foreground/40 text-center max-w-sm mb-6">
            Connect an agent through the chat interface to see delegation controls and audit logs here.
          </p>
          <button
            onClick={() => router.push("/dashboard/chat")}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Open Chat
          </button>
        </div>
      </div>
    );
  }

  const activeGrants = selectedAgent?.agent_capability_grants.filter((g) => g.status === "active") ?? [];

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
              Delegation Dashboard
            </h1>
            <p className="mt-2 text-sm text-foreground/60">
              Monitor agent permissions, constraints, and activity in real-time
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border-2 transition-all ${
                autoRefresh
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/50 shadow-lg shadow-emerald-500/10"
                  : "border-border text-foreground/50 hover:text-foreground hover:border-foreground/20"
              }`}
            >
              <div
                className={`h-2.5 w-2.5 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" : "bg-foreground/30"}`}
              />
              {autoRefresh ? "Live" : "Paused"}
            </button>
          </div>
        </div>
      </div>

      {/* Agent Selector */}
      {agents.length > 1 && (
        <div className="mb-6 flex gap-2 flex-wrap">
          {agents.map((agent) => (
            <button
              key={agent.agent_id}
              onClick={() => setSelectedAgent(agent)}
              className={`px-3 py-2 text-[13px] font-medium rounded-lg border transition-all ${
                selectedAgent?.agent_id === agent.agent_id
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-foreground/50 hover:text-foreground hover:bg-foreground/[0.03]"
              }`}
            >
              {agent.name}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Agent Status & Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Agent Identity Card */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-blue-50/50 via-white to-violet-50/50 dark:from-blue-950/20 dark:via-background dark:to-violet-950/20 overflow-hidden shadow-lg shadow-blue-500/5">
            <div className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-blue-500/5 to-violet-500/5">
              <div className="flex items-start gap-4">
                <div className="relative">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl blur-xl opacity-40 animate-pulse" />
                  {/* Icon */}
                  <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/50">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground/90 truncate mb-2">
                    {selectedAgent?.name}
                  </h3>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-foreground/40">
                  Agent ID
                </span>
                <code className="block mt-1.5 text-xs font-mono text-foreground/70 break-all bg-foreground/5 px-3 py-2 rounded-lg">
                  {selectedAgent?.agent_id}
                </code>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/40">
                    Mode
                  </span>
                  <p className="mt-1.5 text-sm font-medium text-foreground/80 capitalize">
                    {selectedAgent?.mode}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/40">
                    Last Active
                  </span>
                  <p className="mt-1.5 text-sm font-medium text-foreground/80">
                    {timeAgo(selectedAgent?.last_used_at || null)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-amber-500/5 to-orange-500/5">
              <h3 className="text-base font-bold text-foreground/90">
                Granted Capabilities
              </h3>
              <p className="mt-1 text-xs text-foreground/50">
                {activeGrants.length} active permission{activeGrants.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="px-6 py-5">
              {activeGrants.length === 0 ? (
                <p className="text-sm text-foreground/40 text-center py-6">
                  No active capabilities
                </p>
              ) : (
                <div className="space-y-3">
                  {activeGrants.map((grant, idx) => {
                    const hasConstraints = grant.constraints && Object.keys(grant.constraints).length > 0;
                    return (
                      <div
                        key={idx}
                        className="group rounded-xl border border-border bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900/50 dark:to-background p-4 hover:shadow-md hover:border-foreground/20 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <code className="text-sm font-mono font-semibold text-foreground/80">
                            {grant.capability}
                          </code>
                          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                        </div>
                        {hasConstraints && (
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            {Object.entries(grant.constraints!).map(([field, value]) => (
                              <div key={field} className="flex items-center justify-between text-xs">
                                <span className="text-foreground/50 font-medium">{field}:</span>
                                <span className="font-mono font-bold text-foreground/70 px-2 py-1 rounded-md bg-foreground/5">
                                  {formatConstraintValue(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Revocation Control */}
          <div className="relative rounded-2xl border-2 border-red-300 dark:border-red-900/70 bg-gradient-to-br from-red-50 via-rose-50 to-red-50 dark:from-red-950/30 dark:via-red-900/20 dark:to-red-950/30 overflow-hidden shadow-xl shadow-red-500/10">
            {/* Subtle pattern */}
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)'}} />
            
            <div className="relative px-6 py-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/30">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                    <path d="M12 22V12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-red-700 dark:text-red-400 mb-1">
                    Revoke Agent Access
                  </h3>
                  <p className="text-sm text-red-600/80 dark:text-red-400/70 leading-relaxed">
                    Immediately blocks all agent actions. This action cannot be undone.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="w-full px-5 py-3.5 text-sm font-bold rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition-all shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {revoking ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Revoking...
                  </span>
                ) : (
                  "Revoke Agent Now"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Activity Log */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card overflow-hidden h-full flex flex-col shadow-xl">
            <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-blue-500/5 to-violet-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground/90">Activity Log</h3>
                  <p className="mt-1 text-xs text-foreground/50">
                    Real-time audit trail of agent actions
                  </p>
                </div>
                {logsLoading && (
                  <div className="h-5 w-5 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mb-4">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-foreground/20"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <p className="text-sm text-foreground/40 font-medium">No activity recorded yet</p>
                  <p className="text-xs text-foreground/30 mt-1">Actions will appear here in real-time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => {
                    const isExpanded = expandedLog === log.id;
                    const category = log.type.split(".")[0];
                    const catStyle = eventCategoryStyles[category] ?? "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
                    
                    return (
                      <button
                        key={log.id}
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        className="cursor-pointer w-full text-left group"
                      >
                        <div
                          className={`rounded-xl border transition-all duration-200 ${
                            isExpanded
                              ? "bg-foreground/[0.04] border-foreground/20 shadow-lg"
                              : "border-border hover:bg-foreground/[0.02] hover:border-foreground/10 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-center gap-3 px-4 py-3.5">
                            <span
                              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold border ${catStyle}`}
                            >
                              {category}
                            </span>
                            <span className="flex-1 text-sm font-medium text-foreground/80 truncate">
                              {formatEventMessage(log)}
                            </span>
                            <span className="text-xs text-foreground/40 shrink-0 tabular-nums font-mono">
                              {timeAgo(log.createdAt)}
                            </span>
                          </div>
                          
                          {isExpanded && log.data && (
                            <div className="border-t border-border px-4 py-4 bg-foreground/[0.02]">
                              <pre className="text-xs font-mono text-foreground/60 whitespace-pre-wrap break-all max-h-64 overflow-y-auto leading-relaxed p-3 rounded-lg bg-foreground/5">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
