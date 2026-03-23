"use client";

import { useEffect, useMemo, useState, useDeferredValue, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Target, TrendingUp, Users, Activity, MessageSquare,
  ChevronRight, Check, Sparkles, LoaderCircle, FileDown, AlertCircle, Eye, FileText,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { mdToHtml, buildPrintableHtml } from "@/lib/render-deliverable";
import type { StrategySeedClient } from "@/lib/strategy-schema";

/* ── Design tokens ── */
const C = {
  bg: "#0a0a0f",
  card: "#12121a",
  cardHover: "rgba(232,145,45,0.3)",
  orange: "#E8912D",
  orangeLight: "#f6c978",
  text: "rgba(255,255,255,0.75)",
  textMuted: "rgba(255,255,255,0.45)",
  textDim: "rgba(255,255,255,0.25)",
  border: "rgba(255,255,255,0.06)",
} as const;

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/* ── Step definitions ── */
type StepId = "client" | "objectif" | "detail" | "offre" | "audience" | "contexte" | "summary";
const ALL_STEPS: StepId[] = ["client", "objectif", "detail", "offre", "audience", "contexte", "summary"];
const STEP_LABELS: Record<StepId, string> = {
  client: "Client",
  objectif: "Objectif",
  detail: "Détails",
  offre: "Offre",
  audience: "Audience",
  contexte: "Contexte",
  summary: "Résumé",
};

/* ── Objective options ── */
type ObjectiveKey = "ventes" | "leads" | "scale" | "diagnostic" | "autre";
const OBJECTIVES: { key: ObjectiveKey; icon: typeof Target; title: string; desc: string }[] = [
  { key: "ventes", icon: TrendingUp, title: "Ventes", desc: "Augmenter le chiffre d'affaires et le ROAS" },
  { key: "leads", icon: Users, title: "Leads", desc: "Générer plus de prospects qualifiés" },
  { key: "scale", icon: Activity, title: "Scale", desc: "Passer au niveau supérieur de dépense" },
  { key: "diagnostic", icon: AlertCircle, title: "Diagnostic", desc: "Identifier les problèmes et optimiser" },
  { key: "autre", icon: MessageSquare, title: "Autre", desc: "Objectif personnalisé" },
];

const HORIZONS = ["30 jours", "60 jours", "90 jours"] as const;
const BUDGETS = ["< 5K", "5-10K", "10-25K", "25K+"] as const;

/* ── Framer variants ── */
const pageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};
const pageTrans = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const };

/* ── Reusable components ── */
function ProgressBar({ steps, current }: { steps: StepId[]; current: number }) {
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;
  return (
    <div style={{ marginBottom: 32 }}>
      {/* thin bar */}
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${C.orange}, ${C.orangeLight})` }}
        />
      </div>
      {/* step dots */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: active ? 28 : 8, height: 8, borderRadius: 4,
                background: done ? C.orange : active ? C.orange : "rgba(255,255,255,0.08)",
                transition: "all 0.3s ease",
              }} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
                color: active ? C.orangeLight : done ? C.textMuted : C.textDim, fontFamily: font,
              }}>{STEP_LABELS[s]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContextChip({ client }: { client: StrategySeedClient | null }) {
  if (!client) return null;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px",
      borderRadius: 20, background: "rgba(232,145,45,0.08)", border: "1px solid rgba(232,145,45,0.2)",
      fontSize: 12, fontWeight: 600, color: C.orangeLight, fontFamily: font,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: 3, background: C.orange }} />
      {client.name}{client.industry ? ` · ${client.industry}` : ""}
    </div>
  );
}

function QuestionTitle({ text, highlight }: { text: string; highlight: string }) {
  const parts = text.split(new RegExp(`(${highlight})`, "i"));
  return (
    <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontFamily: font, lineHeight: 1.3, marginBottom: 8, letterSpacing: "-0.02em" }}>
      {parts.map((p, i) =>
        p.toLowerCase() === highlight.toLowerCase()
          ? <span key={i} style={{ color: C.orange }}>{p}</span>
          : <span key={i}>{p}</span>
      )}
    </h2>
  );
}

function OptionCard({ selected, icon: Icon, title, desc, onClick }: {
  selected: boolean; icon: typeof Target; title: string; desc: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 16, width: "100%",
      padding: "18px 20px", borderRadius: 16, cursor: "pointer",
      background: selected ? "rgba(232,145,45,0.08)" : C.card,
      border: `1.5px solid ${selected ? "rgba(232,145,45,0.5)" : "transparent"}`,
      transition: "all 0.2s ease", textAlign: "left", fontFamily: font,
    }}
    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = C.cardHover; }}
    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = "transparent"; }}
    >
      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: selected ? "rgba(232,145,45,0.15)" : "rgba(255,255,255,0.04)",
      }}>
        <Icon size={18} color={selected ? C.orange : "rgba(255,255,255,0.35)"} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: selected ? "#fff" : "rgba(255,255,255,0.8)" }}>{title}</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{
        width: 20, height: 20, borderRadius: 10, flexShrink: 0,
        border: `2px solid ${selected ? C.orange : "rgba(255,255,255,0.12)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: selected ? C.orange : "transparent",
      }}>
        {selected && <Check size={12} color="#fff" />}
      </div>
    </button>
  );
}

