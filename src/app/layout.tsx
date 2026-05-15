import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Instrument_Sans } from "next/font/google";

import { LanguageProvider } from "@/components/language-provider";
import { normalizeCommandCenterLanguage } from "@/lib/language";

import "./globals.css";

const font = Instrument_Sans({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Command Center — Partenaire.io",
  description: "AI-powered operations hub",
  manifest: "/manifest.json",
  themeColor: "#6366f1",
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
        className={`${font.className} min-h-screen overflow-x-hidden bg-[#0a0a0f] text-white antialiased selection:bg-indigo-500/30 selection:text-white`}
      >
        <LanguageProvider initialLanguage={initialLanguage}>
          <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.07),transparent_30%),radial-gradient(circle_at_85%_0%,rgba(14,165,233,0.04),transparent_22%)]">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
