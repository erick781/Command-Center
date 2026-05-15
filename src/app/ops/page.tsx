"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  BarChart3,
  Bot,
  Code2,
  Coins,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";

import { Nav } from "@/components/nav";
import { useLanguage } from "@/components/language-provider";
import { loadCurrentUserAccess } from "@/lib/current-user-access";
import { getLanguageLocale } from "@/lib/language";

type OpsUsageBucket = {
  averageCostPerCall: number;
  cacheHitRate: number;
  cachedTokens: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  totalTokens: number;
};

type OpsUsageSummaryItem = {
  calls: number;
  estimatedCost: number;
  key: string;
  totalTokens: number;
};

type OpsRecentCall = {
  cacheHitRate: number;
  cachedTokens: number;
  clientName: string;
  endpoint: string;
  estimatedCost: number;
  id: string;
  inputTokens: number;
  modelUsed: string;
  outputTokens: number;
  totalTokens: number;
};

type OpsUsageResponse = {
  month: OpsUsageBucket;
  rateLimits: Record<string, { allowed: boolean; limit: number; used: number }>;
  recentCalls: OpsRecentCall[];
  today: OpsUsageBucket;
  topClients: OpsUsageSummaryItem[];
  topEndpoints: OpsUsageSummaryItem[];
  topModels: OpsUsageSummaryItem[];
};

const opsCopy = {
  en: {
    adminOnly: "Visible to admins only.",
    avgCost: "Average call",
    badge: "Ops",
    cacheHit: "Cache hit",
    callsMonth: "Calls this month",
    callsToday: "Calls today",
    clients: "Top clients today",
    costMonth: "Spend this month",
    costToday: "Spend today",
    demandBadge: "Usage Radar",
    demandDescription: "Cost, demand, pressure.",
    demandError: "Unable to load usage metrics.",
    demandHeading: "Costs and API demand",
    demandLoading: "Loading usage metrics...",
    links: [
      {
        description: "Live automations and queue.",
        href: "/ops/automations",
        icon: Bot,
        title: "Automations",
      },
      {
        description: "Watch useful GitHub repos.",
        href: "/ops/repo-radar",
        icon: Search,
        title: "Repo Radar",
      },
      {
        description: "Queue work for AI build.",
        href: "/ops/dev-requests",
        icon: Code2,
        title: "AI Dev",
      },
      {
        description: "Archived frontend surfaces.",
        href: "/ops/legacy",
        icon: Archive,
        title: "Legacy Archive",
      },
      {
        description: "Admin controls.",
        href: "/admin",
        icon: Shield,
        title: "Admin",
      },
    ],
    models: "Top models today",
    noUsageData: "No usage captured yet today.",
    note: "Ops stays focused. Legacy stays archived.",
    rateAvailable: "available",
    rateLimits: "Rate limits",
    rateUsed: "used",
    recentCalls: "Recent calls",
    refresh: "Refresh metrics",
    subtitle: "Monitor, steer, improve.",
    title: "Ops",
    topEndpoints: "Top endpoints today",
    totalTokens: "Tokens today",
    usageUsdNote: "AI cost estimates are shown in USD.",
  },
  fr: {
    adminOnly: "Visible pour les admins seulement.",
    avgCost: "Coût moyen par appel",
    badge: "Ops",
    cacheHit: "Taux de cache",
    callsMonth: "Appels ce mois-ci",
    callsToday: "Appels aujourd'hui",
    clients: "Top clients aujourd'hui",
    costMonth: "Coût ce mois-ci",
    costToday: "Coût aujourd'hui",
    demandBadge: "Radar usage",
    demandDescription: "Coût, demande, pression.",
    demandError: "Impossible de charger les métriques d'usage.",
    demandHeading: "Coûts et demande API",
    demandLoading: "Chargement des métriques d'usage...",
    links: [
      {
        description: "Automations live et queue.",
        href: "/ops/automations",
        icon: Bot,
        title: "Automations",
      },
      {
        description: "Surveille les bons repos GitHub.",
        href: "/ops/repo-radar",
        icon: Search,
        title: "Repo Radar",
      },
      {
        description: "Queue pour le dev AI.",
        href: "/ops/dev-requests",
        icon: Code2,
        title: "AI Dev",
      },
      {
        description: "Anciennes surfaces frontend.",
        href: "/ops/legacy",
        icon: Archive,
        title: "Archive legacy",
      },
      {
        description: "Contrôles admin.",
        href: "/admin",
        icon: Shield,
        title: "Admin",
      },
    ],
    models: "Top modèles aujourd'hui",
    noUsageData: "Aucun usage capturé pour l’instant aujourd’hui.",
    note: "Ops reste net. Le legacy reste archivé.",
    rateAvailable: "disponibles",
    rateLimits: "Limites",
    rateUsed: "utilisés",
    recentCalls: "Derniers appels",
    refresh: "Rafraîchir les métriques",
    subtitle: "Voir, piloter, améliorer.",
    title: "Ops",
    topEndpoints: "Top endpoints aujourd'hui",
    totalTokens: "Tokens aujourd'hui",
    usageUsdNote: "Les estimations de coût AI sont affichées en USD.",
  },
} as const;

