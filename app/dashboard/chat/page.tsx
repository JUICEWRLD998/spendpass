"use client";

import { useChat } from "ai/react";
import { useRef, useEffect } from "react";

const SUGGESTIONS = [
  "Find a USB-C hub under $40",
  "Show me all monitors",
  "What's in my cart?",
];

export default function ChatPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8 flex flex-col h-[calc(100dvh-8rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
          Shopping Agent
        </h1>
        <p className="mt-2 text-sm text-foreground/60">
          Natural language shopping via Agent Auth — connect, approve, then search the catalog.
        </p>
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
                  onClick={() => {
                    const event = {
                      target: { value: s },
                    } as React.ChangeEvent<HTMLInputElement>;
                    handleInputChange(event);
                  }}
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
          {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 flex gap-3">
        <input
          value={input}
          onChange={handleInputChange}
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
