"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";

import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { loadCurrentUserAccess } from "@/lib/current-user-access";
import { getLanguageLocale } from "@/lib/language";

type DevRequestStatus =
  | "pending"
  | "planned"
  | "in_progress"
  | "live"
  | "blocked"
  | "done";

type DevRequestRecord = {
  context: string;
  createdAt: string;
  createdBy: string;
  fitScore: number | null;
  id: string;
  implementationIdeas: string[];
  modelId: string;
  originReviewId: string;
  priority: "low" | "medium" | "high" | "urgent";
  recommendation: string;
  repoFullName: string;
  repoUrl: string;
  requestedOutcome: string;
  risks: string[];
  source: "manual" | "repo_radar";
  status: DevRequestStatus;
  summary: string;
  title: string;
  updatedAt: string;
  updatedBy: string;
  whyItMatters: string;
};

type DevRequestsResponse = {
  requests: DevRequestRecord[];
  summary: {
    done: number;
    inProgress: number;
    live: number;
    pending: number;
    repoRadar: number;
  };
};

const copy = {
  en: {
    accessDenied: "Visible to admins only.",
    aiBrief: "AI dev brief",
    badge: "AI Dev Queue",
    done: "Done",
    empty: "No AI development requests yet.",
    heading: "AI development queue",
    inProgress: "In progress",
    loadError: "Unable to load AI development requests.",
    loading: "Loading AI development queue...",
    live: "Live",
    pending: "Pending",
    refresh: "Refresh",
    repoRadar: "From Repo Radar",
    sourceManual: "Manual",
    sourceRepoRadar: "Repo Radar",
    subtitle: "From idea to build.",
    updateError: "Unable to update development request.",
    updated: "Saved.",
  },
  fr: {
    accessDenied: "Visible pour les admins seulement.",
    aiBrief: "Brief AI dev",
    badge: "Queue AI Dev",
    done: "Complété",
    empty: "Aucune demande AI dev pour le moment.",
    heading: "Queue de développement AI",
    inProgress: "En cours",
    loadError: "Impossible de charger les demandes AI dev.",
    loading: "Chargement de la queue AI dev...",
    live: "Live",
    pending: "En attente",
    refresh: "Rafraîchir",
    repoRadar: "Depuis Repo Radar",
    sourceManual: "Manuel",
    sourceRepoRadar: "Repo Radar",
    subtitle: "De l'idée au build.",
    updateError: "Impossible de mettre à jour la demande AI dev.",
    updated: "Sauvegardé.",
  },
} as const;

const statusOptions: DevRequestStatus[] = [
  "pending",
  "planned",
  "in_progress",
  "live",
  "blocked",
  "done",
];

const shellFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

