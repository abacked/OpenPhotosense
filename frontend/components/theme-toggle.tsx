"use client";

import { useEffect } from "react";

export function ThemeToggle() {
  useEffect(() => {
    const preferred = localStorage.theme === "dark" || (!localStorage.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", preferred);
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    localStorage.theme = next ? "dark" : "light";
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <button onClick={toggle} className="rounded-full border border-black/10 px-3 py-2 text-xs font-bold uppercase tracking-widest dark:border-white/15" aria-label="Toggle dark mode">
      Theme
    </button>
  );
}
