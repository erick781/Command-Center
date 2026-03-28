"use client";

import { ExternalLink, FileDown, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ClientDeliverableRunItem = {
  content?: string | null;
  created_at?: string;
  id: string;
  title?: string;
  type?: string;
};

type ClientDeliverableRunListProps = {
  docxLabel: string;
  downloadingRunKey: string | null;
  emptyLabel: string;
  formatDate: (value?: string) => string;
  loading: boolean;
  loadingLabel: string;
  markdownLabel: string;
  onDownloadDocx: (run: ClientDeliverableRunItem) => void | Promise<void>;
  onDownloadMarkdown: (run: ClientDeliverableRunItem) => void;
  onOpen: (run: ClientDeliverableRunItem) => void;
  openLabel: string;
  runs: ClientDeliverableRunItem[];
  runTypeLabel: (type?: string) => string;
};

function summarizeRun(content?: string | null) {
  if (!content) return "";

  return content
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 180);
}

export function ClientDeliverableRunList(props: ClientDeliverableRunListProps) {
  const {
    docxLabel,
    downloadingRunKey,
    emptyLabel,
    formatDate,
    loading,
    loadingLabel,
    markdownLabel,
    onDownloadDocx,
    onDownloadMarkdown,
    onOpen,
    openLabel,
    runs,
    runTypeLabel,
  } = props;

  if (loading) {
    return <div className="text-sm text-white/35">{loadingLabel}</div>;
  }

  if (runs.length === 0) {
    return <div className="text-sm text-white/35">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const summary = summarizeRun(run.content);

        return (
          <div
            key={run.id}
            className="rounded-[24px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.14)] transition-all duration-200 hover:border-white/[0.12]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[#E8912D]/15 bg-[#E8912D]/10 text-[#f6c978]">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {run.title || runTypeLabel(run.type)}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/28">
                      {runTypeLabel(run.type)}
                    </div>
                  </div>
                </div>
              </div>

              <Badge className="bg-white/[0.04] text-white/45">{formatDate(run.created_at)}</Badge>
            </div>

            {summary ? (
              <div className="mt-3 rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-3 text-xs leading-5 text-white/50">
                {summary}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/[0.08] text-white/70"
                onClick={() => onOpen(run)}
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                {openLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/[0.08] text-white/70"
                onClick={() => void onDownloadDocx(run)}
                disabled={!run.content || downloadingRunKey === `${run.id}:docx`}
              >
                <FileDown className="mr-2 h-3.5 w-3.5" />
                {downloadingRunKey === `${run.id}:docx` ? "..." : docxLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/[0.08] text-white/70"
                onClick={() => onDownloadMarkdown(run)}
                disabled={!run.content || downloadingRunKey === `${run.id}:md`}
              >
                <FileText className="mr-2 h-3.5 w-3.5" />
                {downloadingRunKey === `${run.id}:md` ? "..." : markdownLabel}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
