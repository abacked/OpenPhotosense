import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenPhotosense — Flash safety scanner",
  description: "Open-source video analysis for potential photosensitive accessibility hazards.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-mist font-sans text-ink antialiased dark:bg-[#090d12] dark:text-white">
        {children}
      </body>
    </html>
  );
}
