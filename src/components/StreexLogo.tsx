import streexLogoDark from "@/assets/streex-logo-dark.png";
import streexLogoLight from "@/assets/streex-logo-light.png";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface StreexLogoProps {
  className?: string;
  force?: "dark" | "light";
}

export default function StreexLogo({ className, force }: StreexLogoProps) {
  const { isDark } = useTheme();
  const logo = (force ?? (isDark ? "dark" : "light")) === "dark" ? streexLogoDark : streexLogoLight;

  return (
    <img
      src={logo}
      alt="Streex"
      className={cn("w-auto object-contain select-none", className)}
      draggable={false}
    />
  );
}
