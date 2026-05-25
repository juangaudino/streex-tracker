import html2canvas from "html2canvas";

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
    const nav: any = navigator;
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