function PillSelect({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {options.map((opt) => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          padding: "10px 22px", borderRadius: 12, cursor: "pointer", fontFamily: font,
          fontSize: 14, fontWeight: 600,
          background: value === opt ? "rgba(232,145,45,0.12)" : C.card,
          border: `1.5px solid ${value === opt ? "rgba(232,145,45,0.5)" : "transparent"}`,
          color: value === opt ? C.orangeLight : C.text,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => { if (value !== opt) e.currentTarget.style.borderColor = C.cardHover; }}
        onMouseLeave={(e) => { if (value !== opt) e.currentTarget.style.borderColor = "transparent"; }}
        >{opt}</button>
      ))}
    </div>
  );
}

function CleanTextarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      style={{
        width: "100%", padding: "16px 20px", borderRadius: 16, resize: "vertical",
        background: C.card, border: `1.5px solid ${C.border}`, color: "#fff",
        fontSize: 14, fontFamily: font, lineHeight: 1.6, outline: "none",
        transition: "border-color 0.2s ease",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(232,145,45,0.4)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
    />
  );
}

function SummaryRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "14px 0", borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: font }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: font }}>{value || "—"}</span>
        {onEdit && (
          <button onClick={onEdit} style={{
            fontSize: 11, color: C.orange, background: "none", border: "none",
            cursor: "pointer", fontFamily: font, fontWeight: 600,
          }}>Modifier</button>
        )}
      </div>
    </div>
  );
}

