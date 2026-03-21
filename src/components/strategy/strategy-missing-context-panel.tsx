"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { StrategyPanel } from "@/components/strategy/strategy-ui";
import type { StrategyMissingContextEvaluation } from "@/lib/strategy-schema";

/* ── Source‑suggestion logic ────────────────────────────────── */
type SourceSuggestion = { label: string; key: string };

function detectSource(text: string): SourceSuggestion | null {
  const lower = text.toLowerCase();
  if (/donn[ée]es publicitaires|meta|ads|campagne|publicit/i.test(lower))
    return { label: "Connecter Meta Ads", key: "meta_ads" };
  if (/t[âa]ches|projets|sprint|livrable/i.test(lower))
    return { label: "Connecter Asana", key: "asana" };
  if (/communication|[ée]quipe|slack|message/i.test(lower))
    return { label: "Connecter Slack", key: "slack" };
  if (/documents?|fichiers?|drive|partag/i.test(lower))
    return { label: "Connecter Google Drive", key: "google_drive" };
  return null;
}

/* ── Main component ─────────────────────────────────────────── */
export function StrategyMissingContextPanel({
  evaluation,
  contextAnswers,
  onAnswer,
}: {
  evaluation: StrategyMissingContextEvaluation | null;
  contextAnswers?: Record<string, string>;
  onAnswer?: (field: string, value: string) => void;
}) {
  /* Merge critical + recommended into a single ordered list */
  const allQuestions = evaluation
    ? [...evaluation.criticalMissing, ...evaluation.recommendedMissing]
    : [];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");
  const [completed, setCompleted] = useState(false);
  const [connectedSources, setConnectedSources] = useState<string[]>([]);
  const [animatingOut, setAnimatingOut] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const answers = contextAnswers ?? localAnswers;
  const handleChange = (field: string, value: string) => {
    if (onAnswer) onAnswer(field, value);
    else setLocalAnswers((prev) => ({ ...prev, [field]: value }));
  };

  /* Focus input when question changes */
  useEffect(() => {
    if (!completed) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [currentIdx, completed]);

  /* Auto-scroll to bottom on new question */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentIdx, completed]);

  /* Reset when evaluation changes */
  useEffect(() => {
    setCurrentIdx(0);
    setCompleted(false);
    setInputValue("");
  }, [evaluation]);

  const total = allQuestions.length;
  const current = allQuestions[currentIdx] ?? null;
  const isCritical = evaluation
    ? currentIdx < evaluation.criticalMissing.length
    : false;

  const advance = () => {
    setAnimatingOut(true);
    setTimeout(() => {
      setAnimatingOut(false);
      setInputValue("");
      if (currentIdx + 1 < total) {
        setCurrentIdx((i) => i + 1);
      } else {
        setCompleted(true);
      }
    }, 250);
  };

  const handleSubmit = () => {
    if (!current) return;
    const trimmed = inputValue.trim();
    if (trimmed) handleChange(current.field, trimmed);
    advance();
  };

  const handleSkip = () => {
    advance();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const sourceSuggestion = current
    ? detectSource(current.question + " " + current.label)
    : null;

  /* ── No evaluation yet ─────────────────────────────────── */
  if (!evaluation) {
    return (
      <StrategyPanel
        defaultCollapsed
        title="Contexte Manquant"
        description="Le moteur detecte ce qu'il manque encore."
      >
        <div className="text-sm text-white/38">
          Le readiness engine s&apos;activera d&egrave;s qu&apos;un client et une requ&ecirc;te seront charg&eacute;s.
        </div>
      </StrategyPanel>
    );
  }

  /* ── No questions → already ready ──────────────────────── */
  if (total === 0) {
    return (
      <StrategyPanel
        title="Contexte Manquant"
        description="Le moteur detecte ce qu'il manque encore."
      >
        <div className="flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/8 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-green-300 text-lg">✓</div>
          <div>
            <div className="text-sm font-medium text-green-200">Contexte complet</div>
            <div className="text-xs text-green-300/60">Toutes les informations nécessaires sont disponibles.</div>
          </div>
        </div>
      </StrategyPanel>
    );
  }

  /* ── Completed state ───────────────────────────────────── */
  if (completed) {
    const answeredCount = Object.keys(answers).filter((k) =>
      allQuestions.some((q) => q.field === k && answers[k]?.trim())
    ).length;
    return (
      <StrategyPanel
        title="Contexte Manquant"
        description="Le moteur detecte ce qu'il manque encore."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/8 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-green-300 text-lg">✓</div>
            <div>
              <div className="text-sm font-medium text-green-200">Contexte complété</div>
              <div className="text-xs text-green-300/60">
                {answeredCount} sur {total} questions répondues.
                {connectedSources.length > 0 && ` ${connectedSources.length} source(s) à connecter.`}
              </div>
            </div>
          </div>
          {connectedSources.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {connectedSources.map((s) => (
                <Badge key={s} className="border border-[#E8912D]/25 bg-[#E8912D]/10 text-[#f6c978] text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          )}
          <button
            onClick={() => { setCompleted(false); setCurrentIdx(0); setInputValue(""); }}
            className="text-xs text-white/35 underline decoration-white/15 underline-offset-2 hover:text-white/55 transition-colors"
          >
            Recommencer le questionnaire
          </button>
        </div>
      </StrategyPanel>
    );
  }

  /* ── Active survey ─────────────────────────────────────── */
  return (
    <StrategyPanel
      title="Contexte Manquant"
      description="Réponds aux questions du moteur stratégique — une à la fois."
    >
      <div className="space-y-5">
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/40">
            Question <span className="text-white/70 font-medium">{currentIdx + 1}</span> de{" "}
            <span className="text-white/70 font-medium">{total}</span>
          </div>
          <div className="flex gap-1.5">
            {allQuestions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  i < currentIdx
                    ? "bg-green-400/70"
                    : i === currentIdx
                    ? "bg-[#E8912D] scale-125"
                    : "bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div
          className={`transition-all duration-250 ${
            animatingOut ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          }`}
        >
          {/* Agent bubble (left) */}
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#E8912D]/20 text-sm font-semibold text-[#E8912D]">
              S
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-[11px] font-medium text-[#E8912D]/70 uppercase tracking-wider">
                Strategy Agent
              </div>
              <div className="rounded-2xl rounded-tl-md border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                <div className="text-sm font-medium text-white/90 mb-1">{current?.label}</div>
                <div className="text-sm text-white/60 leading-relaxed">{current?.question}</div>
              </div>
              {isCritical && (
                <Badge className="border border-red-500/25 bg-red-500/10 text-red-300 text-[10px]">
                  Critique
                </Badge>
              )}

              {/* Source suggestion */}
              {sourceSuggestion && !connectedSources.includes(sourceSuggestion.label) && (
                <button
                  onClick={() =>
                    setConnectedSources((prev) => [...prev, sourceSuggestion.label])
                  }
                  className="flex items-center gap-2 rounded-xl border border-[#E8912D]/20 bg-[#E8912D]/8 px-3 py-2 text-xs text-[#f6c978] hover:bg-[#E8912D]/15 hover:border-[#E8912D]/35 transition-all duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  {sourceSuggestion.label}
                </button>
              )}
              {sourceSuggestion && connectedSources.includes(sourceSuggestion.label) && (
                <div className="flex items-center gap-2 text-xs text-green-400/70">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {sourceSuggestion.label} — noté
                </div>
              )}
            </div>
          </div>

          {/* User response area (right-aligned) */}
          <div className="flex justify-end">
            <div className="w-full max-w-[85%] space-y-3">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ta réponse ici… (Entrée pour envoyer)"
                className="w-full resize-none rounded-2xl rounded-br-md border border-[#E8912D]/20 bg-[#E8912D]/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:border-[#E8912D]/45 focus:bg-[#E8912D]/8 focus:shadow-[0_0_20px_rgba(232,145,45,0.06)]"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="rounded-xl px-4 py-2 text-xs text-white/35 hover:text-white/55 hover:bg-white/[0.04] transition-all duration-200"
                >
                  Passer
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 rounded-xl bg-[#E8912D]/15 border border-[#E8912D]/25 px-5 py-2 text-xs font-medium text-[#E8912D] hover:bg-[#E8912D]/25 hover:border-[#E8912D]/40 transition-all duration-200"
                >
                  Suivant
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Already answered summary (collapsed) */}
        {currentIdx > 0 && (
          <div className="border-t border-white/[0.06] pt-3">
            <div className="text-[10px] uppercase tracking-wider text-white/25 mb-2">
              Réponses précédentes
            </div>
            <div className="space-y-1.5">
              {allQuestions.slice(0, currentIdx).map((q, i) => {
                const val = answers[q.field]?.trim();
                return (
                  <div key={q.field} className="flex items-center gap-2 text-xs">
                    <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${val ? "bg-green-400/60" : "bg-white/20"}`} />
                    <span className="text-white/40 truncate">{q.label}</span>
                    {val ? (
                      <span className="text-white/25 truncate ml-auto max-w-[50%]">{val}</span>
                    ) : (
                      <span className="text-white/15 ml-auto italic">passée</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </StrategyPanel>
  );
}
