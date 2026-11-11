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
    <div className="flex gap-3 text-[13px]" aria-label="Color theme">
      <button type="button" onClick={() => select("light")} className="underline decoration-1 underline-offset-4 dark:text-muted dark:no-underline dark:hover:text-ink">Light</button>
      <button type="button" onClick={() => select("dark")} className="text-muted hover:text-ink dark:text-ink dark:underline dark:decoration-1 dark:underline-offset-4">Dark</button>
    </div>
  );
}
