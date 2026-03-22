"use client";

import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  status?: string;
  industry?: string;
  retainer_monthly?: number;
  website?: string;
  meta_data?: Record<string, unknown> | null;
};

type Campaign = {
  id: string;
  name: string;
  status?: string;
  spend?: number | null;
  cpl?: number | null;
  roas?: number | null;
  leads?: number | null;
  objective?: string | null;
  raw?: unknown;
};

type ClientMetaData = {
  campaigns?: unknown;
  campaign_names?: unknown;
  campaign_count?: unknown;
  active_campaigns?: unknown;
  spend?: unknown;
  cpl?: unknown;
  roas?: unknown;
  flags?: unknown;
};

type ReportRecord = {
  id: string;
  clientName: string;
  reportType: string;
  reportTypeLabel: string;
  period: string;
  selectedCampaigns: string[];
  generatedAt: string;
  content: string;
  context: string;
  summary: {
    campaigns: number;
    activeCampaigns: number;
    spend: number | null;
    cpl: number | null;
    roas: number | null;
  };
};

const REPORT_TYPES = [
  {
    value: "leadgen",
    label: "Lead Gen",
    description: "Pipeline, bookings, CPL, lead quality.",
  },
  {
    value: "coach",
    label: "Coach / High Ticket",
    description: "Applications, calls, closes, cash collected.",
  },
  {
    value: "ecommerce",
    label: "eCommerce",
    description: "ATC, checkout, purchases, revenue, ROAS.",
  },
] as const;

const PERIODS = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "60", label: "60d" },
  { value: "90", label: "90d" },
];

const STORAGE_KEY = "partenaire_recent_reports";

function toNumber(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function safeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getClientMeta(client: Client | null): ClientMetaData {
  return (client?.meta_data ?? {}) as ClientMetaData;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const htmlParts: string[] = [];
  let inUl = false;
  let inOl = false;

  function closeList() {
    if (inUl) { htmlParts.push('</ul>'); inUl = false; }
    if (inOl) { htmlParts.push('</ol>'); inOl = false; }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) { closeList(); continue; }

    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      closeList();
      htmlParts.push('<hr/>');
      continue;
    }

    const h1Match = line.match(/^#\s+(.+)/);
    if (h1Match) { closeList(); htmlParts.push('<h1>' + inlineMd(h1Match[1]) + '</h1>'); continue; }
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) { closeList(); htmlParts.push('<h2>' + inlineMd(h2Match[1]) + '</h2>'); continue; }
    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) { closeList(); htmlParts.push('<h3>' + inlineMd(h3Match[1]) + '</h3>'); continue; }
    const h4Match = line.match(/^####\s+(.+)/);
    if (h4Match) { closeList(); htmlParts.push('<h4>' + inlineMd(h4Match[1]) + '</h4>'); continue; }

    const ulMatch = line.match(/^[\-\*]\s+(.+)/);
    if (ulMatch) {
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (!inUl) { htmlParts.push('<ul>'); inUl = true; }
      htmlParts.push('<li>' + inlineMd(ulMatch[1]) + '</li>');
      continue;
    }

    const olMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (olMatch) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (!inOl) { htmlParts.push('<ol>'); inOl = true; }
      htmlParts.push('<li>' + inlineMd(olMatch[2]) + '</li>');
      continue;
    }

    closeList();
    htmlParts.push('<p>' + inlineMd(line) + '</p>');
  }

  closeList();
  return htmlParts.join('\n');
}

function inlineMd(text: string): string {
  let result = escapeHtml(text);
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  result = result.replace(/_([^_]+?)_/g, '<em>$1</em>');
  return result;
}

