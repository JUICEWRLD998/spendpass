"use client";

import { useRef, useEffect, useState } from "react";

const SUGGESTIONS = [
  "Find a USB-C hub under $40",
  "Show me all monitors",
  "What's in my cart?",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const approvalWindowRef = useRef<Window | null>(null);
  const lastApprovalUrlRef = useRef<string | null>(null);
  
  // Load messages from localStorage
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('chat-messages');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load messages:', e);
      }
    }
  }, []);

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat-messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    setError(null);
    localStorage.removeItem('chat-messages');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const expectsApproval =
      /\b(find|show|search|list|cart|buy|purchase|order|checkout|hub|monitor|cable|adapter|product)\b/i.test(
        input,
      );
    if (expectsApproval) {
      approvalWindowRef.current = window.open("", "_blank", "width=800,height=700");
      approvalWindowRef.current?.document.write(
        "<title>SpendPass Approval</title><body style=\"font-family:system-ui,sans-serif;padding:24px\">Waiting for approval link...</body>",
      );
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    const assistantId = (Date.now() + 1).toString();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      // Add empty assistant message
      setMessages(prev => [...prev, {
        id: assistantId,
        role: "assistant",
        content: "",
      }]);

      // Read the stream and parse text chunks
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Try to parse as text chunk (AI SDK format: "0:"content"\n")
          if (trimmed.startsWith('0:')) {
            try {
              const content = JSON.parse(trimmed.substring(2));
              assistantContent += content;
            } catch {
              // If not JSON, treat as plain text
              assistantContent += trimmed.substring(2);
            }
          } else {
            // Plain text streaming
            assistantContent += trimmed;
          }

          // Update the assistant message
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, content: assistantContent } : m
          ));
          
          const approvalMatch = assistantContent.match(
            /https?:\/\/[^\s)"]+\/device\/capabilities[^\s)"]*/,
          );
          if (approvalMatch && lastApprovalUrlRef.current !== approvalMatch[0]) {
            lastApprovalUrlRef.current = approvalMatch[0];
            if (approvalWindowRef.current && !approvalWindowRef.current.closed) {
              approvalWindowRef.current.location.href = approvalMatch[0];
              approvalWindowRef.current.focus();
            } else {
              approvalWindowRef.current = window.open(
                approvalMatch[0],
                "_blank",
                "width=800,height=700",
              );
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        assistantContent += buffer;
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: assistantContent } : m
        ));
      }

      // If no content received, check if we need to handle approval
      if (!assistantContent.trim()) {
        console.log("No response content received - AI may be processing tools");
        
        // Check if there's an approval URL in the streaming response metadata
        // The AI should tell the user about the approval link in its response
        setMessages(prev => prev.map(m =>
          m.id === assistantId 
            ? { ...m, content: "⏳ Processing your request..." } 
            : m
        ));
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setMessages(prev => prev.filter(m => m.id === assistantId));
    } finally {
      if (
        approvalWindowRef.current &&
        !approvalWindowRef.current.closed &&
        !lastApprovalUrlRef.current
      ) {
        approvalWindowRef.current.close();
      }
      approvalWindowRef.current = null;
      lastApprovalUrlRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8 flex flex-col h-[calc(100dvh-8rem)]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
            Shopping Agent
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Natural language shopping via Agent Auth — connect, approve, then search the catalog.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="px-4 py-2 text-sm font-medium rounded-lg border-2 border-border hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-800 transition-all text-foreground/70 hover:text-red-600 dark:hover:text-red-400"
          >
            Clear Chat
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border-2 border-border bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-900/50 dark:via-background dark:to-gray-900/50 p-5 space-y-4 min-h-0 shadow-xl"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-violet-600 rounded-3xl blur-2xl opacity-30 animate-pulse" />
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
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-base font-bold text-foreground/90 mb-2">Start a Conversation</h3>
            <p className="text-sm text-foreground/60 max-w-md mb-6 leading-relaxed">
              Ask the agent to find products. On first request it will open device approval so you
              can grant scoped capabilities.
            </p>
            <div className="flex flex-wrap gap-2.5 mt-2 justify-center max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSuggestionClick(s)}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border-2 border-border hover:bg-gradient-to-r hover:from-blue-50 hover:to-violet-50 dark:hover:from-blue-950/30 dark:hover:to-violet-950/30 hover:border-blue-200 dark:hover:border-blue-800/50 transition-all cursor-pointer text-foreground/70 hover:text-foreground hover:shadow-md"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                message.role === "user"
                  ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-blue-500/20"
                  : "bg-white dark:bg-gray-900/80 border-2 border-border text-foreground/90 shadow-gray-500/5"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-3 bg-white dark:bg-gray-900/80 border-2 border-border shadow-sm">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500/60 animate-pulse shadow-lg shadow-blue-500/30" />
                <span className="h-2 w-2 rounded-full bg-violet-500/60 animate-pulse [animation-delay:150ms] shadow-lg shadow-violet-500/30" />
                <span className="h-2 w-2 rounded-full bg-blue-500/60 animate-pulse [animation-delay:300ms] shadow-lg shadow-blue-500/30" />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 px-4 py-3 rounded-xl border-2 border-red-300 dark:border-red-900/50 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium shadow-lg shadow-red-500/10">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent to find products..."
          disabled={isLoading}
          className="flex-1 px-4 py-3 rounded-xl bg-background border-2 border-border placeholder:text-foreground/35 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-sm outline-none transition-all disabled:opacity-50 shadow-sm"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98] shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
