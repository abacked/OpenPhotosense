"use client";

import { useEffect } from "react";

export function ThemeToggle() {
  useEffect(() => {
    const preferred = localStorage.theme === "dark" || (!localStorage.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", preferred);
  }, []);

  function select(next: "light" | "dark") {
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <div className="flex rounded-full border border-black/10 bg-black/[.03] p-1 text-[11px] font-bold dark:border-white/15 dark:bg-white/[.05] sm:text-xs" aria-label="Color theme">
      <button type="button" onClick={() => select("light")} className="rounded-full bg-white px-2.5 py-1.5 text-ink shadow-sm transition dark:bg-transparent dark:text-inherit dark:shadow-none dark:opacity-50 sm:px-3">Light</button>
      <button type="button" onClick={() => select("dark")} className="rounded-full px-2.5 py-1.5 opacity-50 transition dark:bg-white dark:text-ink dark:opacity-100 dark:shadow-sm sm:px-3">Dark</button>
    </div>
  );
}
