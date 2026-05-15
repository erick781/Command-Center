"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Clock3, Copy, Download, FileText, LibraryBig, Search, UserRound } from "lucide-react";

import { DeliverableViewer } from "@/components/deliverable-viewer";
import { useLanguage } from "@/components/language-provider";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildDeliverableFileBase,
  downloadDeliverableDocx,
  downloadDeliverableMarkdown,
} from "@/lib/deliverable-download";
import { getLanguageLocale } from "@/lib/language";
import { buildPrintableHtml, mdToHtml } from "@/lib/render-deliverable";
import type { WorkflowRun } from "@/lib/workflow-contract";

type RunsResponse = {
  runs?: WorkflowRun[];
};

const runsCopy = {
  en: {
    badge: "Runs",
    clientFallback: "Unknown client",
    clientsCount: "Clients covered",
    copy: "Copy markdown",
    copied: "Copied",
    downloadDocx: "Download DOCX",
    downloadMarkdown: "Download markdown",
    empty: "No runs found yet.",
    emptySelection: "Pick a run to view the output.",
    exportError: "Unable to export this deliverable.",
    latest: "Latest output",
    loadError: "Failed to load runs.",
    loading: "Loading runs...",
    noContent: "No content saved.",
    open: "Open",
    preview: "Document preview",
    readTime: "Read time",
    runCount: "Deliverables",
    search: "Search runs...",
    searchLabel: "Search",
    subtitle: "Open, review, reuse.",
    title: "Runs",
    titleFallback: "Deliverable",
    typeFallback: "run",
    typesCount: "Task types",
    untitled: "Untitled deliverable",
  },
  fr: {
    badge: "Runs",
    clientFallback: "Client inconnu",
    clientsCount: "Clients couverts",
    copy: "Copier le markdown",
    copied: "Copié",
    downloadDocx: "Télécharger DOCX",
    downloadMarkdown: "Télécharger markdown",
    empty: "Aucun run trouvé pour le moment.",
    emptySelection: "Choisis un run pour voir le livrable.",
    exportError: "Impossible d'exporter ce livrable.",
    latest: "Dernière sortie",
    loadError: "Impossible de charger les runs.",
    loading: "Chargement des runs...",
    noContent: "Aucun contenu sauvegardé.",
    open: "Ouvrir",
    preview: "Prévisualisation",
    readTime: "Temps de lecture",
    runCount: "Livrables",
    search: "Rechercher un run...",
    searchLabel: "Recherche",
    subtitle: "Ouvre, relis, réutilise.",
    title: "Runs",
    titleFallback: "Livrable",
    typeFallback: "run",
    typesCount: "Types de tâches",
    untitled: "Livrable sans titre",
  },
} as const;

function openPrintable(
  run: WorkflowRun,
  locale: string,
  fallbackTitle: string,
  fallbackClient: string,
  language: "fr" | "en",
) {
  const date = new Date(run.created_at ?? Date.now()).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const html = buildPrintableHtml(
    run.content || "",
    run.title || fallbackTitle,
    run.client_name || fallbackClient,
    date,
    run.type || undefined,
    language,
  );
  const nextWindow = window.open("", "_blank");

  if (nextWindow) {
    nextWindow.document.write(html);
    nextWindow.document.close();
  }
}

function summarizeRun(content?: string | null) {
  if (!content) return "";

  return content
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 180);
}

