"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  StrategyFieldLabel,
  StrategyPanel,
  strategyInputClassName,
  strategyNativeSelectClassName,
} from "@/components/strategy/strategy-ui";
import {
  REQUEST_SEVERITIES,
  STRATEGY_OBJECTIVES,
  STRATEGY_STAGES,
  TIME_HORIZONS,
  type StrategyRequestRecord,
  type StrategyResolvedOverlays,
} from "@/lib/strategy-schema";

function listValue(values: string[]) {
  return values.join(", ");
}

function parseList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function StrategyRequestForm({
  canWrite,
  overlays,
  request,
  onConstraintPatch,
  onPatch,
  onTestedPatch,
}: {
  canWrite: boolean;
  overlays: StrategyResolvedOverlays | null;
  request: StrategyRequestRecord | null;
  onConstraintPatch: (key: keyof StrategyRequestRecord["constraints"], value: string) => void;
  onPatch: (patch: Partial<StrategyRequestRecord>) => void;
  onTestedPatch: (key: keyof StrategyRequestRecord["testedContext"], value: string[]) => void;
}) {
  if (!request) {
    return null;
  }

  return (
    <StrategyPanel
      title="Strategy Request"
      description="Cadre le probleme du jour, la fenetre de temps, le KPI prioritaire et les contraintes a respecter avant generation."
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <StrategyFieldLabel>Objective</StrategyFieldLabel>
            <select
              className={strategyNativeSelectClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onPatch({ objective: event.target.value as StrategyRequestRecord["objective"] })
              }
              value={request.objective}
            >
              {STRATEGY_OBJECTIVES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <StrategyFieldLabel>Stage</StrategyFieldLabel>
            <select
              className={strategyNativeSelectClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onPatch({ stage: event.target.value as StrategyRequestRecord["stage"] })
              }
              value={request.stage}
            >
              {STRATEGY_STAGES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <StrategyFieldLabel>Time horizon</StrategyFieldLabel>
            <select
              className={strategyNativeSelectClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onPatch({
                  timeHorizon: event.target.value as StrategyRequestRecord["timeHorizon"],
                })
              }
              value={request.timeHorizon}
            >
              {TIME_HORIZONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <StrategyFieldLabel>Severity</StrategyFieldLabel>
            <select
              className={strategyNativeSelectClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onPatch({ severity: event.target.value as StrategyRequestRecord["severity"] })
              }
              value={request.severity}
            >
              {REQUEST_SEVERITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
          <div>
            <StrategyFieldLabel>Main problem</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onPatch({ mainProblem: event.target.value })}
              value={request.mainProblem}
            />
          </div>
          <div>
            <StrategyFieldLabel>Priority KPI</StrategyFieldLabel>
            <select
              className={strategyNativeSelectClassName}
              disabled={!canWrite}
              onChange={(event) => onPatch({ priorityKpi: event.target.value })}
              value={request.priorityKpi}
            >
              <option value="">A confirmer</option>
              {(overlays?.priorityKpiOptions ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <StrategyFieldLabel>When did it start?</StrategyFieldLabel>
          <Input
            className={strategyInputClassName}
            disabled={!canWrite}
            onChange={(event) => onPatch({ startedAtHint: event.target.value })}
            placeholder="ex: depuis 2 semaines, depuis le changement d'offre..."
            value={request.startedAtHint}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StrategyFieldLabel>Recent changes</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onPatch({ recentChanges: parseList(event.target.value) })}
              rows={4}
              value={listValue(request.recentChanges)}
            />
          </div>
          <div>
            <StrategyFieldLabel>Manual notes</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onPatch({ manualNotes: event.target.value })}
              rows={4}
              value={request.manualNotes}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StrategyFieldLabel>Tested creatives</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onTestedPatch("creatives", parseList(event.target.value))}
              rows={4}
              value={listValue(request.testedContext.creatives)}
            />
          </div>
          <div>
            <StrategyFieldLabel>Tested angles</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onTestedPatch("angles", parseList(event.target.value))}
              rows={4}
              value={listValue(request.testedContext.angles)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StrategyFieldLabel>Tested offers</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onTestedPatch("offers", parseList(event.target.value))}
              rows={3}
              value={listValue(request.testedContext.offers)}
            />
          </div>
          <div>
            <StrategyFieldLabel>Tested funnels</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onTestedPatch("funnels", parseList(event.target.value))}
              rows={3}
              value={listValue(request.testedContext.funnels)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StrategyFieldLabel>What worked</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onTestedPatch("worked", parseList(event.target.value))}
              rows={3}
              value={listValue(request.testedContext.worked)}
            />
          </div>
          <div>
            <StrategyFieldLabel>What did not work</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onTestedPatch("didNotWork", parseList(event.target.value))}
              rows={3}
              value={listValue(request.testedContext.didNotWork)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StrategyFieldLabel>Budget constraints</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onConstraintPatch("budget", event.target.value)}
              rows={3}
              value={request.constraints.budget}
            />
          </div>
          <div>
            <StrategyFieldLabel>Timeline constraints</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onConstraintPatch("timeline", event.target.value)}
              rows={3}
              value={request.constraints.timeline}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StrategyFieldLabel>Sales capacity constraints</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onConstraintPatch("salesCapacity", event.target.value)}
              rows={3}
              value={request.constraints.salesCapacity}
            />
          </div>
          <div>
            <StrategyFieldLabel>Fulfillment constraints</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onConstraintPatch("fulfillment", event.target.value)}
              rows={3}
              value={request.constraints.fulfillment}
            />
          </div>
        </div>
      </div>
    </StrategyPanel>
  );
}
