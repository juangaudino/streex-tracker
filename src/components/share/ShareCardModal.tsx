import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ShareCard, { type ShareCardData, type ShareCardAspect } from "./ShareCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState } from "react";
import { exportNodeAsPng, shareNodeAsPng, copyNodeAsPng } from "@/lib/shareExport";
import { Download, Share2, Copy, ClipboardCopy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  card: ShareCardData;
}

const ASPECTS: { id: ShareCardAspect; label: string }[] = [
  { id: "9:16", label: "Story" },
  { id: "1:1", label: "Square" },
  { id: "16:9", label: "Wide" },
];

export default function ShareCardModal({ open, onOpenChange, card }: Props) {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"save" | "share" | "copy" | null>(null);
  const [aspect, setAspect] = useState<ShareCardAspect>("9:16");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        `${card.title}${card.subtitle ? ` — ${card.subtitle}` : ""}\n\n${card.body || ""}\n\n— Streex`
      );
      toast({ title: "Copied to clipboard." });
    } catch {
      toast({ title: "Copy failed.", variant: "destructive" });
    }
  }

  async function handleSave() {
    if (!cardRef.current) return;
    setBusy("save");
    const blob = await exportNodeAsPng(cardRef.current, `streex-${card.kind}.png`);
    setBusy(null);
    toast({ title: blob ? "Image saved." : "Save failed.", variant: blob ? "default" : "destructive" });
  }

  async function handleShare() {
    if (!cardRef.current) return;
    setBusy("share");
    const result = await shareNodeAsPng(cardRef.current, `streex-${card.kind}.png`, {
      title: card.title,
      text: card.subtitle,
    });
    setBusy(null);
    if (result === "shared") toast({ title: "Shared." });
    else if (result === "downloaded") toast({ title: "Image saved." });
    else toast({ title: "Share failed.", variant: "destructive" });
  }

  async function handleCopyImage() {
    if (!cardRef.current) return;
    setBusy("copy");
    const ok = await copyNodeAsPng(cardRef.current);
    setBusy(null);
    toast({
      title: ok ? "Image copied." : "Copy image not supported.",
      variant: ok ? "default" : "destructive",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-5 space-y-4">
        <DialogHeader>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Share Preview</p>
          <DialogTitle className="text-lg">A moment from your career</DialogTitle>
        </DialogHeader>

        {/* Aspect toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit mx-auto">
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAspect(a.id)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                aspect === a.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div ref={cardRef}>
          <ShareCard card={card} aspect={aspect} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleSave} disabled={!!busy}>
            <Download className="h-4 w-4 mr-1.5" />
            {busy === "save" ? "Saving…" : "Save Image"}
          </Button>
          <Button onClick={handleShare} disabled={!!busy}>
            <Share2 className="h-4 w-4 mr-1.5" />
            {busy === "share" ? "…" : "Share"}
          </Button>
        </div>
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <button
            onClick={handleCopyImage}
            disabled={!!busy}
            className="hover:text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <ClipboardCopy className="h-3 w-3" />
            {busy === "copy" ? "Copying…" : "Copy image"}
          </button>
          <span className="text-border">·</span>
          <button
            onClick={handleCopy}
            className="hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Copy className="h-3 w-3" /> Copy text
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}