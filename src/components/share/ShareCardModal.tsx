import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ShareCard, { type ShareCardData } from "./ShareCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  card: ShareCardData;
}

export default function ShareCardModal({ open, onOpenChange, card }: Props) {
  const { toast } = useToast();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-5 space-y-4">
        <DialogHeader>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Share Preview</p>
          <DialogTitle className="text-lg">A moment from your career</DialogTitle>
        </DialogHeader>
        <ShareCard card={card} />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="flex-1" onClick={handleCopy}>
            Copy Text
          </Button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground/60">
          Image export coming soon.
        </p>
      </DialogContent>
    </Dialog>
  );
}