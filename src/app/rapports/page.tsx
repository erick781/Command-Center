"use client";

import { useEffect, useMemo, useState, useDeferredValue, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronRight, Check, Sparkles, LoaderCircle,
  Eye, FileDown, FileText, BarChart3, ShoppingCart, GraduationCap,
  TrendingUp, DollarSign, Users, Target, Activity,
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
  meta_data?: MetaData | null;
};

type Campaign = {
  id: string;
  name: string;
  objective: string;
  type: string;
  type_label: string;
  effective_status: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  conv_value: number;
  purchases: number;
  add_to_cart: number;
  initiate_checkout: number;
};

type MetaData = {
  spend: number;
  leads: number;
  cpl: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  purchases: number;
  conv_value: number;
  campaigns: Campaign[];
  flags: { type: string; msg: string }[];
  wins: { type: string; msg: string }[];
};

/* ── Step definitions ── */
type StepId = "client" | "campaigns" | "type" | "period" | "summary";
const ALL_STEPS: StepId[] = ["client", "campaigns", "type", "period", "summary"];
const STEP_LABELS: Record<StepId, string> = {
  client: "Client",
  campaigns: "Campagnes",
  type: "Type",
  period: "Période",
  summary: "Résumé",
};

/* ── Report type options ── */
type ReportTypeKey = "leadgen" | "ecommerce" | "coach" | "multicanal" | "social" | "video";
const REPORT_TYPES: { key: ReportTypeKey; icon: typeof BarChart3; title: string; desc: string }[] = [
  { key: "leadgen", icon: BarChart3, title: "Lead Gen", desc: "Pipeline, bookings, CPL, qualité des leads" },
  { key: "ecommerce", icon: ShoppingCart, title: "E-commerce", desc: "ATC, checkout, achats, revenue, ROAS" },
  { key: "coach", icon: GraduationCap, title: "Coaching", desc: "Applications, appels, closes, cash collected" },
  { key: "multicanal", icon: TrendingUp, title: "Multi-canal", desc: "Meta Ads + Google Ads combinés, vue globale" },
  { key: "social", icon: Users, title: "Réseaux sociaux", desc: "Facebook, Instagram, TikTok organique + paid" },
  { key: "video", icon: Activity, title: "Vidéo / Contenu", desc: "Performance vidéo, vues, engagement, ROI contenu" },
];

