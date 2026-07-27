"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import agentContent from "@/content/agent.json";

type Message = {
  role: "user" | "assistant";
  content: string;
  isGreeting?: boolean;
};

const initialMessages: Message[] = [
  { role: "assistant", content: agentContent.greeting, isGreeting: true },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const history = [...messages.filter((m) => !m.isGreeting), { role: "user" as const, content: trimmed }];
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setNotice(null);
    setLoading(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setNotice(data.error ?? agentContent.rateLimitMessage);
        return;
      }
      if (!response.ok) {
        setNotice(data.error ?? agentContent.errorMessage);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setNotice(agentContent.errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    sendMessage(input);
  }

  const showChips = messages.every((m) => m.isGreeting);

  return (
    <aside
      aria-label={agentContent.widgetLabel}
      className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6"
    >
      {open && (
        <div className="mb-4 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-md border border-ink-200 bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-ink-100 bg-ink-900 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">{agentContent.widgetLabel}</p>
              <p className="text-[11px] text-ink-300">KI-gestützter Demo-Agent</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Chat schließen"
              className="rounded-sm p-1 text-ink-200 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p className="border-b border-ink-100 bg-ink-50 px-4 py-2 text-[11px] text-foreground-muted">
            {agentContent.disclaimer}
          </p>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-sm px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-ink-900 text-white"
                    : "bg-ink-100 text-ink-900"
                }`}
              >
                {message.content}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-1 rounded-sm bg-ink-100 px-3 py-2 text-sm text-foreground-muted">
                <span className="sr-only">Der Agent tippt</span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" />
              </div>
            )}

            {notice && (
              <p role="alert" className="rounded-sm bg-accent-100 px-3 py-2 text-xs text-accent-700">
                {notice}
              </p>
            )}

            {showChips && (
              <div className="flex flex-col gap-2 pt-2">
                {agentContent.suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => sendMessage(question)}
                    className="rounded-full border border-ink-300 px-3 py-1.5 text-left text-xs text-ink-700 hover:border-accent-500 hover:text-accent-600"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-ink-100 p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={agentContent.inputPlaceholder}
              disabled={loading}
              className="flex-1 rounded-sm border border-ink-300 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-ink-900 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || input.trim().length === 0}
              className="rounded-sm bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-800 disabled:opacity-50"
            >
              Senden
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Demo-Agent schließen" : "Demo-Agent öffnen"}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink-900 text-white shadow-lg transition-transform hover:scale-105"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <path
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </aside>
  );
}