function estimateReadingTime(content?: string | null) {
  if (!content) return "—";
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 180))} min`;
}

export default function RunsPage() {
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const locale = getLanguageLocale(language);
  const copy = runsCopy[language];
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingMarkdown, setDownloadingMarkdown] = useState(false);
  const requestedRunId = searchParams.get("runId");

  useEffect(() => {
    let active = true;

    const loadRuns = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/workflow/runs", { credentials: "include" });
        const data = (await response.json().catch(() => null)) as RunsResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data?.error || copy.loadError);
        }

        if (!active) return;
        setRuns(Array.isArray(data?.runs) ? data.runs : []);
      } catch (nextError) {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : copy.loadError);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRuns();

    return () => {
      active = false;
    };
  }, [copy.loadError]);

  const filteredRuns = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    if (!needle) return runs;

    return runs.filter((run) => {
      return [run.title, run.client_name, run.type]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [deferredSearch, runs]);

  const selectedRun = useMemo(
    () => filteredRuns.find((run) => run.id === selectedRunId) ?? filteredRuns[0] ?? null,
    [filteredRuns, selectedRunId],
  );

  useEffect(() => {
    if (!requestedRunId) {
      return;
    }

    if (filteredRuns.some((run) => run.id === requestedRunId)) {
      setSelectedRunId(requestedRunId);
    }
  }, [filteredRuns, requestedRunId]);

  const stats = useMemo(() => {
    const uniqueClients = new Set(
      runs
        .map((run) => run.client_name?.trim())
        .filter((value): value is string => Boolean(value)),
    ).size;
    const uniqueTypes = new Set(
      runs.map((run) => run.type?.trim()).filter((value): value is string => Boolean(value)),
    ).size;
    const latestRun = [...runs]
      .filter((run) => run.created_at)
      .sort((left, right) => (right.created_at || "").localeCompare(left.created_at || ""))[0];

    return {
      latestRun,
      uniqueClients,
      uniqueTypes,
    };
  }, [runs]);

  const handleCopyRun = async () => {
    if (!selectedRun?.content) return;

    try {
      await navigator.clipboard.writeText(selectedRun.content);
      setCopyStatus(copy.copied);
      window.setTimeout(() => setCopyStatus(null), 1800);
    } catch {
      setCopyStatus(null);
    }
  };

  const handleDownloadDocx = async () => {
    if (!selectedRun?.content) return;

    setDownloadingDocx(true);

    try {
      await downloadDeliverableDocx({
        clientName: selectedRun.client_name || copy.clientFallback,
        content: selectedRun.content,
        fileBaseName: buildDeliverableFileBase(selectedRun.type, selectedRun.client_name),
        language,
        type: selectedRun.type || "deliverable",
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : copy.exportError);
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!selectedRun?.content) return;

    setDownloadingMarkdown(true);

    try {
      downloadDeliverableMarkdown({
        clientName: selectedRun.client_name || copy.clientFallback,
        content: selectedRun.content,
        fileBaseName: buildDeliverableFileBase(selectedRun.type, selectedRun.client_name),
        type: selectedRun.type || "deliverable",
      });
    } finally {
      setDownloadingMarkdown(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="rounded-[32px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.26)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-[#E8912D]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
                <LibraryBig className="h-3.5 w-3.5" />
                {copy.badge}
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white md:text-[40px]">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/45 md:text-[15px]">
                {copy.subtitle}
              </p>
            </div>

            <div className="w-full max-w-sm">
              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/32">{copy.searchLabel}</div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                <Input
                  placeholder={copy.search}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-12 border-white/[0.08] bg-white/[0.04] pl-10"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Card className="border-white/[0.06] bg-black/20">
              <CardContent className="pt-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/32">
                  {copy.runCount}
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                  {runs.length}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/[0.06] bg-black/20">
              <CardContent className="pt-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/32">
                  {copy.clientsCount}
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                  {stats.uniqueClients}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/[0.06] bg-black/20">
              <CardContent className="pt-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/32">
                  {copy.typesCount}
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                  {stats.uniqueTypes}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <Card className="border-white/[0.06] bg-[#15151a] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <CardContent className="pt-5">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div>
                  <div className="text-sm font-semibold text-white">{copy.title}</div>
                  <div className="mt-1 text-xs text-white/36">
                    {filteredRuns.length} / {runs.length}
                  </div>
                </div>
                {stats.latestRun?.created_at ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/48">
                    <Clock3 className="h-3.5 w-3.5 text-indigo-300" />
                    <span>
                      {copy.latest}: {new Date(stats.latestRun.created_at).toLocaleDateString(locale)}
                    </span>
                  </div>
                ) : null}
              </div>

              {loading ? (
                <div className="text-sm text-white/45">{copy.loading}</div>
              ) : error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                  {error}
                </div>
              ) : filteredRuns.length === 0 ? (
                <div className="text-sm text-white/45">{copy.empty}</div>
              ) : (
                <div className="space-y-3">
                  {filteredRuns.map((run) => {
                    const isSelected = run.id === selectedRun?.id;

                    return (
                      <button
                        key={run.id}
                        type="button"
                        onClick={() => setSelectedRunId(run.id)}
                        className={`w-full rounded-[28px] border p-4 text-left transition ${
                          isSelected
                            ? "border-[#E8912D]/40 bg-[#E8912D]/8 shadow-[0_16px_40px_rgba(232,145,45,0.08)]"
                            : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">
                              {run.title || copy.untitled}
                            </div>
                            <div className="mt-1 text-xs text-white/36">
                              {run.client_name || copy.clientFallback}
                            </div>
                          </div>
                          <Badge className="bg-white/[0.04] text-white/55 ring-1 ring-white/10">
                            {run.type || copy.typeFallback}
                          </Badge>
                        </div>

                        {summarizeRun(run.content) ? (
                          <div className="mt-3 line-clamp-3 text-sm leading-6 text-white/52">
                            {summarizeRun(run.content)}
                          </div>
                        ) : null}

                        <div className="mt-4 text-xs text-white/30">
                          {run.created_at ? new Date(run.created_at).toLocaleString(locale) : "—"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/[0.06] bg-[#15151a] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <CardContent className="pt-5">
              {!selectedRun ? (
                <div className="text-sm text-white/45">{copy.emptySelection}</div>
              ) : (
                <>
                  <div className="border-b border-white/[0.06] pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-indigo-400">
                          <FileText className="h-3.5 w-3.5" />
                          {selectedRun.type || copy.typeFallback}
                        </div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {selectedRun.title || copy.titleFallback}
                        </div>
                        <div className="mt-1 text-xs text-white/36">
                          {selectedRun.client_name || copy.clientFallback}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="border-white/[0.06] text-white/60"
                          onClick={() => void handleCopyRun()}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {copyStatus || copy.copy}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {[
                        {
                          icon: UserRound,
                          label: copy.clientFallback,
                          value: selectedRun.client_name || copy.clientFallback,
                        },
                        {
                          icon: CalendarDays,
                          label: copy.latest,
                          value: selectedRun.created_at
                            ? new Date(selectedRun.created_at).toLocaleDateString(locale)
                            : "—",
                        },
                        {
                          icon: Clock3,
                          label: copy.readTime,
                          value: estimateReadingTime(selectedRun.content),
                        },
                      ].map((item) => {
                        const Icon = item.icon;

                        return (
                          <div
                            key={`${item.label}-${item.value}`}
                            className="rounded-2xl border border-white/[0.06] bg-black/20 p-4"
                          >
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/30">
                              <Icon className="h-3.5 w-3.5 text-indigo-300" />
                              {item.label}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white">{item.value}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5">
                    <DeliverableViewer
                      actions={
                        <>
                          <Button
                            variant="outline"
                            className="border-white/[0.06] text-white/60"
                            onClick={() =>
                              openPrintable(
                                selectedRun,
                                locale,
                                copy.titleFallback,
                                copy.clientFallback,
                                language,
                              )
                            }
                          >
                            {copy.open}
                          </Button>
                          <Button
                            variant="outline"
                            className="border-white/[0.06] text-white/60"
                            onClick={() => void handleDownloadDocx()}
                            disabled={downloadingDocx}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            {downloadingDocx ? "..." : copy.downloadDocx}
                          </Button>
                          <Button
                            variant="outline"
                            className="border-white/[0.06] text-white/60"
                            onClick={handleDownloadMarkdown}
                            disabled={downloadingMarkdown}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            {downloadingMarkdown ? "..." : copy.downloadMarkdown}
                          </Button>
                        </>
                      }
                      contentHtml={mdToHtml(selectedRun.content || copy.noContent, "light")}
                      eyebrow={selectedRun.type || copy.typeFallback}
                      meta={[
                        {
                          label: copy.latest,
                          value: selectedRun.created_at
                            ? new Date(selectedRun.created_at).toLocaleDateString(locale)
                            : "—",
                        },
                        {
                          label: copy.readTime,
                          value: estimateReadingTime(selectedRun.content),
                        },
                      ]}
                      previewLabel={copy.preview}
                      subtitle={selectedRun.client_name || copy.clientFallback}
                      title={selectedRun.title || copy.titleFallback}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
