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
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) setError("Rate limit reached. Wait a moment and try again.");
        else if (res.status === 402) setError("AI credits exhausted. Add credits in workspace settings.");
        else if (res.status === 401) setError("Authentication issue. Please sign in again.");
        else setError(json?.error || "The assistant is unavailable right now.");
        return;
      }
      const reply: string = json?.text ?? "(empty response)";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-8rem)]">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Ask My Data</h1>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <FlaskConical className="h-3 w-3" /> V6.1 Prototype
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Chat with your earnings. Experimental — answers are based only on your recent tracked data.
        </p>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-border bg-card/40 p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Try a starter:</p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors"
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
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2">
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
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your earnings…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <p className="text-[10px] text-muted-foreground/70 text-center mt-2">
        Prototype · responses may be imperfect · data stays inside your account
      </p>
    </div>
  );
}