function defaultCampaigns(client: Client): Campaign[] {
  const meta = getClientMeta(client);
  const rawCampaigns = meta.campaigns ?? meta.campaign_names;

  if (Array.isArray(rawCampaigns)) {
    return rawCampaigns
      .map((item, index) => {
        if (typeof item === "string") {
          return {
            id: `${client.id}-${index}`,
            name: item,
            status: index === 0 ? "active" : "paused",
            raw: item,
          } satisfies Campaign;
        }

        if (item && typeof item === "object") {
          const campaign = item as Record<string, unknown>;
          return {
            id: safeText(campaign.id) || safeText(campaign.campaign_id) || `${client.id}-${index}`,
            name: safeText(campaign.name) || safeText(campaign.campaign_name) || `Campaign ${index + 1}`,
            status: safeText(campaign.status) || safeText(campaign.delivery_status),
            spend: toNumber(campaign.spend ?? campaign.amount_spent ?? campaign.cost),
            cpl: toNumber(campaign.cpl ?? campaign.cost_per_lead),
            roas: toNumber(campaign.roas),
            leads: toNumber(campaign.leads ?? campaign.results),
            objective: safeText(campaign.objective),
            raw: campaign,
          } satisfies Campaign;
        }

        return null;
      })
      .filter(Boolean) as Campaign[];
  }

  if (rawCampaigns && typeof rawCampaigns === "object") {
    return Object.entries(rawCampaigns as Record<string, unknown>).map(([name, value], index) => ({
      id: `${client.id}-${index}-${name}`,
      name,
      status: value && typeof value === "object" ? safeText((value as Record<string, unknown>).status) : "active",
      spend: value && typeof value === "object" ? toNumber((value as Record<string, unknown>).spend) : null,
      cpl: value && typeof value === "object" ? toNumber((value as Record<string, unknown>).cpl) : null,
      roas: value && typeof value === "object" ? toNumber((value as Record<string, unknown>).roas) : null,
      raw: value,
    }));
  }

  const metaCampaignCount = toNumber(meta.campaign_count);
  return Array.from({ length: metaCampaignCount && metaCampaignCount > 0 ? Math.min(metaCampaignCount, 5) : 0 }).map((_, index) => ({
    id: `${client.id}-fallback-${index}`,
    name: `Campaign ${index + 1}`,
    status: index === 0 ? "active" : "paused",
  }));
}

function buildClientSummary(client: Client | null) {
  if (!client) {
    return {
      campaigns: 0,
      activeCampaigns: 0,
      spend: null as number | null,
      cpl: null as number | null,
      roas: null as number | null,
      flags: [] as string[],
      campaignsList: [] as Campaign[],
    };
  }

  const meta = getClientMeta(client);
  const campaignsList = defaultCampaigns(client);
  const summaryCampaigns = toNumber(meta.campaign_count) ?? campaignsList.length;
  const activeCampaigns = toNumber(meta.active_campaigns) ?? campaignsList.filter((campaign) => campaign.status === "active").length;
  const spend = toNumber(meta.spend);
  const cpl = toNumber(meta.cpl);
  const roas = toNumber(meta.roas);
  const flags = Array.isArray(meta.flags) ? (meta.flags as unknown[]).map((flag) => String(flag)) : [];

  return {
    campaigns: summaryCampaigns,
    activeCampaigns,
    spend,
    cpl,
    roas,
    flags,
    campaignsList,
  };
}

function buildContext(client: Client, reportType: string, period: string, selectedCampaigns: Campaign[], notes: string) {
  const summary = buildClientSummary(client);
  const meta = getClientMeta(client);
  const selectedNames = selectedCampaigns.length ? selectedCampaigns.map((campaign) => campaign.name).join(", ") : "All campaigns";

  const contextLines = [
    `Client: ${client.name}`,
    `Type: ${reportType}`,
    `Periode: ${period} jours`,
    `Selected campaigns: ${selectedNames}`,
    `Campaign count: ${summary.campaigns}`,
    `Campagnes actives: ${summary.activeCampaigns}`,
    summary.spend !== null ? `Spend: ${summary.spend}` : "",
    summary.cpl !== null ? `CPL: ${summary.cpl}` : "",
    summary.roas !== null ? `ROAS: ${summary.roas}` : "",
    client.industry ? `Industry: ${client.industry}` : "",
    client.website ? `Website: ${client.website}` : "",
    Array.isArray(meta.flags) && meta.flags.length
      ? `Flags: ${(meta.flags as string[]).join(" | ")}`
      : "",
    notes ? `Notes: ${notes}` : "",
  ].filter(Boolean);

  return contextLines.join("\n");
}

