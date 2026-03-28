import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Montserrat } from "next/font/google";

import { LanguageProvider } from "@/components/language-provider";
import { normalizeCommandCenterLanguage } from "@/lib/language";

import "./globals.css";

const font = Montserrat({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Command Center — Partenaire.io",
  description: "AI-powered operations hub",
  manifest: "/manifest.json",
  themeColor: "#E8912D",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Partenaire.io",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({
  children,
}: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLanguage = normalizeCommandCenterLanguage(cookieStore.get("cc_lang")?.value);

  return (
    <html lang={initialLanguage} className="dark scroll-smooth">
      <body
        className={`${font.className} min-h-screen overflow-x-hidden bg-[#0f0f12] text-white antialiased selection:bg-[#E8912D]/30 selection:text-white`}
      >
        <LanguageProvider initialLanguage={initialLanguage}>
          <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(232,145,45,0.08),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.05),transparent_18%)]">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
