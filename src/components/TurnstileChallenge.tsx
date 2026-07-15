import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = "cloudflare-turnstile";
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

interface TurnstileChallengeProps {
  onToken: (token: string | null) => void;
}

export function isTurnstileEnabled() {
  return Boolean(SITE_KEY);
}

export default function TurnstileChallenge({ onToken }: TurnstileChallengeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: "auto",
        size: "flexible",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    };

    const script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (script) {
      script.addEventListener("load", render, { once: true });
      render();
    } else {
      const next = document.createElement("script");
      next.id = SCRIPT_ID;
      next.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      next.async = true;
      next.defer = true;
      next.addEventListener("load", render, { once: true });
      document.head.appendChild(next);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
      onToken(null);
    };
  }, [onToken]);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="min-h-[65px]" aria-label="Security verification" />;
}
