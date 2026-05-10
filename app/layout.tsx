import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Harshit Sindhu — Reverse Resume",
  description: "Ask my work anything.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
