"use client";

import { Button } from "@/components/ui/button";
import { StrategyPanel } from "@/components/strategy/strategy-ui";
import type { StrategyHistoryRecord } from "@/lib/strategy-schema";

export function StrategyHistoryPanel({
  history,
  onOpen,
}: {
  history: StrategyHistoryRecord[];
  onOpen: (entry: StrategyHistoryRecord) => void;
}) {
  return (
    <StrategyPanel
      title="Historique"
      description="Historique des strategies generees et persistantes pour ce client."
    >
      {history.length > 0 ? (
        <div className="space-y-3">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">
                    {entry.outputMode}
                  </div>
                  <div className="text-xs text-white/38">
                    {new Date(entry.generatedAt).toLocaleString("fr-CA")} | {entry.confidenceLevel}
                  </div>
                  <div className="text-sm leading-6 text-white/55">
                    {entry.executiveSummary}
                  </div>
                </div>
                <Button
                  className="border-white/10 text-white/60"
                  onClick={() => onOpen(entry)}
                  variant="outline"
                >
                  Ouvrir
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-white/38">
          Aucune strategie persistee pour ce client.
        </div>
      )}
    </StrategyPanel>
  );
}
