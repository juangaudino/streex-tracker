import { useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { submitFeedback, type FeedbackType } from "@/lib/adminOps";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  userEmail?: string | null;
}

export default function FeedbackDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
}: FeedbackDialogProps) {
  const { toast } = useToast();
  const [type, setType] = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (!userId || !message.trim()) return;
    try {
      setSubmitting(true);
      await submitFeedback({ type, message, userId, userEmail });
      setMessage("");
      setType("suggestion");
      onOpenChange(false);
      toast({ title: "Feedback sent." });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Feedback failed.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-background/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </p>
            <h2 className="text-xl font-bold">Send Feedback</h2>
            <p className="text-sm text-muted-foreground">
              Share a suggestion, bug report, or general note. Your account is attached automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close feedback"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</label>
          <Select value={type} onValueChange={(value) => setType(value as FeedbackType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[95]">
              <SelectItem value="suggestion">Suggestion</SelectItem>
              <SelectItem value="bug">Bug report</SelectItem>
              <SelectItem value="general">General feedback</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Message</label>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="What should Streex know?"
            className="min-h-32 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={handleSubmit} disabled={!message.trim() || submitting}>
            <Send className="h-4 w-4 mr-1" />
            {submitting ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
