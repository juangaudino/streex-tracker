import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, Loader2, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type ChatMessage = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What was my best week?",
  "What is my average weekly income?",
  "Which week had the strongest performance?",
  "What achievements have I unlocked recently?",
  "What pattern do you see in my recent weeks?",
];

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-my-data`;

function extractStreamDelta(payload: string): string {
  try {
    const parsed = JSON.parse(payload);
    return parsed?.choices?.[0]?.delta?.content ??
      parsed?.choices?.[0]?.message?.content ??
      parsed?.text ??
      "";
  } catch {
    return "";
  }
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setError(null);
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("You're signed out. Please sign in again.");
        return;
      }
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (res.status === 429) setError("Rate limit reached. Wait a moment and try again.");
        else if (res.status === 402) setError("AI credits exhausted. Add credits in workspace settings.");
        else if (res.status === 401) setError("Authentication issue. Please sign in again.");
        else setError(json?.error || "The assistant is unavailable right now.");
        return;
      }

      if (res.body && res.headers.get("Content-Type")?.includes("text/event-stream")) {
        const assistantIndex = next.length;
        setMessages([...next, { role: "assistant", content: "" }]);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullReply = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const event of events) {
            for (const line of event.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              const delta = extractStreamDelta(payload);
              if (!delta) continue;
              fullReply += delta;
              setMessages((current) =>
                current.map((message, index) =>
                  index === assistantIndex
                    ? { ...message, content: fullReply }
                    : message,
                ),
              );
            }
          }
        }

        if (!fullReply) {
          setMessages((current) => current.filter((_, index) => index !== assistantIndex));
          setError("The assistant returned an empty response. Please try again.");
        }
        return;
      }

      const json = await res.json().catch(() => ({}));
      const reply: string = json?.text ?? "(empty response)";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-8.5rem)] max-w-3xl min-h-0 flex-col px-3 py-3 sm:h-[calc(100vh-8rem)] sm:px-4 sm:py-6">
      <header className="mb-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <h1 className="min-w-0 text-xl font-semibold leading-tight">Ask My Data</h1>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <FlaskConical className="h-3 w-3" /> v5.3B.3 Beta
          </span>
        </div>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">
          Chat with your earnings. Beta — answers are based only on your Streex data.
        </p>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-card/40 p-3 sm:space-y-4 sm:p-4"
      >
        {messages.length === 0 && (
          <div className="space-y-3 pb-2">
            <p className="text-sm text-muted-foreground">Try a starter:</p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`min-w-0 max-w-[88%] break-words rounded-2xl px-3 py-2.5 text-sm sm:max-w-[85%] sm:px-4 ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex shrink-0 gap-2 pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your earnings…"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          disabled={loading}
        />
        <Button type="submit" className="shrink-0" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-2 shrink-0 pb-[env(safe-area-inset-bottom)] text-center text-[10px] text-muted-foreground/70">
        Beta · responses may be imperfect · data stays inside your account
      </p>
    </div>
  );
}
