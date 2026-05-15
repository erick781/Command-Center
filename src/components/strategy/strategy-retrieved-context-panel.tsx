"use client";

import { Badge } from "@/components/ui/badge";
import { StrategyPanel } from "@/components/strategy/strategy-ui";
import type {
  StrategyRequestRecord,
  StrategySourceContextRecord,
} from "@/lib/strategy-schema";

function formatMetric(value: unknown) {
  if (value === null || value === undefined || value === "") return "--";
  return String(value);
}

export function StrategyRetrievedContextPanel({
  request,
  sourceContext,
}: {
  request: StrategyRequestRecord | null;
  sourceContext: StrategySourceContextRecord[];
}) {
  const snapshot = request?.retrievedContextSnapshot ?? {};
  const metrics = [
    { label: "Budget", value: snapshot.budget },
    { label: "Spend", value: snapshot.spend },
    { label: "Leads", value: snapshot.leads },
    { label: "CPL", value: snapshot.cpl },
    { label: "ROAS", value: snapshot.roas },
    { label: "Revenue", value: snapshot.revenue },
  ];

  return (
    <StrategyPanel defaultCollapsed
      title="Contexte Récupéré"
      description="Signaux deja recuperes, fraicheur des sources et indicateurs disponibles pour eviter de repartir de zero."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <div className="text-lg font-bold text-white">{formatMetric(metric.value)}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/28">
                {metric.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3">
          {sourceContext.map((source) => (
            <div
              key={source.sourceType}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-white">{source.sourceLabel}</div>
                <Badge className="border border-white/10 bg-white/[0.04] text-white/55">
                  {source.isConnected ? "connected" : "missing"}
                </Badge>
                <Badge className="border border-white/10 bg-white/[0.04] text-white/55">
                  {source.freshnessStatus}
                </Badge>
                <Badge className="border border-[#6366f1]/20 bg-[#6366f1]/10 text-indigo-300">
                  {(source.confidenceScore * 100).toFixed(0)}% confidence
                </Badge>
              </div>
              {source.warnings.length > 0 ? (
                <div className="mt-2 text-xs leading-5 text-white/42">
                  {source.warnings.join(" ")}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </StrategyPanel>
  );
}
