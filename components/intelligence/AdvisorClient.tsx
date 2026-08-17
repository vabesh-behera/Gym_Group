"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTED = [
  "Best offer for £10K in the next 4 weeks?",
  "Which club is most at risk from a new competitor opening?",
  "Best mechanic for filling off-peak capacity?",
  "Increase retention 10% for students — best campaign config?",
  "Which campaigns are cannibalising each other?",
  "Off-peak vs daytime pass — which drives better utilisation?",
];

export function AdvisorClient({ history }: { history: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(history);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "Something went wrong." }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-thin pb-4">
        {messages.length === 0 && (
          <div className="card flex items-start gap-3 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-dark">✨</div>
            <div>
              <p className="font-bold text-slate-900">PromoIQ AI Advisor</p>
              <p className="mt-1 text-sm text-slate-600">
                Hi — I&apos;m your PromoIQ AI Advisor. Ask me anything about your campaigns, budget, competitors, or club
                capacity. Try one of the questions below to get started.
              </p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-2xl rounded-xl px-4 py-3 text-sm whitespace-pre-wrap",
                m.role === "user" ? "bg-navy text-white" : "card text-slate-700",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="card px-4 py-3 text-sm text-muted">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mb-3">
        <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">Suggested questions</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={loading}
              className="rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-accent hover:text-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about campaigns, budget, competitors, or capacity…"
          className="flex-1 rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-accent-dark disabled:opacity-50"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
