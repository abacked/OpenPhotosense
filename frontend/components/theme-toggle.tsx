"use client";

import { SegmentedControl } from "glisse";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme; // glisse reads data-theme
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const preferred: Theme = localStorage.theme === "dark" || (!localStorage.theme && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    apply(preferred);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage only exists after hydration
    setTheme(preferred);
  }, []);

  function select(next: string) {
    const value = next as Theme;
    localStorage.setItem("theme", value);
    apply(value);
    setTheme(value);
  }

  return (
    <SegmentedControl
      aria-label="Color theme"
      items={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
      value={theme}
      onValueChange={select}
    />
  );
}
