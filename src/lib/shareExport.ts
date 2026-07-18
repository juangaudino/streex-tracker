import html2canvas from "html2canvas";

type ShareNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean;
  share?: (data?: ShareData) => Promise<void>;
};

type ClipboardWindow = Window & typeof globalThis & {
  ClipboardItem?: new (items: Record<string, Blob>) => ClipboardItem;
};

export interface RenderImageOptions {
  format?: "png" | "jpeg";
  quality?: number;
  backgroundColor?: string | null;
  scale?: number;
}

export async function renderNodeAsImage(
  node: HTMLElement,
  options: RenderImageOptions = {},
): Promise<Blob | null> {
  const format = options.format ?? "png";
  const canvas = await html2canvas(node, {
    backgroundColor: options.backgroundColor ?? null,
    scale: options.scale ?? 2,
    useCORS: true,
    logging: false,
  });
  return new Promise((resolve) => canvas.toBlob(
    resolve,
    format === "jpeg" ? "image/jpeg" : "image/png",
    format === "jpeg" ? options.quality ?? 0.94 : undefined,
  ));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportNodesAsJpegs(nodes: HTMLElement[], basename = "streex-driver-playbook"): Promise<number> {
  let exported = 0;
  for (const [index, node] of nodes.entries()) {
    const blob = await renderNodeAsImage(node, { format: "jpeg", quality: 0.94, backgroundColor: "#080A09", scale: 2 });
    if (!blob) continue;
    downloadBlob(blob, `${basename}-${index + 1}.jpg`);
    exported += 1;
  }
  return exported;
}

export async function shareNodesAsJpegs(nodes: HTMLElement[], basename = "streex-driver-playbook"): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const blobs = await Promise.all(nodes.map((node) => renderNodeAsImage(node, { format: "jpeg", quality: 0.94, backgroundColor: "#080A09", scale: 2 })));
    const files = blobs.flatMap((blob, index) => blob ? [new File([blob], `${basename}-${index + 1}.jpg`, { type: "image/jpeg" })] : []);
    if (!files.length) return "failed";
    const nav = navigator as ShareNavigator;
    if (nav.canShare?.({ files })) {
      await nav.share?.({ title: "STREEX Driver Playbook", files });
      return "shared";
    }
    files.forEach((file) => downloadBlob(file, file.name));
    return "downloaded";
  } catch {
    return "failed";
  }
}

export async function exportNodeAsPng(
  node: HTMLElement,
  filename = "streex-share.png",
): Promise<Blob | null> {
  const blob = await renderNodeAsImage(node);
  if (blob) downloadBlob(blob, filename);
  return blob;
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
