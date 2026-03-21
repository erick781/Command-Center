import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const font = Montserrat({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Command Center — Partenaire.io",
  description: "AI-powered operations hub",
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark scroll-smooth">
      <body
        className={`${font.className} min-h-screen overflow-x-hidden bg-[#0f0f12] text-white antialiased selection:bg-[#E8912D]/30 selection:text-white`}
      >
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(232,145,45,0.08),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.05),transparent_18%)]">
          {children}
        </div>
      </body>
    </html>
  );
}
