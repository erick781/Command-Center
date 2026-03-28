"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Archive, ArrowRight, Layers3, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Nav } from "@/components/nav";
import { useLanguage } from "@/components/language-provider";

const copy = {
  en: {
    badge: "Legacy archive",
    cards: [
      {
        description: "This is now the default path for strategies, reports, and new deliverables.",
        href: "/new",
        title: "Go to New",
      },
      {
        description: "Client context, memory, uploads, connectors, and history now live here.",
        href: "/clients",
        title: "Go to Clients",
      },
      {
        description: "Automations, repo radar, AI dev queue, and operational visibility stay here.",
        href: "/ops",
        title: "Go to Ops",
      },
    ],
    intro:
      "The old frontend surfaces were creating too many entry points. They are now archived so the main product can stay focused on client -> task -> questions -> output.",
    movedFrom: "You came from",
    replacements: "Recommended replacements",
    title: "Legacy screens archived",
  },
  fr: {
    badge: "Archive legacy",
    cards: [
      {
        description: "C’est maintenant le chemin par défaut pour les stratégies, rapports et nouveaux livrables.",
        href: "/new",
        title: "Aller dans Nouveau",
      },
      {
        description: "Le contexte client, la mémoire, les uploads, les connecteurs et l’historique vivent ici maintenant.",
        href: "/clients",
        title: "Aller dans Clients",
      },
      {
        description: "Automations, repo radar, queue AI dev et visibilité opérationnelle restent ici.",
        href: "/ops",
        title: "Aller dans Ops",
      },
    ],
    intro:
      "Les anciennes surfaces frontend créaient trop de portes d’entrée. Elles sont maintenant archivées pour garder le produit principal centré sur client -> tâche -> questions -> output.",
    movedFrom: "Tu viens de",
    replacements: "Remplacements recommandés",
    title: "Écrans legacy archivés",
  },
} as const;

const labelMap = {
  hub: "Hub",
  tracker: "Tracker",
} as const;

const shellFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export default function LegacyArchivePage() {
  const { language } = useLanguage();
  const labels = copy[language];
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const fromLabel = useMemo(() => {
    if (!from) return null;
    return labelMap[from as keyof typeof labelMap] ?? from;
  }, [from]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <Nav />
      <main
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "42px 20px 80px",
          color: "white",
          fontFamily: shellFont,
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(232,145,45,0.08)",
              border: "1px solid rgba(232,145,45,0.18)",
              color: "#f6c978",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <Archive size={14} />
            {labels.badge}
          </div>

          <h1
            style={{
              marginTop: 18,
              fontSize: 40,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              fontWeight: 800,
            }}
          >
            {labels.title}
          </h1>

          <p
            style={{
              marginTop: 14,
              color: "rgba(255,255,255,0.58)",
              lineHeight: 1.7,
              fontSize: 15,
              maxWidth: 720,
            }}
          >
            {labels.intro}
          </p>

          {fromLabel ? (
            <div
              style={{
                marginTop: 18,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                padding: "12px 14px",
                color: "rgba(255,255,255,0.78)",
                fontSize: 14,
              }}
            >
              <Layers3 size={16} color="#f6c978" />
              <span>
                {labels.movedFrom} <strong>{fromLabel}</strong>
              </span>
            </div>
          ) : null}
        </div>

        <section style={{ marginTop: 34 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#f6c978",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <Sparkles size={16} />
            {labels.replacements}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            {labels.cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                style={{
                  textDecoration: "none",
                  color: "white",
                  borderRadius: 24,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{card.title}</div>
                  <ArrowRight size={18} color="#f6c978" />
                </div>
                <div
                  style={{
                    marginTop: 10,
                    color: "rgba(255,255,255,0.54)",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  {card.description}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
