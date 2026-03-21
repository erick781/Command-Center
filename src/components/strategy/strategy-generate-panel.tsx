"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Save, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StrategyPanel } from "@/components/strategy/strategy-ui";
import type { StrategyMissingContextEvaluation, StrategyOutputMeta } from "@/lib/strategy-schema";

const GENERATION_PHASES = [
  "Audit",
  "Research",
  "Stratégie",
  "Build",
  "Launch",
  "Scale",
  "KPIs",
] as const;

/* Progress milestones: [seconds elapsed, target percent] */
const PROGRESS_MILESTONES: [number, number][] = [
  [2, 15],
  [5, 30],
  [10, 50],
  [20, 70],
  [30, 85],
  [45, 92],
];

export function StrategyGeneratePanel({
  canWrite,
  evaluation,
  generating,
  lastGeneratedAt,
  meta,
  onGenerate,
  onSaveProfile,
  onSaveRequest,
  savingProfile,
  savingRequest,
}: {
  canWrite: boolean;
  evaluation: StrategyMissingContextEvaluation | null;
  generating: boolean;
  lastGeneratedAt?: string | null;
  meta: StrategyOutputMeta | null;
  onGenerate: () => void;
  onSaveProfile: () => void;
  onSaveRequest: () => void;
  savingProfile: boolean;
  savingRequest: boolean;
}) {
  /* ── Animated progress state ── */
  const [progressPct, setProgressPct] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (generating) {
      startRef.current = Date.now();
      setProgressPct(0);

      const tick = () => {
        const elapsed = (Date.now() - (startRef.current ?? Date.now())) / 1000;
        let target = 5; // base
        for (const [sec, pct] of PROGRESS_MILESTONES) {
          if (elapsed >= sec) target = pct;
        }
        setProgressPct((prev) => {
          const step = (target - prev) * 0.08;
          return Math.min(prev + Math.max(step, 0.1), target);
        });
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    } else {
      // Jump to 100% briefly then reset
      if (startRef.current !== null) {
        setProgressPct(100);
        const t = setTimeout(() => setProgressPct(0), 1200);
        startRef.current = null;
        return () => clearTimeout(t);
      }
    }
  }, [generating]);

  const activePhaseIdx = Math.min(
    Math.floor(progressPct / (100 / GENERATION_PHASES.length)),
    GENERATION_PHASES.length - 1,
  );

  return (
    <StrategyPanel
      title="Generate"
      description="Sauve le profil, verrouille la requete du jour puis envoie au generateur strategie avec readiness et confidence deja calibres."
    >
      <div className="space-y-4">
        {/* ── Loading overlay ── */}
        {generating && (
          <div className="rounded-2xl border border-[#E8912D]/30 bg-[#1a1a2e]/80 p-8 text-center">
            {/* Spinner */}
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-[#E8912D]/30 border-t-[#E8912D]" />

            <h3 className="mb-2 text-xl font-bold text-white">
              Génération en cours...
            </h3>
            <p className="mb-4 text-sm text-gray-400">
              Le moteur stratégique analyse le contexte et génère les 7 phases
            </p>
            <p className="font-medium text-[#E8912D]">
              Estimation : 30–60 secondes
            </p>

            {/* Phase dots */}
            <div className="mt-6 flex justify-center gap-3">
              {GENERATION_PHASES.map((phase, i) => (
                <div key={phase} className="flex flex-col items-center gap-1">
                  <div
                    className={
                      "h-3 w-3 rounded-full transition-all duration-500 " +
                      (i <= activePhaseIdx
                        ? "scale-110 bg-[#E8912D] shadow-[0_0_8px_rgba(232,145,45,0.5)]"
                        : "bg-white/20")
                    }
                  />
                  <span
                    className={
                      "text-[10px] transition-colors duration-300 " +
                      (i <= activePhaseIdx ? "text-[#E8912D]" : "text-gray-500")
                    }
                  >
                    {phase}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#E8912D] to-[#F0A84D] transition-all duration-700 ease-out"
                style={{ width: progressPct + "%" }}
              />
            </div>
            <p className="mt-2 text-xs tabular-nums text-white/40">
              {Math.round(progressPct)}%
            </p>
          </div>
        )}

        {/* Generate button */}
        <Button
          className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#E8912D] to-[#f6c978] font-semibold text-[#17140f] hover:opacity-90"
          disabled={generating}
          onClick={onGenerate}
        >
          {generating ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Générer la Stratégie
            </>
          )}
        </Button>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            className="border-white/10 text-white/65"
            disabled={!canWrite || savingProfile}
            onClick={onSaveProfile}
            variant="outline"
          >
            {savingProfile ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Enregistrer le profil
          </Button>
          <Button
            className="border-white/10 text-white/65"
            disabled={!canWrite || savingRequest}
            onClick={onSaveRequest}
            variant="outline"
          >
            {savingRequest ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Enregistrer la requete
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {evaluation ? (
            <Badge className="border border-white/10 bg-white/[0.04] text-white/60">
              readiness: {evaluation.generationReadiness}
            </Badge>
          ) : null}
          {meta ? (
            <>
              <Badge className="border border-white/10 bg-white/[0.04] text-white/60">
                provider: {meta.provider}
              </Badge>
              <Badge className="border border-white/10 bg-white/[0.04] text-white/60">
                model: {meta.model}
              </Badge>
            </>
          ) : null}
          {lastGeneratedAt ? (
            <Badge className="border border-white/10 bg-white/[0.04] text-white/60">
              last generated: {new Date(lastGeneratedAt).toLocaleString("fr-CA")}
            </Badge>
          ) : null}
        </div>
      </div>
    </StrategyPanel>
  );
}
