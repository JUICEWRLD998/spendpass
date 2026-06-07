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
          <div className="relative rounded-2xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-50/50 via-white to-violet-50/50 dark:from-blue-950/20 dark:via-background dark:to-violet-950/20 overflow-hidden shadow-2xl shadow-blue-500/10">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />
            
            <div className="relative px-6 py-5 border-b border-blue-500/10 bg-gradient-to-r from-blue-500/5 to-violet-500/5">
              <div className="flex items-start gap-4">
                <div className="relative">
                  {/* Glow effect - enhanced */}
                  <div className="absolute -inset-2 bg-gradient-to-br from-blue-500 via-violet-500 to-emerald-500 rounded-3xl blur-2xl opacity-30 animate-pulse" />
                  {/* Icon */}
                  <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/50">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="drop-shadow-lg"
                    >
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground/90 truncate mb-2.5 tracking-tight">
                    {selectedAgent?.name}
                  </h3>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                    <div className="relative h-2.5 w-2.5">
                      <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                      <div className="relative h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                    </div>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                      Live
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative px-6 py-5 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/40">
                    Agent ID
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedAgent?.agent_id || '')}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <code className="block text-xs font-mono text-foreground/70 break-all bg-foreground/5 px-3.5 py-2.5 rounded-xl border border-border/50 hover:bg-foreground/10 transition-colors">
                  {selectedAgent?.agent_id}
                </code>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-3">
                <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 p-4 border border-blue-500/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600/70 dark:text-blue-400/70">
                    Mode
                  </span>
                  <p className="mt-2 text-base font-bold text-blue-700 dark:text-blue-300 capitalize">
                    {selectedAgent?.mode}
                  </p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20 p-4 border border-violet-500/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-600/70 dark:text-violet-400/70">
                    Last Active
                  </span>
                  <p className="mt-2 text-base font-bold text-violet-700 dark:text-violet-300">
                    {timeAgo(selectedAgent?.last_used_at || null)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="relative rounded-2xl border-2 border-amber-500/20 bg-card overflow-hidden shadow-2xl shadow-amber-500/5">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none" />
            
            <div className="relative px-6 py-4 border-b border-amber-500/10 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground/90 tracking-tight">
                    Granted Capabilities
                  </h3>
                  <p className="mt-1 text-xs text-foreground/50 font-medium">
                    {activeGrants.length} active permission{activeGrants.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-amber-600 dark:text-amber-400"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="relative px-6 py-5">
              {activeGrants.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex h-14 w-14 rounded-2xl bg-foreground/5 items-center justify-center mb-3">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-foreground/20"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <p className="text-sm text-foreground/40 font-medium">No active capabilities</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeGrants.map((grant, idx) => {
                    const hasConstraints = grant.constraints && Object.keys(grant.constraints).length > 0;
                    return (
                      <div
                        key={idx}
                        className="group relative rounded-xl border-2 border-border bg-gradient-to-br from-white via-gray-50/30 to-white dark:from-gray-900/50 dark:via-background dark:to-gray-900/30 p-4 hover:shadow-xl hover:border-amber-500/30 hover:-translate-y-0.5 transition-all duration-200"
                      >
                        {/* Success indicator */}
                        <div className="absolute -top-1 -right-1 h-4 w-4">
                          <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                          <div className="relative h-4 w-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-3 mb-3">
                          <code className="text-sm font-mono font-bold text-foreground/80 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                            {grant.capability}
                          </code>
                        </div>
                        
                        {hasConstraints && (
                          <div className="space-y-2.5 pt-3 border-t border-border/50">
                            {Object.entries(grant.constraints!).map(([field, value]) => (
                              <div key={field} className="flex items-center justify-between text-xs gap-3">
                                <span className="text-foreground/50 font-bold uppercase tracking-wider">{field}</span>
                                <span className="font-mono font-bold text-foreground/80 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
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
          <div className="relative rounded-2xl border-2 border-red-400/30 dark:border-red-800/70 bg-gradient-to-br from-red-50 via-rose-50 to-red-50 dark:from-red-950/30 dark:via-red-900/20 dark:to-red-950/30 overflow-hidden shadow-2xl shadow-red-500/20">
            {/* Animated danger pattern */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08]" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)'}} />
            {/* Subtle glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-red-500/10 via-transparent to-rose-500/10 pointer-events-none" />
            
            <div className="relative px-6 py-5">
              <div className="flex items-start gap-4 mb-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-xl blur-lg opacity-40" />
                  <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shrink-0 shadow-xl shadow-red-500/40">
                    <svg
                      width="22"
                      height="22"
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
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-red-700 dark:text-red-400 mb-2 tracking-tight">
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
                className="group relative w-full px-5 py-4 text-sm font-bold rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition-all shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] overflow-hidden"
              >
                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                
                <span className="relative flex items-center justify-center gap-2.5">
                  {revoking ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Revoking Access...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="17" y1="11" x2="23" y2="11" />
                      </svg>
                      Revoke Agent Now
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Activity Log */}
        <div className="lg:col-span-2">
          <div className="relative rounded-2xl border-2 border-blue-500/20 bg-card overflow-hidden h-full flex flex-col shadow-2xl shadow-blue-500/10">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5 pointer-events-none" />
            
            <div className="relative px-6 py-5 border-b border-blue-500/10 bg-gradient-to-r from-blue-500/8 to-violet-500/8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-blue-600 dark:text-blue-400"
                    >
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground/90 tracking-tight">Activity Timeline</h3>
                    <p className="mt-0.5 text-xs text-foreground/50 font-medium">
                      {logs.length} event{logs.length !== 1 ? "s" : ""} recorded
                    </p>
                  </div>
                </div>
                {logsLoading && (
                  <div className="relative h-6 w-6">
                    <div className="absolute inset-0 rounded-full border-3 border-blue-500/20 border-t-blue-500 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto p-6">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="relative mb-5">
                    <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-2xl opacity-20" />
                    <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center shadow-xl">
                      <svg
                        width="36"
                        height="36"
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
                  </div>
                  <p className="text-base text-foreground/40 font-bold mb-2">No activity recorded yet</p>
                  <p className="text-sm text-foreground/30">Agent actions will appear here in real-time</p>
                </div>
              ) : (
                <div className="relative space-y-4">
                  {/* Timeline line */}
                  <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-blue-500/20 via-violet-500/20 to-transparent" />
                  
                  {logs.map((log, index) => {
                    const isExpanded = expandedLog === log.id;
                    const category = log.type.split(".")[0];
                    const catStyle = eventCategoryStyles[category] ?? "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
                    const isFirst = index === 0;
                    
                    return (
                      <div key={log.id} className="relative pl-10">
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-3">
                          <div className={`h-6 w-6 rounded-full border-2 ${catStyle} bg-background shadow-lg flex items-center justify-center`}>
                            <div className="h-2 w-2 rounded-full bg-current" />
                          </div>
                          {isFirst && (
                            <div className="absolute inset-0 rounded-full bg-current animate-ping opacity-75" />
                          )}
                        </div>

                        <button
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                          className="w-full text-left group"
                        >
                          <div
                            className={`rounded-xl border-2 transition-all duration-300 ${
                              isExpanded
                                ? "bg-foreground/[0.04] border-foreground/30 shadow-2xl scale-[1.02]"
                                : "border-border hover:bg-foreground/[0.02] hover:border-foreground/20 hover:shadow-xl hover:scale-[1.01]"
                            }`}
                          >
                            <div className="flex items-center gap-3 px-4 py-4">
                              <span
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold border-2 ${catStyle} shadow-sm`}
                              >
                                {category}
                              </span>
                              <span className="flex-1 text-sm font-bold text-foreground/80 truncate">
                                {formatEventMessage(log)}
                              </span>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-foreground/40 tabular-nums font-mono font-medium">
                                  {timeAgo(log.createdAt)}
                                </span>
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={`text-foreground/30 transition-transform duration-300 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </div>
                            </div>
                            
                            {isExpanded && log.data && (
                              <div className="border-t border-border px-4 py-4 bg-foreground/[0.02] animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="rounded-lg bg-foreground/5 border border-border/50 p-3">
                                  <pre className="text-xs font-mono text-foreground/60 whitespace-pre-wrap break-all max-h-80 overflow-y-auto leading-relaxed">
                                    {JSON.stringify(log.data, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
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
