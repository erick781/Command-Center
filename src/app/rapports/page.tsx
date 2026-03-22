"use client";

import { useEffect, useMemo, useState, useDeferredValue, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronRight, Check, Sparkles, LoaderCircle,
  Eye, FileDown, FileText, BarChart3, ShoppingCart, GraduationCap,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { mdToHtml, buildPrintableHtml } from "@/lib/render-deliverable";

/* ── Design tokens (same as strategie) ── */
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

/* ── Types ── */
type Client = {
  id: string;
  name: string;
  status?: string;
  industry?: string;
  website?: string;
  meta_data?: Record<string, unknown> | null;
};

/* ── Step definitions ── */
type StepId = "client" | "type" | "period" | "summary";
const ALL_STEPS: StepId[] = ["client", "type", "period", "summary"];
const STEP_LABELS: Record<StepId, string> = {
  client: "Client",
  type: "Type",
  period: "Période",
  summary: "Résumé",
};

/* ── Report type options ── */
type ReportTypeKey = "leadgen" | "ecommerce" | "coach";
const REPORT_TYPES: { key: ReportTypeKey; icon: typeof BarChart3; title: string; desc: string }[] = [
  { key: "leadgen", icon: BarChart3, title: "Lead Gen", desc: "Pipeline, bookings, CPL, qualité des leads" },
  { key: "ecommerce", icon: ShoppingCart, title: "E-commerce", desc: "ATC, checkout, achats, revenue, ROAS" },
  { key: "coach", icon: GraduationCap, title: "Coaching", desc: "Applications, appels, closes, cash collected" },
];

const PERIODS = [
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "60", label: "60 jours" },
  { value: "90", label: "90 jours" },
] as const;