function SourceBadge({ connected, label }: { connected: boolean; label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
      borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: font,
      background: connected ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
      color: connected ? "#4ade80" : C.textDim,
      border: `1px solid ${connected ? "rgba(34,197,94,0.2)" : C.border}`,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: 3, background: connected ? "#4ade80" : "rgba(255,255,255,0.15)" }} />
      {label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
function PhaseCard({ label, accent, html }: { label: string; accent: string; html: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${C.border}`, background: C.card, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
          padding: "16px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: font,
        }}
      >
        <span style={{
          display: "inline-flex", padding: "3px 10px", borderRadius: 6,
          fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
          background: `${accent}15`, color: accent, border: `1px solid ${accent}30`,
        }}>{label}</span>
        <ChevronRight size={14} color={C.textDim} style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 20px" }}>
          <div
            style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.65)" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )}
    </div>
  );
}

export default function StrategiePage() {
  /* ── Client data ── */
  const [clients, setClients] = useState<StrategySeedClient[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedClient, setSelectedClient] = useState<StrategySeedClient | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [connectedSources, setConnectedSources] = useState<Record<string, boolean>>({
    meta_ads: false, google_ads: false, analytics: false, crm: false,
  });

  /* ── Survey state ── */
  const [step, setStep] = useState(0);
  const [objectif, setObjectif] = useState<ObjectiveKey | null>(null);
  const [horizon, setHorizon] = useState("");
  const [budget, setBudget] = useState("");
  const [probleme, setProbleme] = useState("");
  const [contexte, setContexte] = useState("");
  const [offre, setOffre] = useState("");
  const [audience, setAudience] = useState("");

  /* ── Generation ── */
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [phaseOutput, setPhaseOutput] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── Dynamic steps based on objectif ── */
  const steps = useMemo<StepId[]>(() => {
    const base: StepId[] = ["client", "objectif"];
    if (objectif === "ventes" || objectif === "leads" || objectif === "scale" || objectif === "diagnostic") {
      base.push("detail");
    }
    base.push("contexte", "summary");
    return base;
  }, [objectif]);

  const currentStepId = steps[step] ?? "client";

  /* ── Load clients ── */
  useEffect(() => {
    fetch("/api/client-hub/clients?show_hidden=true", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : []))
      .catch(() => setClients([]));
  }, []);

  /* ── Filtered client list ── */
  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const list = q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;
    return list.slice(0, 8);
  }, [clients, deferredSearch]);

  /* ── URL prefill ── */
  useEffect(() => {
    if (!clients.length) return;
    const p = new URLSearchParams(window.location.search).get("client");
    if (p) {
      const match = clients.find((c) => c.name.toLowerCase() === p.toLowerCase());
      if (match) selectClient(match);
    }
  }, [clients]);

  /* ── Select client + load context ── */
  const selectClient = useCallback(async (client: StrategySeedClient) => {
    setSelectedClient(client);
    setSearch(client.name);
    setContextLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/strategy-engine/context?clientId=${encodeURIComponent(client.id)}`, { cache: "no-store", credentials: "include" });
      const d = await r.json();
      // Detect connected sources from sourceContext array
      const sources: Record<string, boolean> = { meta_ads: false, google_ads: false, analytics: false, crm: false };
      if (Array.isArray(d.sourceContext)) {
        for (const sc of d.sourceContext) {
          const src = (sc.source ?? "").toLowerCase();
          if (src.includes("meta") || src.includes("facebook")) sources.meta_ads = true;
          if (src.includes("google") && src.includes("ad")) sources.google_ads = true;
          if (src.includes("analytics") || src.includes("ga4")) sources.analytics = true;
          if (src.includes("crm") || src.includes("hubspot")) sources.crm = true;
        }
      }
      setConnectedSources(sources);
    } catch {
      setConnectedSources({ meta_ads: false, google_ads: false, analytics: false, crm: false });
    } finally {
      setContextLoading(false);
      setStep(1);
    }
  }, []);

  /* ── Navigation ── */
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const goTo = (idx: number) => { if (idx <= step) setStep(idx); };

  /* ── Detail value for summary ── */
  const detailLabel = objectif === "scale" ? "Budget actuel" : objectif === "diagnostic" ? "Problème" : "Horizon";
  const detailValue = objectif === "scale" ? budget : objectif === "diagnostic" ? probleme : horizon;

  /* ── Generate strategy ── */
  async function generate() {
    if (!selectedClient || !objectif) return;
    setGenerating(true);
    setGenProgress(0);
    setError(null);
    setPhaseOutput(null);
    const progressInterval = setInterval(() => {
      setGenProgress((p: number) => {
        if (p >= 95) { clearInterval(progressInterval); return 95; }
        const increment = p < 30 ? 3 : p < 60 ? 2 : p < 80 ? 1.5 : 0.5;
        return Math.min(95, p + increment + Math.random() * 2);
      });
    }, 600);
    try {
      const r = await fetch("/api/strategy/generate", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: selectedClient.name,
          industry: selectedClient.industry ?? "",
          website: selectedClient.website ?? "",
          budget: objectif === "scale" ? budget : "5000",
          strategy_type: objectif === "diagnostic" ? "diagnostic" : "360",
          context: [
            `Objectif: ${objectif}`,
            horizon ? `Horizon: ${horizon}` : "",
            budget ? `Budget: ${budget}` : "",
            offre ? `Offre/Produit: ${offre}` : "",
            audience ? `Audience cible: ${audience}` : "",
            probleme ? `Problème: ${probleme}` : "",
            contexte || "",
          ].filter(Boolean).join("\n"),
          force_regenerate: true,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || d.error || "Erreur de génération");
      setPhaseOutput({
        audit: d.audit ?? "", research: d.research ?? "", strategy: d.strategy ?? "",
        build: d.build ?? "", launch: d.launch ?? "", scale: d.scale ?? "", kpis: d.kpis ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      clearInterval(progressInterval);
      setGenProgress(100);
      setTimeout(() => setGenerating(false), 300);
    }
  }

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <Nav />
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
        {/* Context chip */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <ContextChip client={selectedClient} />
          {step > 0 && !phaseOutput && (
            <span style={{ fontSize: 11, color: C.textDim, fontFamily: font }}>
              Étape {step + 1} / {steps.length}
            </span>
          )}
        </div>

        {/* Progress bar (hidden on step 0 and after generation) */}
        {step > 0 && !phaseOutput && <ProgressBar steps={steps} current={step} />}

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 13, fontFamily: font }}>
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── STEP: CLIENT ── */}
          {currentStepId === "client" && !phaseOutput && (
            <motion.div key="client" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              <QuestionTitle text="Quel client accompagnes-tu?" highlight="client" />
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, fontFamily: font }}>
                Recherche et sélectionne en un clic. Le contexte sera chargé automatiquement.
              </p>

              {/* Search input */}
              <div style={{ position: "relative", marginBottom: 16 }}>
                <Search size={16} color={C.textMuted} style={{ position: "absolute", left: 16, top: 14 }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un client..."
                  autoFocus
                  style={{
                    width: "100%", padding: "12px 16px 12px 44px", borderRadius: 14,
                    background: C.card, border: `1.5px solid ${C.border}`, color: "#fff",
                    fontSize: 15, fontFamily: font, outline: "none",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(232,145,45,0.4)"; }}
                  onBlur={(e) => { setTimeout(() => { e.currentTarget.style.borderColor = C.border; }, 200); }}
                />
              </div>

              {/* Client list - only show when searching */}
              {contextLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 20, justifyContent: "center", color: C.textMuted, fontSize: 13 }}>
                  <LoaderCircle size={16} className="animate-spin" /> Chargement du contexte...
                </div>
              ) : search.trim() ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {filtered.map((c) => (
                    <button key={c.id} onClick={() => selectClient(c)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 18px", borderRadius: 14, cursor: "pointer",
                      background: selectedClient?.id === c.id ? "rgba(232,145,45,0.06)" : C.card,
                      border: `1.5px solid ${selectedClient?.id === c.id ? "rgba(232,145,45,0.3)" : "transparent"}`,
                      transition: "all 0.15s ease", textAlign: "left", width: "100%", fontFamily: font,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.cardHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = selectedClient?.id === c.id ? "rgba(232,145,45,0.3)" : "transparent"; }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                          {[c.industry, c.website].filter(Boolean).join(" · ") || "Aucune info"}
                        </div>
                      </div>
                      <ChevronRight size={14} color={C.textDim} />
                    </button>
                  ))}
                  {filtered.length === 0 && search && (
                    <p style={{ textAlign: "center", padding: 20, color: C.textDim, fontSize: 13 }}>{"Aucun client trouv\u00e9"}</p>
                  )}
                </div>
              ) : (
                <p style={{ textAlign: "center", padding: 24, color: C.textDim, fontSize: 13 }}>{"Recherchez un client pour commencer"}</p>
              )}
            </motion.div>
          )}

          {/* ── STEP: OBJECTIF ── */}
          {currentStepId === "objectif" && !phaseOutput && (
            <motion.div key="objectif" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              <QuestionTitle text="Quel est l'objectif principal?" highlight="objectif" />
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, fontFamily: font }}>
                Cela détermine le type de stratégie et les questions suivantes.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {OBJECTIVES.map((o) => (
                  <OptionCard
                    key={o.key}
                    selected={objectif === o.key}
                    icon={o.icon}
                    title={o.title}
                    desc={o.desc}
                    onClick={() => { setObjectif(o.key); setTimeout(next, 300); }}
                  />
                ))}
              </div>
              {/* Back */}
              <div style={{ marginTop: 24 }}>
                <button onClick={back} style={{
                  fontSize: 13, color: C.textMuted, background: "none", border: "none",
                  cursor: "pointer", fontFamily: font, fontWeight: 500,
                }}>← Retour</button>
              </div>
            </motion.div>
          )}

          {/* ── STEP: DETAIL (dynamic) ── */}
          {currentStepId === "detail" && !phaseOutput && (
            <motion.div key="detail" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              {(objectif === "ventes" || objectif === "leads") && (
                <>
                  <QuestionTitle text="Quel horizon de planification?" highlight="horizon" />
                  <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, fontFamily: font }}>
                    La durée influence la profondeur de la stratégie.
                  </p>
                  <PillSelect options={HORIZONS} value={horizon} onChange={(v) => { setHorizon(v); setTimeout(next, 250); }} />
                </>
              )}
              {objectif === "scale" && (
                <>
                  <QuestionTitle text="Quel est le budget actuel?" highlight="budget" />
                  <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, fontFamily: font }}>
                    Pour calibrer les recommandations de scaling.
                    {connectedSources.meta_ads && (
                      <span style={{ display: "block", marginTop: 8, fontSize: 12, color: "#4ade80" }}>
                        ✓ Meta Ads connecté — les métriques seront récupérées automatiquement
                      </span>
                    )}
                  </p>
                  <PillSelect options={BUDGETS} value={budget} onChange={(v) => { setBudget(v); setTimeout(next, 250); }} />
                </>
              )}
              {objectif === "diagnostic" && (
                <>
                  <QuestionTitle text="Quel est le problème principal?" highlight="problème" />
                  <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, fontFamily: font }}>
                    Décris la situation pour orienter l'analyse.
                  </p>
                  <CleanTextarea value={probleme} onChange={setProbleme} placeholder="Ex: Le ROAS a chuté de 4.2 à 1.8 en 3 semaines..." />
                  <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={next} disabled={!probleme.trim()} style={{
                      padding: "10px 24px", borderRadius: 12, cursor: "pointer", fontFamily: font,
                      fontSize: 14, fontWeight: 700, color: "#fff",
                      background: probleme.trim() ? `linear-gradient(135deg, ${C.orange}, #d4800f)` : "rgba(255,255,255,0.06)",
                      border: "none", opacity: probleme.trim() ? 1 : 0.4, transition: "all 0.2s ease",
                    }}>Suivant →</button>
                  </div>
                </>
              )}
              <div style={{ marginTop: 24 }}>
                <button onClick={back} style={{ fontSize: 13, color: C.textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: font, fontWeight: 500 }}>← Retour</button>
              </div>
            </motion.div>
          )}


          {/* ── STEP: OFFRE ── */}
          {currentStepId === "offre" && !phaseOutput && (
            <motion.div key="offre" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              <QuestionTitle text="Quelle est l'offre du client?" highlight="offre" />
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 16, fontFamily: font }}>
                {"Le produit/service principal et ce qui le rend unique."}
              </p>
              <CleanTextarea
                value={offre}
                onChange={setOffre}
                placeholder={"Ex: Programme coaching 12 semaines \u00e0 2,997$, garantie r\u00e9sultats. Ou: Boutique bijoux handmade, panier moyen 85$, livraison gratuite 100$+"}
              />
              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={back} style={{ fontSize: 13, color: C.textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: font, fontWeight: 500 }}>{"\u2190 Retour"}</button>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={next} style={{
                    padding: "10px 20px", borderRadius: 12, cursor: "pointer", fontFamily: font,
                    fontSize: 13, fontWeight: 600, color: C.textMuted,
                    background: "rgba(255,255,255,0.04)", border: "1px solid " + C.border,
                  }}>{"Passer \u2192"}</button>
                  {offre.trim() && (
                    <button onClick={next} style={{
                      padding: "10px 24px", borderRadius: 12, cursor: "pointer", fontFamily: font,
                      fontSize: 14, fontWeight: 700, color: "#fff",
                      background: "linear-gradient(135deg, " + C.orange + ", #d4800f)", border: "none",
                    }}>{"Suivant \u2192"}</button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP: AUDIENCE ── */}
          {currentStepId === "audience" && !phaseOutput && (
            <motion.div key="audience" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              <QuestionTitle text="Qui est le client id\u00e9al?" highlight="client id\u00e9al" />
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 16, fontFamily: font }}>
                {"D\u00e9cris l'audience cible: qui sont-ils, quel probl\u00e8me ont-ils, o\u00f9 sont-ils?"}
              </p>
              <CleanTextarea
                value={audience}
                onChange={setAudience}
                placeholder={"Ex: Femmes 25-45 au Qu\u00e9bec, int\u00e9ress\u00e9es mode/bijoux, budget moyen, acheteuses en ligne. Ou: Propri\u00e9taires maison 35-55, r\u00e9gion Montr\u00e9al, besoin isolation/r\u00e9novation."}
              />
              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={back} style={{ fontSize: 13, color: C.textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: font, fontWeight: 500 }}>{"\u2190 Retour"}</button>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={next} style={{
                    padding: "10px 20px", borderRadius: 12, cursor: "pointer", fontFamily: font,
                    fontSize: 13, fontWeight: 600, color: C.textMuted,
                    background: "rgba(255,255,255,0.04)", border: "1px solid " + C.border,
                  }}>{"Passer \u2192"}</button>
                  {audience.trim() && (
                    <button onClick={next} style={{
                      padding: "10px 24px", borderRadius: 12, cursor: "pointer", fontFamily: font,
                      fontSize: 14, fontWeight: 700, color: "#fff",
                      background: "linear-gradient(135deg, " + C.orange + ", #d4800f)", border: "none",
                    }}>{"Suivant \u2192"}</button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP: CONTEXTE ── */}
          {currentStepId === "contexte" && !phaseOutput && (
            <motion.div key="contexte" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              <QuestionTitle text="Contexte additionnel?" highlight="Contexte" />
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 16, fontFamily: font }}>
                Optionnel. Ajoute des notes, contraintes ou informations supplémentaires.
              </p>

              {/* Source suggestions */}
              {!connectedSources.meta_ads && !connectedSources.google_ads && (
                <div style={{
                  padding: "12px 16px", borderRadius: 12, marginBottom: 16,
                  background: "rgba(232,145,45,0.04)", border: `1px solid rgba(232,145,45,0.12)`,
                  fontSize: 12, color: C.orangeLight, fontFamily: font,
                }}>
                  💡 Connecte Meta Ads ou Google Ads dans les paramètres pour enrichir la stratégie automatiquement.
                </div>
              )}

              <CleanTextarea
                value={contexte}
                onChange={setContexte}
                placeholder="Ex: Le client vient de lancer un nouveau produit à 297$, cible femmes 25-45 au Québec..."
              />

              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={back} style={{ fontSize: 13, color: C.textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: font, fontWeight: 500 }}>← Retour</button>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={next} style={{
                    padding: "10px 20px", borderRadius: 12, cursor: "pointer", fontFamily: font,
                    fontSize: 13, fontWeight: 600, color: C.textMuted,
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                  }}>Passer →</button>
                  {contexte.trim() && (
                    <button onClick={next} style={{
                      padding: "10px 24px", borderRadius: 12, cursor: "pointer", fontFamily: font,
                      fontSize: 14, fontWeight: 700, color: "#fff",
                      background: `linear-gradient(135deg, ${C.orange}, #d4800f)`, border: "none",
                    }}>Suivant →</button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP: SUMMARY ── */}
          {currentStepId === "summary" && !phaseOutput && (
            <motion.div key="summary" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              <QuestionTitle text="Résumé avant génération" highlight="génération" />
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, fontFamily: font }}>
                Vérifie les informations. Clique sur « Modifier » pour ajuster.
              </p>

              <div style={{ background: C.card, borderRadius: 20, padding: "8px 24px", marginBottom: 24, border: `1px solid ${C.border}` }}>
                <SummaryRow label="Client" value={selectedClient?.name ?? ""} onEdit={() => goTo(0)} />
                <SummaryRow label="Industrie" value={selectedClient?.industry ?? "Non spécifié"} />
                <SummaryRow label="Objectif" value={OBJECTIVES.find((o) => o.key === objectif)?.title ?? ""} onEdit={() => goTo(1)} />
                {objectif !== "autre" && <SummaryRow label={detailLabel} value={detailValue} onEdit={() => goTo(steps.indexOf("detail"))} />}
                <SummaryRow label="Contexte" value={contexte ? contexte.slice(0, 80) + (contexte.length > 80 ? "..." : "") : "Aucun"} onEdit={() => goTo(steps.indexOf("contexte"))} />
              </div>

              {/* Connected sources */}
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, fontFamily: font }}>
                  Sources connectées
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <SourceBadge connected={connectedSources.meta_ads} label="Meta Ads" />
                  <SourceBadge connected={connectedSources.google_ads} label="Google Ads" />
                  <SourceBadge connected={connectedSources.analytics} label="Analytics" />
                  <SourceBadge connected={connectedSources.crm} label="CRM" />
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={generate}
                disabled={generating}
                style={{
                  width: "100%", padding: "16px 24px", borderRadius: 16, cursor: generating ? "wait" : "pointer",
                  fontFamily: font, fontSize: 16, fontWeight: 800, color: "#fff", border: "none",
                  background: generating ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg, ${C.orange}, #c46e0a)`,
                  boxShadow: generating ? "none" : "0 8px 32px rgba(232,145,45,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "all 0.3s ease",
                }}
              >
                {generating ? (
                  <><LoaderCircle size={18} className="animate-spin" /> Création en cours · {Math.round(genProgress)}%</>
                ) : (
                  <><Sparkles size={18} /> Générer la stratégie</>
                )}
              </button>

              <div style={{ marginTop: 16, textAlign: "center" }}>
                <button onClick={back} style={{ fontSize: 13, color: C.textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: font, fontWeight: 500 }}>← Retour</button>
              </div>
            </motion.div>
          )}

          {/* ── OUTPUT: View / Download buttons only ── */}
          {phaseOutput && (
            <motion.div key="output" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ marginBottom: 12 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", fontFamily: font, letterSpacing: "-0.02em" }}>
                    Stratégie <span style={{ color: C.orange }}>7 Phases</span>
                  </h2>
                  <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4, fontFamily: font }}>
                    {selectedClient?.name} · {OBJECTIVES.find((o) => o.key === objectif)?.title}
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32, maxWidth: 360, margin: "32px auto 0" }}>
                  {/* ── Button 1: View HTML (InnovaSoins template) ── */}
                  <button
                    onClick={() => {
                      const phases = [
                        { key: "audit", label: "Phase 1 — Audit" },
                        { key: "research", label: "Phase 2 — Recherche" },
                        { key: "strategy", label: "Phase 3 — Stratégie" },
                        { key: "build", label: "Phase 4 — Build" },
                        { key: "launch", label: "Phase 5 — Lancement" },
                        { key: "scale", label: "Phase 6 — Scale" },
                        { key: "kpis", label: "Phase 7 — KPIs" },
                      ];
                      const md = phases.map(p => phaseOutput[p.key] ? `# ${p.label}\n${phaseOutput[p.key]}` : "").filter(Boolean).join("\n\n");
                      const html = buildPrintableHtml(md, "Stratégie 7 Phases", selectedClient?.name ?? "", new Date().toLocaleDateString("fr-CA"));
                      const w = window.open("", "_blank");
                      if (w) { w.document.write(html); w.document.close(); }
                    }}
                    style={{
                      width: "100%", padding: "16px 24px", borderRadius: 16, cursor: "pointer",
                      fontFamily: font, fontSize: 16, fontWeight: 800, color: "#fff", border: "none",
                      background: `linear-gradient(135deg, ${C.orange}, #c46e0a)`,
                      boxShadow: "0 8px 32px rgba(232,145,45,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    }}
                  >
                    <Eye size={18} /> Voir la stratégie
                  </button>

                  {/* ── Button 2: Download DOCX ── */}
                  <a
                    href={`/api/strategy/export-docx/${encodeURIComponent(selectedClient?.name ?? "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: "100%", padding: "16px 24px", borderRadius: 16, cursor: "pointer",
                      fontFamily: font, fontSize: 16, fontWeight: 800, color: C.orangeLight, border: `1px solid rgba(232,145,45,0.25)`,
                      background: "rgba(232,145,45,0.08)", textDecoration: "none",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      boxSizing: "border-box",
                    }}
                  >
                    <FileDown size={18} /> Télécharger DOCX
                  </a>



                  <button
                    onClick={() => { setPhaseOutput(null); setStep(0); setObjectif(null); setHorizon(""); setBudget(""); setProbleme(""); setContexte(""); setSelectedClient(null); setSearch(""); }}
                    style={{
                      padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                      color: C.textMuted, background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: font,
                      marginTop: 8,
                    }}
                  >
                    Nouvelle stratégie
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