function buildReportHtml(report: ReportRecord) {
  const campaignLines = report.selectedCampaigns.length
    ? report.selectedCampaigns.map((name) => `<li>${escapeHtml(name)}</li>`).join("")
    : "<li>All campaigns</li>";

  const paragraphs = renderMarkdown(report.content);

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${report.clientName} - ${report.reportTypeLabel}</title>
  <style>
    body { margin: 0; font-family: Montserrat, Arial, sans-serif; background: #111113; color: #f6f7ff; }
    .wrap { max-width: 980px; margin: 0 auto; padding: 40px 24px 56px; }
    .hero { border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 20px; margin-bottom: 28px; }
    .eyebrow { color: #E8912D; text-transform: uppercase; letter-spacing: 0.18em; font-size: 11px; font-weight: 700; }
    h1 { margin: 10px 0 8px; font-size: 38px; line-height: 1.05; }
    .sub { color: rgba(246,247,255,0.55); font-size: 14px; line-height: 1.7; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 28px 0; }
    .card { background: #1a1a1f; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 18px; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: rgba(246,247,255,0.4); margin-bottom: 8px; }
    .value { font-size: 24px; font-weight: 800; }
    .section { margin-top: 24px; }
    .section > h2 { font-size: 18px; margin: 0 0 12px; color: #E8912D; }
    .ai-content h1 { font-size: 28px; font-weight: 800; color: #E8912D; margin: 32px 0 16px; line-height: 1.2; }
    .ai-content h2 { font-size: 22px; font-weight: 700; color: #E8912D; margin: 28px 0 12px; line-height: 1.3; }
    .ai-content h3 { font-size: 17px; font-weight: 700; color: rgba(246,247,255,0.9); margin: 22px 0 10px; line-height: 1.4; }
    .ai-content h4 { font-size: 14px; font-weight: 700; color: rgba(246,247,255,0.8); margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.06em; }
    .ai-content strong { color: rgba(246,247,255,0.95); font-weight: 700; }
    ul { margin: 8px 0; padding-left: 20px; color: rgba(246,247,255,0.8); }
    ol { margin: 8px 0; padding-left: 20px; color: rgba(246,247,255,0.8); }
    li { margin-bottom: 6px; line-height: 1.7; }
    p { color: rgba(246,247,255,0.78); line-height: 1.7; margin: 8px 0; }
    hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0; }
    .meta { display: flex; flex-wrap: wrap; gap: 10px; color: rgba(246,247,255,0.45); font-size: 12px; }
    .tag { display: inline-block; padding: 6px 10px; border-radius: 999px; background: rgba(232,145,45,0.12); color: #f4c87d; }
    @media (max-width: 800px) { .grid { grid-template-columns: repeat(2, 1fr); } h1 { font-size: 30px; } }
    @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } .wrap { padding: 24px 16px 48px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div class="eyebrow">Partenaire.io Report</div>
      <h1>${escapeHtml(report.clientName)}</h1>
      <div class="sub">${escapeHtml(report.reportTypeLabel)} · ${escapeHtml(report.period)} days · Generated ${escapeHtml(formatDate(report.generatedAt))}</div>
      <div class="meta" style="margin-top:14px;">
        <span class="tag">${escapeHtml(String(report.summary.campaigns))} campaigns</span>
        <span class="tag">${escapeHtml(String(report.summary.activeCampaigns))} active</span>
        <span class="tag">Spend ${escapeHtml(formatMoney(report.summary.spend))}</span>
        <span class="tag">CPL ${escapeHtml(formatMoney(report.summary.cpl))}</span>
        <span class="tag">ROAS ${escapeHtml(formatNumber(report.summary.roas, 1))}x</span>
      </div>
    </div>

    <div class="grid">
      <div class="card"><div class="label">Campaigns</div><div class="value">${escapeHtml(String(report.summary.campaigns))}</div></div>
      <div class="card"><div class="label">Active</div><div class="value">${escapeHtml(String(report.summary.activeCampaigns))}</div></div>
      <div class="card"><div class="label">Spend</div><div class="value">${escapeHtml(formatMoney(report.summary.spend))}</div></div>
      <div class="card"><div class="label">ROAS</div><div class="value">${escapeHtml(formatNumber(report.summary.roas, 1))}x</div></div>
    </div>

    <div class="section">
      <h2>Selected campaigns</h2>
      <ul>${campaignLines}</ul>
    </div>

    <div class="section">
      <h2>AI recommendations</h2>
      <div class="ai-content">
        ${paragraphs || "<p>No recommendations were generated yet.</p>"}
      </div>
    </div>
  </div>
</body>
</html>`;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function openReportDocument(report: ReportRecord) {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;

  win.document.open();
  win.document.write(buildReportHtml(report));
  win.document.close();
}

function downloadReportDocument(report: ReportRecord) {
  const blob = new Blob([buildReportHtml(report)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${report.reportType}-${report.period}d-report.html`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function RapportsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [reportType, setReportType] = useState("leadgen");
  const [period, setPeriod] = useState("30");
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportError, setReportError] = useState("");
  const [recentReports, setRecentReports] = useState<ReportRecord[]>([]);
  const [initialized, setInitialized] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL ?? "";

  const summary = buildClientSummary(selectedClient);
  const selectedCampaigns = summary.campaignsList.filter((campaign) => selectedCampaignIds.includes(campaign.id));
  const reportTypeMeta = REPORT_TYPES.find((type) => type.value === reportType) ?? REPORT_TYPES[0];
  const filteredClients = clients.filter((client) => client.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10);
  const openReport = reportText.trim().length > 0;

  useEffect(() => {
    let mounted = true;

    const loadClients = async () => {
      try {
        const response = await fetch(`${API}/api/client-hub/clients?show_hidden=true`);
        const data = await response.json();
        if (!mounted) return;
        setClients(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setClients([]);
      }
    };

    loadClients();

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentReports(parsed.slice(0, 6));
        }
      }
    } catch {
      setRecentReports([]);
    }

    const params = new URLSearchParams(window.location.search);
    const clientParam = params.get("client");
    if (clientParam) setSearch(clientParam);
    const typeParam = params.get("type");
    if (typeParam && REPORT_TYPES.some((type) => type.value === typeParam)) setReportType(typeParam);
    const periodParam = params.get("period");
    if (periodParam && PERIODS.some((item) => item.value === periodParam)) setPeriod(periodParam);

    setInitialized(true);

    return () => {
      mounted = false;
    };
  }, [API]);

  useEffect(() => {
    if (!initialized || selectedClient || !search.trim()) return;
    const exactMatch = clients.find((client) => client.name.toLowerCase() === search.trim().toLowerCase());
    if (exactMatch) {
      selectClient(exactMatch);
    }
  }, [clients, initialized, search, selectedClient]);

  useEffect(() => {
    if (!selectedClient) return;
    setSelectedCampaignIds(summary.campaignsList.filter((campaign) => campaign.status === "active").map((campaign) => campaign.id));
    if (!summary.campaignsList.length) setSelectedCampaignIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient?.id]);

  function persistRecentReports(nextReports: ReportRecord[]) {
    setRecentReports(nextReports);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextReports.slice(0, 6)));
    } catch {
      // Ignore storage issues in the browser.
    }
  }

  function selectClient(client: Client) {
    setSelectedClient(client);
    setSearch(client.name);
    setShowClientPicker(false);
    setReportError("");
    setReportText("");

    const campaigns = defaultCampaigns(client);
    const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active");
    setSelectedCampaignIds((activeCampaigns.length ? activeCampaigns : campaigns.slice(0, 2)).map((campaign) => campaign.id));
  }

  async function generateReport() {
    if (!selectedClient) return;

    setLoading(true);
    setReportError("");
    setReportText("");

    try {
      const selectedCampaignObjects = summary.campaignsList.filter((campaign) => selectedCampaignIds.includes(campaign.id));
      const context = buildContext(selectedClient, reportType, period, selectedCampaignObjects, notes.trim());

      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: selectedClient.name,
          reportType,
          context,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Report request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setReportText(content);
      }

      const now = new Date().toISOString();
      const record: ReportRecord = {
        id: makeId(),
        clientName: selectedClient.name,
        reportType,
        reportTypeLabel: reportTypeMeta.label,
        period,
        selectedCampaigns: selectedCampaignObjects.map((campaign) => campaign.name),
        generatedAt: now,
        content,
        context,
        summary: {
          campaigns: summary.campaigns,
          activeCampaigns: summary.activeCampaigns,
          spend: summary.spend,
          cpl: summary.cpl,
          roas: summary.roas,
        },
      };

      const nextReports = [record, ...recentReports.filter((item) => item.id !== record.id)].slice(0, 6);
      persistRecentReports(nextReports);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Unable to generate report");
    } finally {
      setLoading(false);
    }
  }

  function openCurrentReport() {
    if (!selectedClient || !openReport) return;

    const report: ReportRecord = {
      id: makeId(),
      clientName: selectedClient.name,
      reportType,
      reportTypeLabel: reportTypeMeta.label,
      period,
      selectedCampaigns: selectedCampaigns.map((campaign) => campaign.name),
      generatedAt: new Date().toISOString(),
      content: reportText,
      context: buildContext(selectedClient, reportType, period, selectedCampaigns, notes.trim()),
      summary: {
        campaigns: summary.campaigns,
        activeCampaigns: summary.activeCampaigns,
        spend: summary.spend,
        cpl: summary.cpl,
        roas: summary.roas,
      },
    };

    openReportDocument(report);
  }

  function downloadCurrentReport() {
    if (!selectedClient || !openReport) return;

    const report: ReportRecord = {
      id: makeId(),
      clientName: selectedClient.name,
      reportType,
      reportTypeLabel: reportTypeMeta.label,
      period,
      selectedCampaigns: selectedCampaigns.map((campaign) => campaign.name),
      generatedAt: new Date().toISOString(),
      content: reportText,
      context: buildContext(selectedClient, reportType, period, selectedCampaigns, notes.trim()),
      summary: {
        campaigns: summary.campaigns,
        activeCampaigns: summary.activeCampaigns,
        spend: summary.spend,
        cpl: summary.cpl,
        roas: summary.roas,
      },
    };

    downloadReportDocument(report);
  }

  function loadRecentReport(report: ReportRecord) {
    const matchedClient = clients.find((client) => client.name === report.clientName) ?? null;
    setSelectedClient((current) => current?.name === report.clientName ? current : matchedClient);
    setSearch(report.clientName);
    setReportType(report.reportType);
    setPeriod(report.period);
    setReportText(report.content);
    if (matchedClient) {
      const matchedCampaigns = defaultCampaigns(matchedClient).filter((campaign) => report.selectedCampaigns.includes(campaign.name));
      setSelectedCampaignIds(matchedCampaigns.map((campaign) => campaign.id));
    } else {
      setSelectedCampaignIds([]);
    }
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="mb-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#17171b]/95 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="grid gap-6 p-5 md:p-8 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="relative overflow-hidden rounded-[24px] border border-white/[0.06] bg-[linear-gradient(135deg,rgba(232,145,45,0.12),rgba(255,255,255,0.02))] p-5 md:p-6">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#E8912D]/10 blur-3xl" />
              <Badge className="mb-4 border-[#E8912D]/20 bg-[#E8912D]/12 text-[#f4c87d]">
                Rapports IA
              </Badge>
              <h1 className="max-w-2xl text-3xl font-extrabold tracking-[-0.04em] text-white md:text-5xl">
                Rapports & Recommandations
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50 md:text-base">
                Sélectionnez un client, choisissez les campagnes, générez un rapport IA en temps réel.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Clients chargés", value: clients.length || "—" },
                  { label: "Campagnes en cours", value: summary.campaigns || "—" },
                  { label: "Campagnes actives", value: summary.activeCampaigns || "—" },
                  { label: "Rapports sauvegardés", value: recentReports.length || "—" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <div className="text-[10px] uppercase tracking-[0.28em] text-white/32">{item.label}</div>
                    <div className="mt-2 text-2xl font-bold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-white/[0.06] bg-[#1a1a1f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm tracking-[-0.02em] text-white">Contexte du rapport</CardTitle>
                <p className="text-xs text-white/35">
                  {selectedClient ? "Données tirées du client et des campagnes en temps réel." : "Sélectionnez un client pour charger le contexte."}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-white/30">Client</div>
                  <div className="mt-2 text-lg font-semibold text-white">{selectedClient?.name ?? "Aucun client sélectionné"}</div>
                  <div className="mt-1 text-xs text-white/45">
                    {selectedClient?.industry || "Industrie non définie"}
                    {selectedClient?.website ? ` · ${selectedClient.website}` : ""}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Spend", value: formatMoney(summary.spend) },
                    { label: "CPL", value: formatMoney(summary.cpl) },
                    { label: "ROAS", value: `${formatNumber(summary.roas, 1)}x` },
                    { label: "Retainer", value: selectedClient?.retainer_monthly ? formatMoney(selectedClient.retainer_monthly) : "—" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-white/28">{item.label}</div>
                      <div className="mt-2 text-lg font-bold text-white">{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    onClick={generateReport}
                    disabled={!selectedClient || loading}
                    className="bg-[#E8912D] text-white hover:bg-[#E8912D]/85"
                  >
                    {loading ? "Generating..." : "Generate report"}
                  </Button>
                  <Button
                    onClick={openCurrentReport}
                    disabled={!openReport}
                    variant="outline"
                    className="border-white/10 text-white/60 hover:bg-white/[0.05]"
                  >
                    Open report
                  </Button>
                  <Button
                    onClick={downloadCurrentReport}
                    disabled={!openReport}
                    variant="outline"
                    className="border-white/10 text-white/60 hover:bg-white/[0.05]"
                  >
                    Download HTML
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <Card className="border-white/[0.06] bg-[#1a1a1f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-[-0.02em] text-white">Build the report</CardTitle>
                <p className="text-sm text-white/35">Search a client, select the campaigns, then generate recommendations with live context.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                  <div className="relative">
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-white/38">Client</label>
                    <Input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setShowClientPicker(true);
                        setSelectedClient(null);
                        setReportText("");
                      }}
                      onFocus={() => setShowClientPicker(true)}
                      placeholder="Search a client..."
                      className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/25"
                    />
                    {showClientPicker && search.trim() && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-auto rounded-2xl border border-white/[0.08] bg-[#111113] shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                        {filteredClients.length > 0 ? (
                          filteredClients.map((client) => {
                            const clientCampaigns = defaultCampaigns(client);
                            const activeCampaignCount = clientCampaigns.filter((campaign) => campaign.status === "active").length;
                            return (
                              <button
                                key={client.id}
                                type="button"
                                onClick={() => selectClient(client)}
                                className="flex w-full items-center justify-between gap-4 border-b border-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.04] last:border-b-0"
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-white">{client.name}</div>
                                  <div className="mt-1 text-[11px] text-white/35">
                                    {client.industry || "No industry"} · {clientCampaigns.length} campaigns · {activeCampaignCount} active
                                  </div>
                                </div>
                                <Badge className="border-white/[0.08] bg-white/[0.03] text-white/50">
                                  Select
                                </Badge>
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-4 py-6 text-center text-sm text-white/30">
                            No live client matched that search.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-white/38">Report type</label>
                    <select
                      value={reportType}
                      onChange={(event) => setReportType(event.target.value)}
                      className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
                    >
                      {REPORT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 text-xs text-white/32">{reportTypeMeta.description}</div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.24em] text-white/38">Period</label>
                    <span className="text-[11px] text-white/28">Matches the V1 period selector pattern.</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PERIODS.map((item) => (
                      <Button
                        key={item.value}
                        type="button"
                        onClick={() => setPeriod(item.value)}
                        variant={period === item.value ? "default" : "outline"}
                        size="sm"
                        className={period === item.value ? "bg-[#E8912D] text-white" : "border-white/10 text-white/55 hover:bg-white/[0.05]"}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.24em] text-white/38">Campaigns</label>
                    <span className="text-[11px] text-white/28">
                      {selectedCampaignIds.length ? `${selectedCampaignIds.length} selected` : "Use the client metadata if available"}
                    </span>
                  </div>
                  {summary.campaignsList.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {summary.campaignsList.map((campaign) => {
                        const selected = selectedCampaignIds.includes(campaign.id);
                        return (
                          <button
                            key={campaign.id}
                            type="button"
                            onClick={() => {
                              setSelectedCampaignIds((current) =>
                                current.includes(campaign.id)
                                  ? current.filter((id) => id !== campaign.id)
                                  : [...current, campaign.id],
                              );
                            }}
                            className={`rounded-full border px-3 py-2 text-left text-[12px] transition ${
                              selected
                                ? "border-[#E8912D]/30 bg-[#E8912D]/12 text-[#f4c87d]"
                                : "border-white/[0.08] bg-white/[0.03] text-white/55 hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className="font-medium">{campaign.name}</div>
                            <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-white/28">
                              {campaign.status || "unknown"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-4 text-sm text-white/35">
                      No campaign metadata is available for this client yet. The report can still be generated from the client-level context.
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-white/38">Extra context</label>
                  <Textarea
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add context from calls, launch notes, client concerns, or anything the report should account for..."
                    className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/25"
                  />
                </div>

                {reportError && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-200">
                    {reportError}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={generateReport}
                    disabled={!selectedClient || loading}
                    className="bg-[#E8912D] text-white hover:bg-[#E8912D]/85"
                  >
                    {loading ? "Generating report..." : "Generate report"}
                  </Button>
                  <Button
                    onClick={openCurrentReport}
                    disabled={!openReport}
                    variant="outline"
                    className="border-white/10 text-white/55 hover:bg-white/[0.05]"
                  >
                    Open report
                  </Button>
                  <Button
                    onClick={downloadCurrentReport}
                    disabled={!openReport}
                    variant="outline"
                    className="border-white/10 text-white/55 hover:bg-white/[0.05]"
                  >
                    Download HTML
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedClient(null);
                      setSearch("");
                      setSelectedCampaignIds([]);
                      setReportText("");
                      setReportError("");
                    }}
                    variant="outline"
                    className="border-white/10 text-white/35 hover:bg-white/[0.05]"
                  >
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/[0.06] bg-[#1a1a1f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-[-0.02em] text-white">Report preview</CardTitle>
                <p className="text-sm text-white/35">
                  This is the exact content that will open or download, so the workflow stays honest.
                </p>
              </CardHeader>
              <CardContent>
                {openReport ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border-[#E8912D]/20 bg-[#E8912D]/12 text-[#f4c87d]">
                          {reportTypeMeta.label}
                        </Badge>
                        <Badge className="border-white/[0.08] bg-white/[0.03] text-white/45">
                          {period} day window
                        </Badge>
                        <Badge className="border-white/[0.08] bg-white/[0.03] text-white/45">
                          {formatDate(new Date().toISOString())}
                        </Badge>
                      </div>
                      <div className="mt-4 text-2xl font-bold tracking-[-0.03em] text-white">
                        {selectedClient?.name}
                      </div>
                      <div className="mt-1 text-sm text-white/40">
                        {selectedClient?.industry || "No industry provided"}
                        {selectedCampaigns.length ? ` · ${selectedCampaigns.length} selected campaigns` : ""}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {[
                        { label: "Campaigns", value: summary.campaigns },
                        { label: "Active", value: summary.activeCampaigns },
                        { label: "Spend", value: formatMoney(summary.spend) },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                          <div className="text-[10px] uppercase tracking-[0.24em] text-white/28">{item.label}</div>
                          <div className="mt-2 text-lg font-bold text-white">{item.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/32">
                        Recommendations
                      </div>
                      <div
                        className="mt-3 text-sm leading-7 text-white/70 [&>h1]:text-2xl [&>h1]:font-extrabold [&>h1]:text-[#E8912D] [&>h1]:mt-6 [&>h1]:mb-3 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:text-[#E8912D] [&>h2]:mt-5 [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-bold [&>h3]:text-white/90 [&>h3]:mt-4 [&>h3]:mb-2 [&>h4]:text-sm [&>h4]:font-bold [&>h4]:text-white/80 [&>h4]:mt-3 [&>h4]:mb-1 [&>h4]:uppercase [&>h4]:tracking-wider [&_strong]:text-white/95 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:my-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:my-2 [&_li]:mb-1 [&>hr]:border-white/10 [&>hr]:my-5"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(reportText) }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-8 text-center text-sm text-white/30">
                    Generate a report to see the preview here.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="border-white/[0.06] bg-[#1a1a1f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm tracking-[-0.02em] text-white">Client summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedClient ? (
                  <>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <div className="text-lg font-semibold text-white">{selectedClient.name}</div>
                      <div className="mt-1 text-xs text-white/42">
                        {selectedClient.industry || "No industry"}{selectedClient.website ? ` · ${selectedClient.website}` : ""}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="border-white/[0.08] bg-white/[0.03] text-white/50">
                          {summary.campaigns} campaigns
                        </Badge>
                        <Badge className="border-white/[0.08] bg-white/[0.03] text-white/50">
                          {summary.activeCampaigns} active
                        </Badge>
                        {selectedClient.status && (
                          <Badge className="border-[#E8912D]/20 bg-[#E8912D]/12 text-[#f4c87d]">
                            {selectedClient.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Spend", value: formatMoney(summary.spend) },
                        { label: "CPL", value: formatMoney(summary.cpl) },
                        { label: "ROAS", value: `${formatNumber(summary.roas, 1)}x` },
                        { label: "Retainer", value: selectedClient.retainer_monthly ? formatMoney(selectedClient.retainer_monthly) : "—" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                          <div className="text-[10px] uppercase tracking-[0.24em] text-white/28">{item.label}</div>
                          <div className="mt-2 text-lg font-bold text-white">{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {summary.flags.length > 0 && (
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-4">
                        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-red-200">
                          Active flags
                        </div>
                        <div className="mt-3 space-y-2">
                          {summary.flags.map((flag) => (
                            <div key={flag} className="rounded-xl border border-red-500/15 bg-black/15 px-3 py-2 text-sm text-red-100">
                              {flag}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-4 text-sm text-white/32">
                    Search and select a client to pull in their live report context.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/[0.06] bg-[#1a1a1f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm tracking-[-0.02em] text-white">Recent reports</CardTitle>
                <p className="text-xs text-white/35">Stored locally so the page keeps a useful workflow history.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentReports.length > 0 ? (
                  recentReports.map((report) => (
                    <div
                      key={report.id}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{report.clientName}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/28">
                            {report.reportTypeLabel} · {report.period}d
                          </div>
                        </div>
                        <Badge className="border-white/[0.08] bg-white/[0.03] text-white/45">
                          {formatDate(report.generatedAt)}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          onClick={() => {
                            loadRecentReport(report);
                            openReportDocument(report);
                          }}
                          size="sm"
                          className="bg-[#E8912D] text-white hover:bg-[#E8912D]/85"
                        >
                          Open
                        </Button>
                        <Button
                          onClick={() => {
                            loadRecentReport(report);
                            downloadReportDocument(report);
                          }}
                          size="sm"
                          variant="outline"
                          className="border-white/10 text-white/55 hover:bg-white/[0.05]"
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-4 text-sm text-white/32">
                    No recent reports yet. Generate one and it will appear here.
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>
    </div>
  );
}
