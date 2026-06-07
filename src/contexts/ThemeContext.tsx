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
