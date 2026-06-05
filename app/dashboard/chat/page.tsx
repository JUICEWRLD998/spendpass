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
    <div className="max-w-[800px] mx-auto px-6 py-8 flex flex-col h-[calc(100dvh-8rem)]">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Shopping Agent</h1>
        <p className="mt-0.5 text-[13px] text-foreground/40">
          Natural language shopping via Agent Auth — connect, approve, then search the catalog.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border border-border bg-card/50 p-4 space-y-4 min-h-0"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="h-10 w-10 rounded-lg bg-foreground/[0.04] flex items-center justify-center mb-4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-foreground/25"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-[13px] text-foreground/50 max-w-sm">
              Ask the agent to find products. On first request it will open device approval so you
              can grant scoped capabilities.
            </p>
            <div className="flex flex-wrap gap-2 mt-5 justify-center">
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
                  className="px-3 py-1.5 text-[12px] rounded-full border border-border hover:bg-foreground/[0.04] transition-colors cursor-pointer text-foreground/60"
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
              className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                message.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-foreground/[0.04] border border-border text-foreground/90"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3.5 py-2.5 bg-foreground/[0.04] border border-border">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/30 animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/30 animate-pulse [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/30 animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 px-3 py-2 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-500 text-[13px]">
          {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask the agent to find products..."
          disabled={isLoading}
          className="flex-1 px-3 py-2.5 rounded-lg bg-background border border-border placeholder:text-foreground/25 focus:border-foreground/20 focus:ring-1 focus:ring-foreground/[0.08] text-[13px] outline-none transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2.5 text-[13px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
        >
          Send
        </button>
      </form>
    </div>
  );
}
