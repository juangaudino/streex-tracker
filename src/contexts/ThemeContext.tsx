import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "classic" | "rpg";
export type ClassicVariant = "system" | "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  classicVariant: ClassicVariant;
  setMode: (m: ThemeMode) => void;
  setClassicVariant: (v: ClassicVariant) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "classic",
  classicVariant: "system",
  setMode: () => {},
  setClassicVariant: () => {},
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
  const [systemDark, setSystemDark] = useState(getSystemDark);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemDark(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const isDark =
    mode === "rpg"
      ? true
      : classicVariant === "system"
      ? systemDark
      : classicVariant === "dark";

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove("light", "dark", "rpg");
    if (mode === "rpg") {
      root.classList.add("dark", "rpg");
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

  return (
    <ThemeContext.Provider value={{ mode, classicVariant, setMode, setClassicVariant, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}