import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ShareCard, { type ShareCardData } from "./ShareCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState } from "react";
import { exportNodeAsPng, shareNodeAsPng } from "@/lib/shareExport";
import { Download, Share2, Copy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  card: ShareCardData;
}

export default function ShareCardModal({ open, onOpenChange, card }: Props) {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"save" | "share" | null>(null);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-5 space-y-4">
        <DialogHeader>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Share Preview</p>
          <DialogTitle className="text-lg">A moment from your career</DialogTitle>
        </DialogHeader>
        <div ref={cardRef}>
          <ShareCard card={card} />
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
        <button
          onClick={handleCopy}
          className="w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
        >
          <Copy className="h-3 w-3" /> Copy text instead
        </button>
      </DialogContent>
    </Dialog>
  );
}