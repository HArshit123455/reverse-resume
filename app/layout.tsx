import type { Metadata, Viewport } from "next";
import { Mona_Sans, Geist_Mono } from "next/font/google";
import { Header } from "@/components/header";
import { Chrome } from "@/components/chrome";
import "./globals.css";

const mona = Mona_Sans({
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  display: "swap",
  variable: "--font-mona",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Harshit Sindhu — Reverse Resume",
  description: "Ask my work anything. Every claim cites real code.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

const NO_FLASH_SCRIPT = `(function () {
  try {
    var t = localStorage.getItem("rr_theme");
    // Light unless the visitor has chosen dark with the toggle.
    var theme = t === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (_) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mona.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="bg-bg text-fg">
        <Chrome>
          <Header />
          {children}
        </Chrome>
      </body>
    </html>
  );
}
