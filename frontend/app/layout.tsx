import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "OpenPhotosense — Flash safety scanner",
  description: "Open-source video analysis for potential photosensitive accessibility hazards.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-paper font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