const PERIODS = [
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "60", label: "60 jours" },
  { value: "90", label: "90 jours" },
  { value: "custom", label: "Personnalis\u00e9" },
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
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [metaCampaigns, setMetaCampaigns] = useState<Campaign[]>([]);
  const [googleCampaigns, setGoogleCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  /* ── Generation ── */
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [googleAdsData, setGoogleAdsData] = useState<any>(null);
  const [googleAdsLoading, setGoogleAdsLoading] = useState(false);

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
    setSelectedCampaigns([]);
    setMetaCampaigns([]);
    setGoogleCampaigns([]);
    setLoadingCampaigns(true);
    setStep(1);
    // Load Meta campaigns from client meta_data
    const meta = client.meta_data as MetaData | null;
    if (meta?.campaigns) setMetaCampaigns(meta.campaigns);
    // Load Google Ads campaigns if available
    fetch("/api/google-ads/child-accounts", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        // Try to find matching Google Ads account by client name
        const accounts = data.accounts || [];
        const match = accounts.find((a: any) => 
          a.name.toLowerCase().includes(client.name.toLowerCase().split(" ")[0])
        );
        if (match) {
          fetch("/api/google-ads/" + match.id + "/campaigns?days=30", { credentials: "include" })
            .then(r => r.json())
            .then(gData => { setGoogleCampaigns(gData.campaigns || []); setLoadingCampaigns(false); })
            .catch(() => setLoadingCampaigns(false));
        } else {
          setLoadingCampaigns(false);
        }
      })
      .catch(() => setLoadingCampaigns(false));
  }, []);

  /* ── Navigation ── */
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const goTo = (idx: number) => { if (idx <= step) setStep(idx); };

  /* ── Report type label helper ── */
  const reportTypeLabel = REPORT_TYPES.find((t) => t.key === reportType)?.title ?? "";
  const periodLabel = period === "custom" && customDateStart && customDateEnd ? customDateStart + " \u2192 " + customDateEnd : PERIODS.find((p) => p.value === period)?.label ?? "";

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

  /* ── Generate report — Step 1: show real data ── */
  async function generate() {
    if (!selectedClient || !reportType || !period) return;
    setGenerating(true);
    setGenProgress(0);
    setError(null);
    setReportContent(null);
    setShowData(false);
    setAiLoading(false);
    // Fetch Google Ads data for this client
    if (selectedClient?.id) {
      setGoogleAdsLoading(true);
      fetch("/api/google-ads/by-client/" + selectedClient.id + "?days=" + (period || "30"), { credentials: "include" })
        .then(r => r.json())
        .then(d => { setGoogleAdsData(d); setGoogleAdsLoading(false); })
        .catch(() => setGoogleAdsLoading(false));
    }
    setTimeout(() => {
      setGenProgress(100);
      setGenerating(false);
      setShowData(true);
    }, 800);
  }

  /* ── Generate AI recommendations (Step 2) ── */
  async function generateAiRecommendations() {
    if (!selectedClient || !reportType || !period) return;
    setAiLoading(true);
    setError(null);
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
      if (!r.ok || !r.body) throw new Error("Erreur " + r.status);
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let c = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        c += decoder.decode(value, { stream: true });
      }
      setReportContent(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setAiLoading(false);
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
  async function downloadDocx() {
    if (!selectedClient || !reportContent) return;
    try {
      const res = await fetch("/api/deliverable/export-docx", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reportType || "rapport",
          client_name: selectedClient.name,
          industry: selectedClient.industry || "",
          content: reportContent,
        }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rapport_" + (reportType || "rapport") + "_" + selectedClient.name.replace(/ /g, "_") + ".docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("DOCX download error:", e);
    }
  }
  /* ── Download as PDF ── */
  async function downloadPdf() {
    // Pour l'instant, generer un DOCX (Erick prefere DOCX)
    await downloadDocx();
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

          {currentStepId === "campaigns" && !reportContent && (
            <motion.div key="campaigns" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600, width: "100%" }}>
              <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, fontFamily: font, margin: 0, textAlign: "center" }}>
                Campagnes de {selectedClient?.name}
              </h2>
              <p style={{ color: C.textMuted, fontSize: 14, fontFamily: font, textAlign: "center", margin: 0 }}>
                {"Sélectionnez les campagnes à inclure ou continuez pour toutes les inclure."}
              </p>
              {loadingCampaigns ? (
                <div style={{ textAlign: "center", padding: 24 }}><LoaderCircle className="animate-spin" style={{ color: C.orange }} /></div>
              ) : (
                <>
                  {metaCampaigns.length > 0 && (
                    <>
                      <p style={{ color: C.orange, fontSize: 13, fontWeight: 600, fontFamily: font, margin: "8px 0 4px" }}>{"Meta Ads"}</p>
                      <p style={{ color: "rgba(16,185,129,0.8)", fontSize: 11, fontWeight: 600, fontFamily: font, margin: "4px 0 2px", letterSpacing: "0.05em" }}>{"ACTIVES"}</p>
                      {metaCampaigns.filter((c: Campaign) => c.effective_status === "ACTIVE" || c.spend > 0).map((camp: Campaign) => {
                        const sel = selectedCampaigns.includes("meta_" + camp.id);
                        return (
                          <button key={"meta_" + camp.id} onClick={() => {
                            const key = "meta_" + camp.id;
                            setSelectedCampaigns(prev => sel ? prev.filter(c => c !== key) : [...prev, key]);
                          }} style={{
                            background: sel ? "rgba(232,145,45,0.15)" : C.card,
                            border: sel ? "1px solid " + C.orange : "1px solid " + C.border,
                            borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left", fontFamily: font, transition: "all .2s",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{camp.name}</span>
                              <span style={{ color: C.textMuted, fontSize: 12 }}>{"$"}{camp.spend.toLocaleString()}</span>
                            </div>
                            <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
                              {camp.clicks}{" clics · "}{camp.leads}{" leads · "}{camp.impressions.toLocaleString()}{" imp."}
                            </div>
                          </button>
                        );
                      })}
                      {metaCampaigns.filter((c: Campaign) => c.effective_status !== "ACTIVE" && c.spend === 0).length > 0 && (
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 600, fontFamily: font, margin: "12px 0 2px", letterSpacing: "0.05em" }}>{"PAUSES / INACTIVES"}</p>
                      )}
                      {metaCampaigns.filter((c: Campaign) => c.effective_status !== "ACTIVE" && c.spend === 0).map((camp: Campaign) => {
                        const sel = selectedCampaigns.includes("meta_" + camp.id);
                        return (
                          <button key={"meta_paused_" + camp.id} onClick={() => {
                            const key = "meta_" + camp.id;
                            setSelectedCampaigns(prev => sel ? prev.filter(c => c !== key) : [...prev, key]);
                          }} style={{
                            background: sel ? "rgba(232,145,45,0.08)" : "rgba(255,255,255,0.02)",
                            border: sel ? "1px solid rgba(232,145,45,0.2)" : "1px solid rgba(255,255,255,0.04)",
                            borderRadius: 12, padding: "10px 14px", cursor: "pointer", textAlign: "left", fontFamily: font, transition: "all .2s", opacity: 0.5,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600 }}>{camp.name}</span>
                              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>{"Pause"}</span>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                  {googleCampaigns.length > 0 && (
                    <>
                      <p style={{ color: "#4285F4", fontSize: 13, fontWeight: 600, fontFamily: font, margin: "8px 0 4px" }}>{"Google Ads"}</p>
                      <p style={{ color: "rgba(16,185,129,0.8)", fontSize: 11, fontWeight: 600, fontFamily: font, margin: "4px 0 2px", letterSpacing: "0.05em" }}>{"ACTIVES"}</p>
                      {googleCampaigns.filter((c: any) => c.spend > 0).map((camp: any) => {
                        const sel = selectedCampaigns.includes("google_" + camp.id);
                        return (
                          <button key={"google_" + camp.id} onClick={() => {
                            const key = "google_" + camp.id;
                            setSelectedCampaigns(prev => sel ? prev.filter(c => c !== key) : [...prev, key]);
                          }} style={{
                            background: sel ? "rgba(66,133,244,0.15)" : C.card,
                            border: sel ? "1px solid #4285F4" : "1px solid " + C.border,
                            borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left", fontFamily: font, transition: "all .2s",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{camp.name}</span>
                              <span style={{ color: C.textMuted, fontSize: 12 }}>{"$"}{camp.spend.toLocaleString()}</span>
                            </div>
                            <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
                              {camp.clicks}{" clics · "}{camp.conversions}{" conv. · "}{camp.impressions.toLocaleString()}{" imp."}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                  {metaCampaigns.filter((c: Campaign) => c.spend > 0).length === 0 && googleCampaigns.filter((c: any) => c.spend > 0).length === 0 && (
                    <p style={{ color: C.textMuted, fontSize: 14, fontFamily: font, textAlign: "center", padding: 24 }}>
                      {"Aucune campagne active avec dépenses."}
                    </p>
                  )}
                </>
              )}
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
                <button onClick={back} style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
                  {"Retour"}
                </button>
                <button onClick={next} style={{ background: C.orange, color: "#000", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: font }}>
                  {selectedCampaigns.length > 0 ? "Continuer (" + selectedCampaigns.length + ")" : "Toutes les campagnes"}
                </button>
              </div>
            </motion.div>
          )}

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
                <SummaryRow label="Campagnes" value={selectedCampaigns.length > 0 ? selectedCampaigns.length + " selectionnees" : "Toutes"} onEdit={() => goTo(1)} />
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

          {/* ── DATA DISPLAY: Real KPIs + Campaign table ── */}
          {showData && (
            <motion.div key="data-display" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}>
              {(() => {
                const meta = selectedClient?.meta_data as MetaData | null | undefined;
                if (!meta) return (
                  <div style={{ textAlign: "center", padding: "48px 0" }}>
                    <p style={{ color: C.textMuted, fontSize: 14, fontFamily: font }}>Aucune donn\u00e9e Meta Ads disponible pour ce client.</p>
                    <button onClick={() => { setShowData(false); setStep(3); }} style={{ marginTop: 16, fontSize: 13, color: C.orange, background: "none", border: "none", cursor: "pointer", fontFamily: font, fontWeight: 600 }}>\u2190 Retour</button>
                  </div>
                );
                const campaigns = meta.campaigns || [];
                const fmt = (n: number) => n >= 1000 ? (n/1000).toFixed(1) + "k" : n.toFixed(n < 10 ? 2 : 0);
                const fmtMoney = (n: number) => "$" + (n >= 1000 ? (n/1000).toFixed(1) + "k" : n.toFixed(2));
                return (
                  <>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Activity size={16} color={C.orange} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.orange, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: font }}>Donn\u00e9es r\u00e9elles</span>
                      </div>
                      <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", fontFamily: font, letterSpacing: "-0.02em" }}>
                        Performance <span style={{ color: C.orange }}>Meta Ads</span>
                      </h2>
                      <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginTop: 4 }}>
                        {selectedClient?.name} \u00b7 {periodLabel}
                      </p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                      {[
                        { label: "D\u00e9penses", value: fmtMoney(meta.spend), icon: DollarSign, color: "#ef4444" },
                        { label: "Leads", value: String(meta.leads), icon: Users, color: "#3b82f6" },
                        { label: "CPL", value: fmtMoney(meta.cpl), icon: Target, color: "#f59e0b" },
                        { label: "ROAS", value: meta.roas + "x", icon: TrendingUp, color: "#10b981" },
                      ].map((kpi) => (
                        <div key={kpi.label} style={{
                          background: C.card, borderRadius: 16, padding: "20px 18px",
                          border: "1px solid " + C.border,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>{kpi.label}</span>
                            <kpi.icon size={14} color={kpi.color} />
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", fontFamily: font, letterSpacing: "-0.02em" }}>{kpi.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
                      {[
                        { label: "Impressions", value: fmt(meta.impressions) },
                        { label: "Clics", value: fmt(meta.clicks) },
                        { label: "CTR", value: meta.ctr + "%" },
                      ].map((kpi) => (
                        <div key={kpi.label} style={{
                          background: C.card, borderRadius: 12, padding: "14px 12px", textAlign: "center" as const,
                          border: "1px solid " + C.border,
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font, marginBottom: 4 }}>{kpi.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: font }}>{kpi.value}</div>
                        </div>
                      ))}
                    </div>
                    {meta.wins && meta.wins.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                        {meta.wins.map((w: { type: string; msg: string }, i: number) => (
                          <span key={i} style={{
                            padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
                            color: "#6ee7b7", fontFamily: font,
                          }}>
                            {w.msg}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ marginBottom: 32 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: font, marginBottom: 12 }}>
                        D\u00e9tail par campagne
                      </h3>
                      <div style={{ background: C.card, borderRadius: 16, border: "1px solid " + C.border, overflow: "hidden" }}>
                        <div style={{
                          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                          padding: "10px 16px", borderBottom: "1px solid " + C.border,
                          background: "rgba(255,255,255,0.02)",
                        }}>
                          {["Campagne", "D\u00e9penses", "Leads", "CPL", "ROAS"].map((h) => (
                            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: font }}>{h}</span>
                          ))}
                        </div>
                        {campaigns.map((camp: Campaign, i: number) => {
                          const campCpl = camp.leads > 0 ? camp.spend / camp.leads : 0;
                          const campRoas = camp.spend > 0 ? camp.conv_value / camp.spend : 0;
                          return (
                            <div key={camp.id} style={{
                              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                              padding: "12px 16px", borderBottom: i < campaigns.length - 1 ? "1px solid " + C.border : "none",
                              alignItems: "center",
                            }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: font, lineHeight: 1.3 }}>
                                  {camp.name.length > 35 ? camp.name.substring(0, 35) + "..." : camp.name}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                                  <span style={{
                                    fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                                    background: camp.effective_status === "ACTIVE" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                                    color: camp.effective_status === "ACTIVE" ? "#6ee7b7" : C.textDim,
                                    fontFamily: font, textTransform: "uppercase", letterSpacing: "0.05em",
                                  }}>{camp.effective_status === "ACTIVE" ? "Actif" : camp.effective_status}</span>
                                  <span style={{ fontSize: 9, color: C.textDim, fontFamily: font }}>{camp.type_label}</span>
                                </div>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: font }}>{fmtMoney(camp.spend)}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: camp.leads > 0 ? "#3b82f6" : C.textDim, fontFamily: font }}>{camp.leads}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: campCpl > 0 ? "#f59e0b" : C.textDim, fontFamily: font }}>{campCpl > 0 ? fmtMoney(campCpl) : "\u2014"}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: campRoas >= 3 ? "#10b981" : campRoas > 0 ? "#f59e0b" : C.textDim, fontFamily: font }}>{campRoas > 0 ? campRoas.toFixed(1) + "x" : "\u2014"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                {/* Google Ads Data */}
                {googleAdsLoading && (
                  <div style={{ textAlign: "center", padding: 24, color: "rgba(255,255,255,0.45)", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
                    {"Chargement Google Ads..."}
                  </div>
                )}
                {googleAdsData?.has_google_ads && googleAdsData.kpis && (
                  <>
                    <h3 style={{ color: "#4285F4", fontSize: 16, fontWeight: 700, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", margin: "24px 0 12px" }}>
                      {"Google Ads"}
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                      {[
                        { label: "Spend", value: "$" + (googleAdsData.kpis.spend || 0).toLocaleString() },
                        { label: "Clics", value: String(googleAdsData.kpis.clicks || 0) },
                        { label: "Conversions", value: (googleAdsData.kpis.conversions || 0).toFixed(1) },
                        { label: "CPA", value: "$" + (googleAdsData.kpis.cpa || 0).toFixed(2) },
                        { label: "ROAS", value: (googleAdsData.kpis.roas || 0).toFixed(2) + "x" },
                        { label: "CTR", value: (googleAdsData.kpis.ctr || 0).toFixed(2) + "%" },
                      ].map((kpi) => (
                        <div key={kpi.label} style={{ background: "rgba(66,133,244,0.08)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(66,133,244,0.15)" }}>
                          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{kpi.label}</div>
                          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", marginTop: 4 }}>{kpi.value}</div>
                        </div>
                      ))}
                    </div>
                    {googleAdsData.campaigns && googleAdsData.campaigns.filter((c: any) => c.spend > 0).length > 0 && (
                      <div style={{ overflowX: "auto", marginTop: 16 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                              <th style={{ textAlign: "left", padding: "8px 12px", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{"Campagne"}</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{"Spend"}</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{"Clics"}</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{"Conv."}</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{"CPA"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {googleAdsData.campaigns.filter((c: any) => c.spend > 0).map((camp: any, i: number) => (
                              <tr key={camp.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                                <td style={{ padding: "8px 12px", color: "#fff" }}>{camp.name}</td>
                                <td style={{ textAlign: "right", padding: "8px 12px", color: "rgba(255,255,255,0.75)" }}>{"$"}{camp.spend.toLocaleString()}</td>
                                <td style={{ textAlign: "right", padding: "8px 12px", color: "rgba(255,255,255,0.75)" }}>{camp.clicks}</td>
                                <td style={{ textAlign: "right", padding: "8px 12px", color: "rgba(255,255,255,0.75)" }}>{camp.conversions?.toFixed(1)}</td>
                                <td style={{ textAlign: "right", padding: "8px 12px", color: "rgba(255,255,255,0.75)" }}>{"$"}{camp.cpa?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                    <button
                      onClick={generateAiRecommendations}
                      disabled={aiLoading}
                      style={{
                        width: "100%", padding: "16px 24px", borderRadius: 16, cursor: aiLoading ? "wait" : "pointer",
                        fontFamily: font, fontSize: 16, fontWeight: 800, color: "#fff", border: "none",
                        background: aiLoading ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, " + C.orange + ", #c46e0a)",
                        boxShadow: aiLoading ? "none" : "0 8px 32px rgba(232,145,45,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                        transition: "all 0.3s ease",
                      }}
                    >
                      {aiLoading ? (
                        <><LoaderCircle size={18} className="animate-spin" /> Analyse IA en cours...</>
                      ) : (
                        <><Sparkles size={18} /> G\u00e9n\u00e9rer les recommandations IA</>
                      )}
                    </button>
                    <div style={{ marginTop: 16, textAlign: "center" }}>
                      <button onClick={() => { setShowData(false); setStep(3); }} style={{ fontSize: 13, color: C.textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: font, fontWeight: 500 }}>\u2190 Modifier les param\u00e8tres</button>
                    </div>
                  </>
                );
              })()}
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

                {(() => {
                  const meta = selectedClient?.meta_data as MetaData | null | undefined;
                  if (!meta) return null;
                  const fmtM = (n: number) => "$" + (n >= 1000 ? (n/1000).toFixed(1) + "k" : n.toFixed(2));
                  return (
                    <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
                      {[
                        { label: "D\u00e9penses", value: fmtM(meta.spend) },
                        { label: "Leads", value: String(meta.leads) },
                        { label: "CPL", value: fmtM(meta.cpl) },
                        { label: "ROAS", value: meta.roas + "x" },
                      ].map((kpi) => (
                        <div key={kpi.label} style={{ textAlign: "center" as const }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>{kpi.label}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: font }}>{kpi.value}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

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
                    onClick={() => { setReportContent(null); setShowData(false); setAiLoading(false); setStep(0); setReportType(null); setPeriod(""); setSelectedClient(null); setSearch(""); setError(null); }}
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
