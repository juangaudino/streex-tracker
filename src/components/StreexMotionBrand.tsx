import streexLogo from "@/assets/streex-logo.png";
import { cn } from "@/lib/utils";

type MotionDensity = "splash" | "auth";

interface StreexMotionBackgroundProps {
  density?: MotionDensity;
}

interface AnimatedStreexLogoProps {
  variant?: MotionDensity;
  className?: string;
}

export function StreexMotionBackground({ density = "auth" }: StreexMotionBackgroundProps) {
  const lines = density === "splash" ? 18 : 12;

  return (
    <div className={cn("streex-motion-background", `streex-motion-background-${density}`)} aria-hidden="true">
      <div className="streex-motion-vignette" />
      <div className="streex-speed-field">
        {Array.from({ length: lines }).map((_, index) => (
          <span key={index} className="streex-speed-line" />
        ))}
      </div>
    </div>
  );
}

export function AnimatedStreexLogo({ variant = "auth", className }: AnimatedStreexLogoProps) {
  return (
    <div className={cn("streex-motion-logo-wrap", `streex-motion-logo-${variant}`, className)}>
      <span className="streex-logo-glow" aria-hidden="true" />
      <span className="streex-motion-logo-crop">
        <img
          src={streexLogo}
          alt="Streex"
          className="streex-motion-logo-img"
          draggable={false}
        />
      </span>
      <span className="streex-logo-underline" aria-hidden="true" />
    </div>
  );
}
