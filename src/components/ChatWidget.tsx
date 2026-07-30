"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import agentContent from "@/content/agent.json";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Phase = "industry-select" | "chat";
type EmailStatus = "idle" | "submitting" | "success" | "error";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("industry-select");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [terminal, setTerminal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading, notice]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || terminal) return;

    const history = [...messages, { role: "user" as const, content: trimmed }];
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setNotice(null);
    setLoading(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const data = await response.json();

      if (response.status === 429 || response.status === 503) {
        setNotice(data.error ?? agentContent.turnLimitMessage);
        setTerminal(true);
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

  function selectIndustry(label: string) {
    setPhase("chat");
    sendMessage(`Branche: ${label}`);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    sendMessage(input);
  }

  function handleRestart() {
    setPhase("industry-select");
    setMessages([]);
    setNotice(null);
    setTerminal(false);
    setInput("");
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    if (!consent || emailStatus === "submitting") return;
    setEmailStatus("submitting");
    try {
      const response = await fetch("/api/newsletter-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent }),
      });
      if (!response.ok) throw new Error("request-failed");
      setEmailStatus("success");
    } catch {
      setEmailStatus("error");
    }
  }

  return (
    <aside
      aria-label={agentContent.widgetLabel}
      className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6"
    >
      {open && (
        <div className="mb-4 flex h-[70vh] max-h-[620px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-md border border-ink-200 bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-ink-100 bg-ink-900 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">{agentContent.widgetLabel}</p>
              <p className="text-[11px] text-ink-300">{agentContent.widgetSubtitle}</p>
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
            {phase === "industry-select" && messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-ink-900">{agentContent.intro}</p>
                <div className="flex flex-col gap-2">
                  {agentContent.industries.map((industry) => (
                    <button
                      key={industry.id}
                      type="button"
                      onClick={() => selectIndustry(industry.label)}
                      className="rounded-full border border-ink-300 px-3 py-1.5 text-left text-xs text-ink-700 hover:border-accent-500 hover:text-accent-600"
                    >
                      {industry.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                <span className="sr-only">Der Scout tippt</span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" />
              </div>
            )}

            {notice && (
              <div className="space-y-2">
                <p role="alert" className="rounded-sm bg-accent-100 px-3 py-2 text-xs text-accent-700">
                  {notice}
                </p>
                {terminal && (
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="text-xs font-medium text-ink-900 underline underline-offset-2 hover:text-accent-600"
                  >
                    {agentContent.restartLabel}
                  </button>
                )}
              </div>
            )}
          </div>

          {phase === "chat" && !terminal && (
            <form onSubmit={handleSubmit} className="flex gap-2 border-t border-ink-100 p-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={agentContent.inputPlaceholder}
                disabled={loading}
                maxLength={300}
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
          )}

          {/* E-Mail-Capture: bewusst als eigenes Element außerhalb des Chat-Flows (requirements.md). */}
          <div className="border-t border-ink-100 px-4 py-2.5">
            {!emailOpen ? (
              <button
                type="button"
                onClick={() => setEmailOpen(true)}
                className="text-xs font-medium text-ink-700 underline underline-offset-2 hover:text-accent-600"
              >
                {agentContent.emailCapture.toggleLabel}
              </button>
            ) : emailStatus === "success" ? (
              <p className="text-xs text-ink-900">{agentContent.emailCapture.successMessage}</p>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-2">
                <p className="text-xs text-foreground-muted">{agentContent.emailCapture.body}</p>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={agentContent.emailCapture.emailPlaceholder}
                  className="w-full rounded-sm border border-ink-300 bg-surface px-3 py-1.5 text-xs text-ink-900 focus:border-ink-900 focus:outline-none"
                />
                <label className="flex items-start gap-2 text-[11px] text-foreground-muted">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  />
                  {agentContent.emailCapture.consentLabel}
                </label>
                {emailStatus === "error" && (
                  <p role="alert" className="text-[11px] text-accent-700">
                    {agentContent.emailCapture.errorMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={emailStatus === "submitting" || !consent}
                  className="rounded-sm bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-900 hover:bg-ink-200 disabled:opacity-50"
                >
                  {emailStatus === "submitting" ? "…" : agentContent.emailCapture.submitLabel}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "AI-Potenzial-Scout schließen" : "AI-Potenzial-Scout öffnen"}
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
