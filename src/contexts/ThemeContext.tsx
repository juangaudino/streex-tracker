import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "classic" | "signature" | "velocity" | "rpg" | "night-drive";
export type ClassicVariant = "system" | "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  classicVariant: ClassicVariant;
  pulseMode: boolean;
  setMode: (m: ThemeMode) => void;
  setClassicVariant: (v: ClassicVariant) => void;
  setPulseMode: (enabled: boolean) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "classic",
  classicVariant: "system",
  pulseMode: false,
  setMode: () => {},
  setClassicVariant: () => {},
  setPulseMode: () => {},
  isDark: true,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function hslToHex(hslValue: string) {
  const parts = hslValue.trim().split(/\s+/).map((part) => Number.parseFloat(part));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return "#050605";

  const [h, sRaw, lRaw] = parts;
  const s = sRaw / 100;
  const l = lRaw / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hue = ((h % 360) + 360) % 360;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - chroma / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) [r, g, b] = [chroma, x, 0];
  else if (hue < 120) [r, g, b] = [x, chroma, 0];
  else if (hue < 180) [r, g, b] = [0, chroma, x];
  else if (hue < 240) [r, g, b] = [0, x, chroma];
  else if (hue < 300) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];

  return [r, g, b]
    .map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0"))
    .join("")
    .replace(/^/, "#");
}

function updateThemeColorMeta() {
  const root = document.documentElement;
  const background = getComputedStyle(root).getPropertyValue("--background");
  const color = hslToHex(background);
  let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  if (!themeColor) {
    themeColor = document.createElement("meta");
    themeColor.name = "theme-color";
    document.head.appendChild(themeColor);
  }

  themeColor.content = color;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem("streex_theme_mode") as ThemeMode) || "classic";
  });
  const [classicVariant, setClassicVariantState] = useState<ClassicVariant>(() => {
    return (localStorage.getItem("streex_classic_variant") as ClassicVariant) || "system";
  });
  const [pulseMode, setPulseModeState] = useState(() => {
    return localStorage.getItem("streex_pulse_mode") === "true";
  });
  const [systemDark, setSystemDark] = useState(getSystemDark);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemDark(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const isDark =
    mode === "rpg" || mode === "night-drive" || mode === "signature" || mode === "velocity"
      ? true
      : classicVariant === "system"
      ? systemDark
      : classicVariant === "dark";

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove("light", "dark", "rpg", "night-drive", "signature", "velocity");
    if (mode === "rpg") {
      root.classList.add("dark", "rpg");
    } else if (mode === "night-drive") {
      root.classList.add("dark", "night-drive");
    } else if (mode === "signature") {
      root.classList.add("dark", "signature");
    } else if (mode === "velocity") {
      root.classList.add("dark", "velocity");
    } else {
      root.classList.add(isDark ? "dark" : "light");
    }
    requestAnimationFrame(updateThemeColorMeta);
  }, [mode, isDark]);

  function setMode(m: ThemeMode) {
    setModeState(m);
    localStorage.setItem("streex_theme_mode", m);
  }

  function setClassicVariant(v: ClassicVariant) {
    setClassicVariantState(v);
    localStorage.setItem("streex_classic_variant", v);
  }

  function setPulseMode(enabled: boolean) {
    setPulseModeState(enabled);
    localStorage.setItem("streex_pulse_mode", enabled ? "true" : "false");
  }

  return (
    <ThemeContext.Provider value={{ mode, classicVariant, pulseMode, setMode, setClassicVariant, setPulseMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