function formatDate(locale: string, value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusLabel(language: "fr" | "en", status: DevRequestStatus) {
  const labels = copy[language];

  if (status === "in_progress") return labels.inProgress;
  if (status === "live") return labels.live;
  if (status === "done") return labels.done;
  if (status === "planned") return language === "fr" ? "Planifié" : "Planned";
  if (status === "blocked") return language === "fr" ? "Bloqué" : "Blocked";
  return labels.pending;
}

function statusTone(status: DevRequestStatus) {
  if (status === "done" || status === "live") {
    return "rgba(126,240,178,0.18)";
  }

  if (status === "blocked") {
    return "rgba(245,122,122,0.18)";
  }

  if (status === "in_progress" || status === "planned") {
    return "rgba(246,201,120,0.18)";
  }

  return "rgba(255,255,255,0.08)";
}

function buildBrief(request: DevRequestRecord) {
  const parts = [
    `Repo: ${request.repoFullName || "n/a"}`,
    request.repoUrl ? `URL: ${request.repoUrl}` : "",
    request.summary ? `Summary: ${request.summary}` : "",
    request.whyItMatters ? `Why it matters: ${request.whyItMatters}` : "",
    request.requestedOutcome ? `Requested outcome: ${request.requestedOutcome}` : "",
    request.implementationIdeas.length > 0
      ? `Implementation ideas: ${request.implementationIdeas.join(" | ")}`
      : "",
    request.risks.length > 0 ? `Risks: ${request.risks.join(" | ")}` : "",
    request.context ? `Extra context: ${request.context}` : "",
  ];

  return parts.filter(Boolean).join("\n\n");
}

export default function DevRequestsPage() {
  const { language } = useLanguage();
  const locale = getLanguageLocale(language);
  const labels = copy[language];
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DevRequestsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async (allowLoad: boolean) => {
    if (!allowLoad) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ops/dev-requests", {
        cache: "no-store",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as
        | (DevRequestsResponse & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || labels.loadError);
      }

      setData(payload as DevRequestsResponse);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : labels.loadError);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [labels.loadError]);

  useEffect(() => {
    let active = true;

    const loadAccess = async () => {
      try {
        const access = await loadCurrentUserAccess();
        if (!active) return;

        setIsAdmin(access.isAdmin);
        void loadData(access.isAdmin);
      } catch {
        if (!active) return;
        setIsAdmin(false);
        setLoading(false);
      }
    };

    void loadAccess();

    return () => {
      active = false;
    };
  }, [loadData]);

  const requests = useMemo(() => data?.requests ?? [], [data?.requests]);

  const updateStatus = useCallback(
    async (id: string, status: DevRequestStatus) => {
      setUpdatingId(id);
      setMessage(null);

      try {
        const response = await fetch("/api/ops/dev-requests", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; request?: DevRequestRecord }
          | null;

        if (!response.ok || !payload?.request) {
          throw new Error(payload?.error || labels.updateError);
        }

        setData((current) =>
          current
            ? {
                requests: current.requests.map((request) =>
                  request.id === payload.request?.id ? payload.request : request,
                ),
                summary: {
                  done:
                    current.requests.filter((request) =>
                      request.id === id ? status === "done" : request.status === "done",
                    ).length,
                  inProgress:
                    current.requests.filter((request) =>
                      request.id === id ? status === "in_progress" : request.status === "in_progress",
                    ).length,
                  live:
                    current.requests.filter((request) =>
                      request.id === id ? status === "live" : request.status === "live",
                    ).length,
                  pending:
                    current.requests.filter((request) =>
                      request.id === id
                        ? ["pending", "planned", "blocked"].includes(status)
                        : ["pending", "planned", "blocked"].includes(request.status),
                    ).length,
                  repoRadar: current.summary.repoRadar,
                },
              }
            : current,
        );
        setMessage(labels.updated);
      } catch (nextError) {
        setMessage(nextError instanceof Error ? nextError.message : labels.updateError);
      } finally {
        setUpdatingId(null);
      }
    },
    [labels.updateError, labels.updated],
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
        <div style={{ maxWidth: 780 }}>
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
            {labels.badge}
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
            {labels.heading}
          </h1>
          <p
            style={{
              marginTop: 12,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.7,
              fontSize: 15,
              maxWidth: 760,
            }}
          >
            {labels.subtitle}
          </p>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Button
            type="button"
            onClick={() => void loadData(Boolean(isAdmin))}
            disabled={loading || !isAdmin}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            {loading ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {labels.refresh}
          </Button>
          <Link
            href="/ops/repo-radar"
            style={{
              display: "inline-flex",
              gap: 8,
              alignItems: "center",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "white",
              padding: "10px 14px",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={15} />
            {labels.repoRadar}
          </Link>
          {message ? <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{message}</span> : null}
        </div>

        {isAdmin === null || loading ? (
          <div style={{ marginTop: 28, color: "rgba(255,255,255,0.45)" }}>{labels.loading}</div>
        ) : !isAdmin ? (
          <div style={{ marginTop: 28, color: "rgba(255,255,255,0.45)" }}>{labels.accessDenied}</div>
        ) : error ? (
          <div style={{ marginTop: 28, color: "#f5b2b2" }}>{error}</div>
        ) : (
          <>
            <section
              style={{
                marginTop: 28,
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <MetricCard label={labels.pending} value={String(data?.summary.pending ?? 0)} />
              <MetricCard label={labels.inProgress} value={String(data?.summary.inProgress ?? 0)} />
              <MetricCard label={labels.live} value={String(data?.summary.live ?? 0)} />
              <MetricCard label={labels.done} value={String(data?.summary.done ?? 0)} />
            </section>

            <section style={{ marginTop: 30, display: "grid", gap: 16 }}>
              {requests.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.45)" }}>{labels.empty}</div>
              ) : (
                requests.map((request) => (
                  <article
                    key={request.id}
                    style={{
                      borderRadius: 22,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      padding: 22,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0, flex: "1 1 420px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 22, fontWeight: 800 }}>{request.title}</div>
                          <span
                            style={{
                              borderRadius: 999,
                              padding: "6px 10px",
                              fontSize: 12,
                              color: "white",
                              background: statusTone(request.status),
                            }}
                          >
                            {statusLabel(language, request.status)}
                          </span>
                          <span
                            style={{
                              borderRadius: 999,
                              padding: "6px 10px",
                              fontSize: 12,
                              color: "rgba(255,255,255,0.78)",
                              background: "rgba(255,255,255,0.08)",
                            }}
                          >
                            {request.source === "repo_radar" ? labels.sourceRepoRadar : labels.sourceManual}
                          </span>
                        </div>
                        <div style={{ marginTop: 8, color: "rgba(255,255,255,0.48)", fontSize: 13 }}>
                          {formatDate(locale, request.createdAt)} • {request.createdBy}
                          {request.repoFullName ? ` • ${request.repoFullName}` : ""}
                          {request.fitScore !== null ? ` • fit ${request.fitScore}/100` : ""}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <select
                          value={request.status}
                          onChange={(event) => void updateStatus(request.id, event.target.value as DevRequestStatus)}
                          disabled={updatingId === request.id}
                          style={{
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.03)",
                            color: "white",
                            padding: "10px 14px",
                          }}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(language, status)}
                            </option>
                          ))}
                        </select>
                        {request.repoUrl ? (
                          <Link
                            href={request.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              gap: 8,
                              alignItems: "center",
                              borderRadius: 999,
                              border: "1px solid rgba(255,255,255,0.08)",
                              background: "rgba(255,255,255,0.03)",
                              color: "white",
                              padding: "10px 14px",
                              textDecoration: "none",
                            }}
                          >
                            <ExternalLink size={15} />
                            Repo
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    {request.summary ? (
                      <p style={{ marginTop: 16, color: "rgba(255,255,255,0.76)", lineHeight: 1.7 }}>
                        {request.summary}
                      </p>
                    ) : null}

                    <div
                      style={{
                        marginTop: 18,
                        display: "grid",
                        gap: 16,
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      }}
                    >
                      <InfoCard label={language === "fr" ? "Pourquoi ça compte" : "Why it matters"} value={request.whyItMatters} />
                      <InfoCard label={language === "fr" ? "Résultat demandé" : "Requested outcome"} value={request.requestedOutcome} />
                    </div>

                    <div
                      style={{
                        marginTop: 18,
                        borderRadius: 18,
                        border: "1px solid rgba(232,145,45,0.16)",
                        background: "rgba(232,145,45,0.06)",
                        padding: 18,
                      }}
                    >
                      <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f6c978" }}>
                        {labels.aiBrief}
                      </div>
                      <pre
                        style={{
                          marginTop: 12,
                          whiteSpace: "pre-wrap",
                          color: "rgba(255,255,255,0.78)",
                          fontSize: 13,
                          lineHeight: 1.7,
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        }}
                      >
                        {buildBrief(request)}
                      </pre>
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: 18,
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {props.label}
      </div>
      <div style={{ color: "#f6c978", fontSize: 28, fontWeight: 800, marginTop: 10, letterSpacing: "-0.03em" }}>
        {props.value}
      </div>
    </div>
  );
}

function InfoCard(props: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
        padding: 16,
      }}
    >
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.42)" }}>
        {props.label}
      </div>
      <div style={{ marginTop: 10, color: "rgba(255,255,255,0.78)", lineHeight: 1.7 }}>
        {props.value || "n/a"}
      </div>
    </div>
  );
}