/* ── Framer variants (same as strategie) ── */
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
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${C.orange}, ${C.orangeLight})` }}
        />
      </div>
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

function ContextChip({ client }: { client: Client | null }) {
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
  selected: boolean; icon: typeof BarChart3; title: string; desc: string; onClick: () => void;
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
    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = selected ? "rgba(232,145,45,0.5)" : "transparent"; }}
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

function PillSelect({ options, value, onChange }: { options: readonly { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          padding: "14px 28px", borderRadius: 14, cursor: "pointer", fontFamily: font,
          fontSize: 15, fontWeight: 700,
          background: value === opt.value ? "rgba(232,145,45,0.12)" : C.card,
          border: `1.5px solid ${value === opt.value ? "rgba(232,145,45,0.5)" : "transparent"}`,
          color: value === opt.value ? C.orangeLight : C.text,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => { if (value !== opt.value) e.currentTarget.style.borderColor = C.cardHover; }}
        onMouseLeave={(e) => { if (value !== opt.value) e.currentTarget.style.borderColor = "transparent"; }}
        >{opt.label}</button>
      ))}
    </div>
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

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function RapportsPage() {
  /* ── Client data ── */
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  /* ── Survey state ── */
  const [step, setStep] = useState(0);
  const [reportType, setReportType] = useState<ReportTypeKey | null>(null);
  const [period, setPeriod] = useState("");

  /* ── Generation ── */
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = ALL_STEPS;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  /* ── Select client ── */
  const selectClient = useCallback((client: Client) => {
    setSelectedClient(client);
    setSearch(client.name);
    setStep(1);
  }, []);

  /* ── Navigation ── */
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const goTo = (idx: number) => { if (idx <= step) setStep(idx); };

  /* ── Report type label helper ── */
  const reportTypeLabel = REPORT_TYPES.find((t) => t.key === reportType)?.title ?? "";
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "";

  /* ── Build context for API ── */
  function buildContext() {
    if (!selectedClient) return "";
    const lines = [
      `Client: ${selectedClient.name}`,
      `Type: ${reportType}`,
      `Periode: ${period} jours`,
      selectedClient.industry ? `Industry: ${selectedClient.industry}` : "",
      selectedClient.website ? `Website: ${selectedClient.website}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  }

  /* ── Generate report ── */
  async function generate() {
    if (!selectedClient || !reportType || !period) return;
    setGenerating(true);
    setGenProgress(0);
    setError(null);
    setReportContent(null);

    const progressInterval = setInterval(() => {
      setGenProgress((p: number) => {
        if (p >= 95) { clearInterval(progressInterval); return 95; }
        const increment = p < 30 ? 3 : p < 60 ? 2 : p < 80 ? 1.5 : 0.5;
        return Math.min(95, p + increment + Math.random() * 2);
      });
    }, 600);

    try {
      const r = await fetch("/api/recommendations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: selectedClient.name,
          reportType,
          context: buildContext(),
        }),
      });

      if (!r.ok || !r.body) throw new Error(`Erreur ${r.status}`);

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let content = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
      setReportContent(content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      clearInterval(progressInterval);
      setGenProgress(100);
      setTimeout(() => setGenerating(false), 300);
    }
  }

  /* ── Open report in new tab ── */
  function viewReport() {
    if (!reportContent || !selectedClient) return;
    const html = buildPrintableHtml(
      reportContent,
      `Rapport ${reportTypeLabel}`,
      selectedClient.name,
      new Date().toLocaleDateString("fr-CA"),
      "rapport_performance",
    );
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  /* ── Download as DOCX ── */
  function downloadDocx() {
    if (!selectedClient) return;
    window.open(`/api/strategy/export-docx/${encodeURIComponent(selectedClient.name)}`, "_blank");
  }

  /* ── Download as PDF ── */
  function downloadPdf() {
    if (!selectedClient) return;
    window.open(`/api/strategy/export-pdf/${encodeURIComponent(selectedClient.name)}`, "_blank");
  }

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <Nav />
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* Context chip */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <ContextChip client={selectedClient} />
          {step > 0 && !reportContent && (
            <span style={{ fontSize: 11, color: C.textDim, fontFamily: font }}>
              Étape {step + 1} / {steps.length}
            </span>
          )}
        </div>

        {/* Progress bar (hidden on step 0 and after generation) */}
        {step > 0 && !reportContent && <ProgressBar steps={steps} current={step} />}

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 13, fontFamily: font }}>
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ── STEP 1: CLIENT ── */}
          {currentStepId === "client" && !reportContent && (
            <motion.div key="client" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              <QuestionTitle text="Quel client?" highlight="client" />
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, fontFamily: font }}>
                Recherche et sélectionne en un clic.
              </p>

              {/* Search input */}
              <div style={{ position: "relative", marginBottom: 16 }}>
                <Search size={16} color={C.textMuted} style={{ position: "absolute", left: 16, top: 14 }} />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedClient(null); }}
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

              {/* Client list */}
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
                  <p style={{ textAlign: "center", padding: 20, color: C.textDim, fontSize: 13 }}>Aucun client trouvé</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: REPORT TYPE ── */}
          {currentStepId === "type" && !reportContent && (
            <motion.div key="type" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              <QuestionTitle text="Quel type de rapport?" highlight="type" />
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, fontFamily: font }}>
                Choisis le modèle qui correspond à ton client.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {REPORT_TYPES.map((t) => (
                  <OptionCard
                    key={t.key}
                    selected={reportType === t.key}
                    icon={t.icon}
                    title={t.title}
                    desc={t.desc}
                    onClick={() => { setReportType(t.key); setTimeout(next, 300); }}
                  />
                ))}
              </div>
              <div style={{ marginTop: 24 }}>
                <button onClick={back} style={{
                  fontSize: 13, color: C.textMuted, background: "none", border: "none",
                  cursor: "pointer", fontFamily: font, fontWeight: 500,
                }}>← Retour</button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: PERIOD ── */}
          {currentStepId === "period" && !reportContent && (
            <motion.div key="period" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              <QuestionTitle text="Quelle période?" highlight="période" />
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, fontFamily: font }}>
                La fenêtre d'analyse pour le rapport.
              </p>
              <PillSelect options={PERIODS} value={period} onChange={(v) => { setPeriod(v); setTimeout(next, 250); }} />
              <div style={{ marginTop: 24 }}>
                <button onClick={back} style={{
                  fontSize: 13, color: C.textMuted, background: "none", border: "none",
                  cursor: "pointer", fontFamily: font, fontWeight: 500,
                }}>← Retour</button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: SUMMARY ── */}
          {currentStepId === "summary" && !reportContent && (
            <motion.div key="summary" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              <QuestionTitle text="Résumé avant génération" highlight="génération" />
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, fontFamily: font }}>
                Vérifie les informations. Clique sur « Modifier » pour ajuster.
              </p>

              <div style={{ background: C.card, borderRadius: 20, padding: "8px 24px", marginBottom: 24, border: `1px solid ${C.border}` }}>
                <SummaryRow label="Client" value={selectedClient?.name ?? ""} onEdit={() => goTo(0)} />
                <SummaryRow label="Type" value={reportTypeLabel} onEdit={() => goTo(1)} />
                <SummaryRow label="Période" value={periodLabel} onEdit={() => goTo(2)} />
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
                  <><Sparkles size={18} /> Générer le rapport</>
                )}
              </button>

              <div style={{ marginTop: 16, textAlign: "center" }}>
                <button onClick={back} style={{ fontSize: 13, color: C.textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: font, fontWeight: 500 }}>← Retour</button>
              </div>
            </motion.div>
          )}

          {/* ── OUTPUT: View / Download buttons ── */}
          {reportContent && (
            <motion.div key="output" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ marginBottom: 12 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", fontFamily: font, letterSpacing: "-0.02em" }}>
                    Rapport <span style={{ color: C.orange }}>{reportTypeLabel}</span>
                  </h2>
                  <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4, fontFamily: font }}>
                    {selectedClient?.name} · {periodLabel}
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32, maxWidth: 360, margin: "32px auto 0" }}>
                  {/* View HTML */}
                  <button onClick={viewReport} style={{
                    width: "100%", padding: "16px 24px", borderRadius: 16, cursor: "pointer",
                    fontFamily: font, fontSize: 16, fontWeight: 800, color: "#fff", border: "none",
                    background: `linear-gradient(135deg, ${C.orange}, #c46e0a)`,
                    boxShadow: "0 8px 32px rgba(232,145,45,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  }}>
                    <Eye size={18} /> Voir le rapport
                  </button>

                  {/* Download DOCX */}
                  <button onClick={downloadDocx} style={{
                    width: "100%", padding: "16px 24px", borderRadius: 16, cursor: "pointer",
                    fontFamily: font, fontSize: 16, fontWeight: 800, color: C.orangeLight,
                    border: `1px solid rgba(232,145,45,0.25)`,
                    background: "rgba(232,145,45,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    boxSizing: "border-box" as const,
                  }}>
                    <FileDown size={18} /> Télécharger DOCX
                  </button>

                  {/* Download PDF */}
                  <button onClick={downloadPdf} style={{
                    width: "100%", padding: "16px 24px", borderRadius: 16, cursor: "pointer",
                    fontFamily: font, fontSize: 16, fontWeight: 800, color: "#f4b85c",
                    border: "1px solid rgba(244,184,92,0.25)",
                    background: "rgba(244,184,92,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    boxSizing: "border-box" as const,
                  }}>
                    <FileText size={18} /> Télécharger PDF
                  </button>

                  {/* New report button */}
                  <button
                    onClick={() => { setReportContent(null); setStep(0); setReportType(null); setPeriod(""); setSelectedClient(null); setSearch(""); setError(null); }}
                    style={{
                      padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                      color: C.textMuted, background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: font,
                      marginTop: 8,
                    }}
                  >
                    Nouveau rapport
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
