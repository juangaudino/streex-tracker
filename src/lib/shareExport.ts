import html2canvas from "html2canvas";

type ShareNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean;
  share?: (data?: ShareData) => Promise<void>;
};

type ClipboardWindow = Window & typeof globalThis & {
  ClipboardItem?: new (items: Record<string, Blob>) => ClipboardItem;
};

export async function exportNodeAsPng(
  node: HTMLElement,
  filename = "streex-share.png",
): Promise<Blob | null> {
  const canvas = await html2canvas(node, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(null);
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve(blob);
    }, "image/png");
  });
}

export async function shareNodeAsPng(
  node: HTMLElement,
  filename = "streex-share.png",
  shareData: { title?: string; text?: string } = {},
): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const canvas = await html2canvas(node, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!blob) return "failed";
    const file = new File([blob], filename, { type: "image/png" });
    const nav = navigator as ShareNavigator;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ ...shareData, files: [file] });
      return "shared";
    }
    // Fallback to download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
  } catch {
    return "failed";
  }
}

/**
 * Copy a rendered node to the clipboard as a PNG image.
 * Returns false when the browser does not support clipboard image writes.
 */
export async function copyNodeAsPng(node: HTMLElement): Promise<boolean> {
  try {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    const nav = navigator as ShareNavigator;
    const clipboardWindow = window as ClipboardWindow;
    if (!nav.clipboard || typeof clipboardWindow.ClipboardItem === "undefined") {
      return false;
    }
    const canvas = await html2canvas(node, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!blob) return false;
    const item = new clipboardWindow.ClipboardItem({ "image/png": blob });
    await nav.clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}