const shellFont = "'Instrument Sans', system-ui, sans-serif";

function formatCurrency(locale: string, amount: number) {
  return new Intl.NumberFormat(locale, {
    currency: "USD",
    maximumFractionDigits: amount >= 10 ? 2 : 3,
    minimumFractionDigits: amount >= 10 ? 2 : 3,
    style: "currency",
  }).format(amount);
}

function formatCompact(locale: string, value: number) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: value >= 1000 ? 1 : 0,
    notation: value >= 1000 ? "compact" : "standard",
  }).format(value);
}

function formatPercent(locale: string, value: number) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: value > 0 && value < 10 ? 1 : 0,
  }).format(value);
}

function prettifyKey(value: string) {
  return value
    .replace(/^deliverable:/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\bapi\b/gi, "API")
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function MetricCard(props: {
  accent?: string;
  label: string;
  value: string;
}) {
  const { accent = "#E8912D", label, value } = props;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", flex: "1 1 0", minWidth: 0 }}>
      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.06em", flex: 1, minWidth: 0 }}>
        {label}
      </span>
      <span style={{ color: accent, fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" as const }}>
        {value}
      </span>
    </div>
  );
}

function SummaryList(props: {
  emptyLabel: string;
  items: OpsUsageSummaryItem[];
  locale: string;
  title: string;
}) {
  const { emptyLabel, items, locale, title } = props;

  return (
    <div
      style={{
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
        padding: 20,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>{title}</div>
      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {items.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>{emptyLabel}</div>
        ) : (
          items.map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
                padding: "12px 14px",
                transition: "background 0.15s",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "white", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {prettifyKey(item.key)}
                </div>
                <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, marginTop: 4 }}>
                  {formatCompact(locale, item.calls)} calls · {formatCompact(locale, item.totalTokens)} tokens
                </div>
              </div>
              <div style={{ color: "#f6c978", fontSize: 14, fontWeight: 700 }}>
                {formatCurrency(locale, item.estimatedCost)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function OpsPage() {
  const { language } = useLanguage();
  const locale = getLanguageLocale(language);
  const copy = opsCopy[language];
  const [canAdmin, setCanAdmin] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [usage, setUsage] = useState<OpsUsageResponse | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  const loadUsage = useCallback(
    async (allowLoad: boolean) => {
      if (!allowLoad) {
        setUsage(null);
        setUsageError(null);
        setLoadingUsage(false);
        return;
      }

      setLoadingUsage(true);
      setUsageError(null);

      try {
        const response = await fetch("/api/ops/usage", {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await response.json().catch(() => null)) as
          | (OpsUsageResponse & { error?: string })
          | null;

        if (!response.ok) {
          throw new Error(data?.error || copy.demandError);
        }

        setUsage(data as OpsUsageResponse);
      } catch (error) {
        setUsageError(error instanceof Error ? error.message : copy.demandError);
        setUsage(null);
      } finally {
        setLoadingUsage(false);
      }
    },
    [copy.demandError],
  );

  useEffect(() => {
    let active = true;

    const loadAccess = async () => {
      try {
        const access = await loadCurrentUserAccess();
        if (!active) {
          return;
        }

        setCanAdmin(access.isAdmin);
        setLoadingAccess(false);

        void loadUsage(access.isAdmin);
      } catch {
        if (!active) {
          return;
        }

        setCanAdmin(false);
        setLoadingAccess(false);
      }
    };

    void loadAccess();

    return () => {
      active = false;
    };
  }, [loadUsage]);

  const rateLimitCards = useMemo(
    () => Object.entries(usage?.rateLimits ?? {}),
    [usage?.rateLimits],
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <Nav />
      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "40px 20px 80px",
          color: "white",
          fontFamily: shellFont,
        }}
      >
        <div style={{ maxWidth: 760, marginBottom: 32 }}>
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
            <Sparkles size={14} />
            {copy.badge}
          </div>
          <h1
            style={{
              marginTop: 20,
              fontSize: 40,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              fontWeight: 800,
            }}
          >
            {copy.title}
          </h1>
          <p
            style={{
              marginTop: 12,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.7,
              fontSize: 15,
              maxWidth: 720,
            }}
          >
            {copy.subtitle}
          </p>
        </div>

        <nav>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
            {copy.links.map((item, idx) => {
              const Icon = item.icon;

              return (
                <li key={item.href} style={{ borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <Link
                    href={item.href}
                    className="transition-colors hover:bg-white/[0.04]"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 18px",
                      textDecoration: "none",
                      color: "white",
                    }}
                  >
                    <Icon size={16} aria-hidden="true" style={{ color: "#f6c978", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</span>
                    <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 13, marginLeft: "auto" }}>{item.description}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <section
          style={{
            marginTop: 26,
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "rgba(255,255,255,0.03)",
            padding: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ maxWidth: 760 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "rgba(232,145,45,0.08)",
                  border: "1px solid rgba(232,145,45,0.14)",
                  color: "#f6c978",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <Coins size={14} />
                {copy.demandBadge}
              </div>
              <h2
                style={{
                  marginTop: 18,
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                {copy.demandHeading}
              </h2>
              <p
                style={{
                  marginTop: 10,
                  color: "rgba(255,255,255,0.55)",
                  lineHeight: 1.7,
                  fontSize: 15,
                  maxWidth: 720,
                }}
              >
                {copy.demandDescription}
              </p>
            </div>

            {canAdmin ? (
              <button
                type="button"
                onClick={() => void loadUsage(true)}
                disabled={loadingUsage}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: "12px 16px",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loadingUsage ? "default" : "pointer",
                  opacity: loadingUsage ? 0.65 : 1,
                }}
              >
                <RefreshCw size={15} style={{ animation: loadingUsage ? "spin 1s linear infinite" : undefined }} />
                {copy.refresh}
              </button>
            ) : null}
          </div>

          <div style={{ marginTop: 12, color: "rgba(255,255,255,0.34)", fontSize: 13 }}>
            {copy.usageUsdNote}
          </div>

          {loadingAccess ? (
            <div style={{ marginTop: 20, color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
              {copy.demandLoading}
            </div>
          ) : !canAdmin ? (
            <div
              style={{
                marginTop: 20,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                padding: 18,
                color: "rgba(255,255,255,0.55)",
                fontSize: 14,
              }}
            >
              {copy.adminOnly}
            </div>
          ) : usageError ? (
            <div
              style={{
                marginTop: 20,
                borderRadius: 18,
                border: "1px solid rgba(239,68,68,0.28)",
                background: "rgba(239,68,68,0.12)",
                padding: 18,
                color: "#fecaca",
                fontSize: 14,
              }}
            >
              {usageError}
            </div>
          ) : loadingUsage && !usage ? (
            <div style={{ marginTop: 20, color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
              {copy.demandLoading}
            </div>
          ) : usage ? (
            <>
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  flexWrap: "wrap",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <MetricCard
                  label={copy.costToday}
                  value={formatCurrency(locale, usage.today.totalCost)}
                />
                <MetricCard
                  accent="#ffd980"
                  label={copy.callsToday}
                  value={formatCompact(locale, usage.today.calls)}
                />
                <MetricCard
                  label={copy.costMonth}
                  value={formatCurrency(locale, usage.month.totalCost)}
                />
                <MetricCard
                  accent="#f0b56b"
                  label={copy.callsMonth}
                  value={formatCompact(locale, usage.month.calls)}
                />
                <MetricCard
                  accent="#f7d58f"
                  label={copy.avgCost}
                  value={formatCurrency(locale, usage.today.averageCostPerCall)}
                />
                <MetricCard
                  accent="#f7d58f"
                  label={copy.cacheHit}
                  value={`${formatPercent(locale, usage.today.cacheHitRate)}%`}
                />
              </div>

              <div
                style={{
                  marginTop: 22,
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                }}
              >
                {rateLimitCards.map(([key, value]) => {
                  const remaining = Math.max(0, value.limit - value.used);

                  return (
                    <div
                      key={key}
                      style={{
                        borderRadius: 20,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.02)",
                        padding: 18,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f6c978" }}>
                        <Activity size={16} />
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{prettifyKey(key)}</span>
                      </div>
                      <div style={{ marginTop: 12, color: "white", fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        {formatCompact(locale, remaining)}
                      </div>
                      <div style={{ marginTop: 6, color: "rgba(255,255,255,0.42)", fontSize: 13 }}>
                        {copy.rateAvailable} · {formatCompact(locale, value.used)} {copy.rateUsed} /{" "}
                        {formatCompact(locale, value.limit)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: 22,
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                }}
              >
                <SummaryList
                  emptyLabel={copy.noUsageData}
                  items={usage.topEndpoints}
                  locale={locale}
                  title={copy.topEndpoints}
                />
                <SummaryList
                  emptyLabel={copy.noUsageData}
                  items={usage.topClients}
                  locale={locale}
                  title={copy.clients}
                />
                <SummaryList
                  emptyLabel={copy.noUsageData}
                  items={usage.topModels}
                  locale={locale}
                  title={copy.models}
                />
              </div>

              <div
                style={{
                  marginTop: 22,
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f6c978" }}>
                  <BarChart3 size={16} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: "white" }}>
                    {copy.recentCalls}
                  </span>
                </div>
                <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                  {usage.recentCalls.length === 0 ? (
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>{copy.noUsageData}</div>
                  ) : (
                    usage.recentCalls.map((call) => (
                      <div
                        key={call.id}
                        style={{
                          display: "grid",
                          gap: 8,
                          gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr) auto",
                          alignItems: "center",
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,0.06)",
                          background: "rgba(255,255,255,0.02)",
                          padding: "12px 14px",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "white", fontSize: 14, fontWeight: 600 }}>
                            {prettifyKey(call.endpoint || "unknown")}
                          </div>
                          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, marginTop: 4 }}>
                            {call.clientName || "—"}
                          </div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
                            {prettifyKey(call.modelUsed || "unknown")}
                          </div>
                          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, marginTop: 4 }}>
                            {formatCompact(locale, call.totalTokens)} tokens · {formatPercent(locale, call.cacheHitRate)}% cache
                          </div>
                        </div>
                        <div style={{ color: "#f6c978", fontSize: 14, fontWeight: 700 }}>
                          {formatCurrency(locale, call.estimatedCost)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}
        </section>

        <div
          style={{
            marginTop: 28,
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
            padding: 20,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.7,
            fontSize: 14,
          }}
        >
          {copy.note}
        </div>
      </main>
    </div>
  );
}
