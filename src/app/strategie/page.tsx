"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, LoaderCircle, Sparkles } from "lucide-react";

import { StrategyClientSnapshot } from "@/components/strategy/strategy-client-snapshot";
import { StrategyGeneratePanel } from "@/components/strategy/strategy-generate-panel";
import { StrategyHistoryPanel } from "@/components/strategy/strategy-history-panel";
import { StrategyMissingContextPanel } from "@/components/strategy/strategy-missing-context-panel";
import { StrategyOutputModeSelect } from "@/components/strategy/strategy-output-mode-select";
import { StrategyOutputView } from "@/components/strategy/strategy-output-view";
import { StrategyProfileEditor } from "@/components/strategy/strategy-profile-editor";
import { StrategyRequestForm } from "@/components/strategy/strategy-request-form";
import { StrategyRetrievedContextPanel } from "@/components/strategy/strategy-retrieved-context-panel";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import type {
  StrategyEngineOutput,
  StrategyHistoryRecord,
  StrategyMissingContextEvaluation,
  StrategyOutputMeta,
  StrategyProfileEditableSection,
  StrategyProfileRecord,
  StrategyRequestRecord,
  StrategyResolvedOverlays,
  StrategySeedClient,
  StrategySourceContextRecord,
} from "@/lib/strategy-schema";

type StrategyContextResponse = {
  client: StrategySeedClient;
  evaluation: StrategyMissingContextEvaluation;
  history: StrategyHistoryRecord[];
  overlays: StrategyResolvedOverlays;
  permissions: {
    canAdmin: boolean;
    canWrite: boolean;
    role: string | null;
  };
  profile: StrategyProfileRecord;
  request: StrategyRequestRecord;
  sourceContext: StrategySourceContextRecord[];
};

function sortAndFilterClients(clients: StrategySeedClient[], search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) {
    return clients.slice(0, 10);
  }

  return clients
    .filter((client) => client.name.toLowerCase().includes(normalized))
    .slice(0, 10);
}

function jsonHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

/* ── Wizard step metadata ── */
const WIZARD_STEPS = [
  { id: 1, label: "Sélection du client", short: "Client" },
  { id: 2, label: "Objectif stratégique", short: "Objectif" },
  { id: 3, label: "Détails de la demande", short: "Détails" },
  { id: 4, label: "Révision & Génération", short: "Générer" },
] as const;

/* ── Step progress indicator component ── */
function WizardProgress({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  const progress = ((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100;

  return (
    <div className="mb-8">
      {/* Step label */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-white/70">
          Étape {currentStep} de {WIZARD_STEPS.length} —{" "}
          <span className="text-[#f6c978]">
            {WIZARD_STEPS[currentStep - 1].label}
          </span>
        </p>
        <p className="text-xs text-white/35">
          {Math.round(progress)}% complété
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#E8912D] to-[#f6c978] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="mt-3 flex items-center justify-between">
        {WIZARD_STEPS.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(step.id)}
              className="group flex flex-col items-center gap-1.5"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? "border-[#E8912D]/40 bg-[#E8912D]/20 text-[#f6c978]"
                    : isCurrent
                      ? "border-[#E8912D] bg-[#E8912D]/10 text-[#E8912D] shadow-[0_0_12px_rgba(232,145,45,0.25)]"
                      : "border-white/[0.08] bg-white/[0.02] text-white/30"
                }`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.id}
              </div>
              <span
                className={`text-[10px] font-medium tracking-wide transition-colors ${
                  isCurrent ? "text-[#f6c978]" : isCompleted ? "text-white/45" : "text-white/25"
                }`}
              >
                {step.short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Navigation buttons component ── */
function WizardNav({
  currentStep,
  canNext,
  onBack,
  onNext,
  nextLabel,
}: {
  currentStep: number;
  canNext: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      {currentStep > 1 ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white/55 transition-all hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white/75"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
      ) : (
        <div />
      )}

      {currentStep < WIZARD_STEPS.length ? (
        <button
          type="button"
          disabled={!canNext}
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E8912D] to-[#d4800f] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#E8912D]/20 transition-all hover:shadow-[#E8912D]/30 disabled:opacity-40 disabled:shadow-none"
        >
          {nextLabel ?? "Suivant"}
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export default function StrategiePage() {
  const [clients, setClients] = useState<StrategySeedClient[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<StrategySeedClient | null>(null);

  const [profile, setProfile] = useState<StrategyProfileRecord | null>(null);
  const [requestState, setRequestState] = useState<StrategyRequestRecord | null>(null);
  const [sourceContext, setSourceContext] = useState<StrategySourceContextRecord[]>([]);
  const [evaluation, setEvaluation] = useState<StrategyMissingContextEvaluation | null>(null);
  const [overlays, setOverlays] = useState<StrategyResolvedOverlays | null>(null);
  const [history, setHistory] = useState<StrategyHistoryRecord[]>([]);
  const [output, setOutput] = useState<StrategyEngineOutput | null>(null);
  const [meta, setMeta] = useState<StrategyOutputMeta | null>(null);
  const [phaseOutput, setPhaseOutput] = useState<Record<string, string> | null>(null);
  const [contextAnswers, setContextAnswers] = useState<Record<string, string>>({});

  const [permissions, setPermissions] = useState({
    canAdmin: false,
    canWrite: false,
    role: null as string | null,
  });

  const [contextLoading, setContextLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [prefillDone, setPrefillDone] = useState(false);

  /* ── Wizard state ── */
  const [currentStep, setCurrentStep] = useState(1);

  const dropdownClients = useMemo(() => {
    return sortAndFilterClients(clients, deferredSearch);
  }, [clients, deferredSearch]);

  useEffect(() => {
    fetch(`/api/client-hub/clients?show_hidden=true`)
      .then((response) => response.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!clients.length || prefillDone) return;

    const params = new URLSearchParams(window.location.search);
    const queryClient = params.get("client");
    if (!queryClient) {
      setPrefillDone(true);
      return;
    }

    const matchedClient = clients.find(
      (client) => client.name.toLowerCase() === queryClient.toLowerCase(),
    );

    if (matchedClient) {
      void loadContext(matchedClient);
    }

    setPrefillDone(true);
  }, [clients, prefillDone]);

  async function loadContext(client: StrategySeedClient) {
    setContextLoading(true);
    setError(null);
    setStatusMessage(null);
    setSelectedClient(client);
    setSearch(client.name);
    setShowDropdown(false);
    setProfile(null);
    setRequestState(null);
    setSourceContext([]);
    setEvaluation(null);
    setOverlays(null);
    setHistory([]);
    setOutput(null);
    setMeta(null);

    try {
      const response = await fetch(
        `/api/strategy-engine/context?clientId=${encodeURIComponent(client.id)}`,
        {
          cache: "no-store",
        },
      );
      const data = (await response.json()) as Partial<StrategyContextResponse> & {
        error?: string;
      };

      if (!response.ok || !data.profile || !data.request) {
        throw new Error(data.error || "Impossible de charger le contexte strategique.");
      }

      setSelectedClient(data.client ?? client);
      setProfile(data.profile);
      setRequestState(data.request);
      setSourceContext(Array.isArray(data.sourceContext) ? data.sourceContext : []);
      setEvaluation(data.evaluation ?? null);
      setOverlays(data.overlays ?? null);
      setHistory(Array.isArray(data.history) ? data.history : []);
      setPermissions(
        data.permissions ?? {
          canAdmin: false,
          canWrite: false,
          role: null,
        },
      );
      // Auto-advance to step 2 after loading context
      setCurrentStep(2);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger le contexte strategique.",
      );
    } finally {
      setContextLoading(false);
    }
  }

  function updateProfileSection(
    section: StrategyProfileEditableSection,
    patch: Record<string, unknown>,
  ) {
    setProfile((current) => {
      if (!current) return current;
      const currentSection = (current[section] as Record<string, unknown>) ?? {};

      return {
        ...current,
        [section]: {
          ...currentSection,
          ...patch,
        },
      } as StrategyProfileRecord;
    });
  }

  function updateMarketingBoolean(
    section: "marketing",
    key: string,
    value: boolean,
  ) {
    setProfile((current) => {
      if (!current) return current;

      return {
        ...current,
        [section]: {
          ...current[section],
          [key]: value,
        },
      } as StrategyProfileRecord;
    });
  }

  function updateRequest(patch: Partial<StrategyRequestRecord>) {
    setRequestState((current) => {
      if (!current) return current;
      return {
        ...current,
        ...patch,
      };
    });
  }

  function updateTestedContext(
    key: keyof StrategyRequestRecord["testedContext"],
    value: string[],
  ) {
    setRequestState((current) => {
      if (!current) return current;
      return {
        ...current,
        testedContext: {
          ...current.testedContext,
          [key]: value,
        },
      };
    });
  }

  function updateConstraint(
    key: keyof StrategyRequestRecord["constraints"],
    value: string,
  ) {
    setRequestState((current) => {
      if (!current) return current;
      return {
        ...current,
        constraints: {
          ...current.constraints,
          [key]: value,
        },
      };
    });
  }

  async function saveProfile() {
    if (!profile || !permissions.canWrite) {
      return;
    }

    setSavingProfile(true);
    setError(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/strategy-engine/profile", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          profile,
          sourceContext,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.profile) {
        throw new Error(data.error || "Impossible d'enregistrer le profil.");
      }

      setProfile(data.profile);
      if (Array.isArray(data.sourceContext)) {
        setSourceContext(data.sourceContext);
      }
      setStatusMessage("Profil client enregistre dans Supabase.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible d'enregistrer le profil.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveRequest() {
    if (!profile || !requestState) {
      return;
    }

    setSavingRequest(true);
    setError(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/strategy-engine/request", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          profile,
          request: requestState,
          sourceContext,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.request) {
        throw new Error(data.error || "Impossible d'enregistrer la requete.");
      }

      setProfile(data.profile ?? profile);
      setRequestState(data.request);
      setEvaluation(data.evaluation ?? null);
      setOverlays(data.overlays ?? null);
      if (Array.isArray(data.sourceContext)) {
        setSourceContext(data.sourceContext);
      }
      setStatusMessage("Requete strategique enregistree.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible d'enregistrer la requete.",
      );
    } finally {
      setSavingRequest(false);
    }
  }

  async function generateStrategy() {
    if (!profile || !requestState) {
      return;
    }

    setGenerating(true);
    setError(null);
    setStatusMessage(null);

    try {
      // Fire-and-forget: send profile/context to Codex for storage
      void fetch("/api/strategy-engine/generate", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ profile, request: requestState, sourceContext }),
      }).then(async (r) => {
        if (r.ok) {
          const sd = await r.json();
          setProfile(sd.profile ?? profile);
          setRequestState(sd.request ?? requestState);
          setEvaluation(sd.evaluation ?? null);
          setOverlays(sd.overlays ?? null);
          if (Array.isArray(sd.sourceContext)) setSourceContext(sd.sourceContext);
          if (Array.isArray(sd.history)) setHistory(sd.history);
        }
      }).catch(() => { /* storage fire-and-forget */ });

      // Actual generation via FastAPI V1 (7 phases)
      const response = await fetch("/api/strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: selectedClient?.name ?? profile?.identity?.brandName ?? "",
          industry: profile?.business?.industry ?? "",
          website: profile?.identity?.websiteUrl ?? "",
          budget: requestState?.constraints?.budget ?? "5000",
          strategy_type: "360",
          context: [requestState?.manualNotes || "", ...Object.entries(contextAnswers).filter(([, v]) => v.trim()).map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join("\n"),
          force_regenerate: true,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Impossible de generer la strategie.");
      }

      setPhaseOutput({
        audit: data.audit ?? "",
        research: data.research ?? "",
        strategy: data.strategy ?? "",
        build: data.build ?? "",
        launch: data.launch ?? "",
        scale: data.scale ?? "",
        kpis: data.kpis ?? "",
      });
      setOutput(null);
      setMeta(null);
      setPhaseOutput(null);
      setStatusMessage("Strategie 7-phases generee via FastAPI.");
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Impossible de generer la strategie.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function openHistoryEntry(entry: StrategyHistoryRecord) {
    if (entry.output) {
      setOutput(entry.output);
      setMeta(null);
      setPhaseOutput(null);
      setStatusMessage("Sortie historique chargee depuis la memoire strategie.");
    }
  }

  /* ── Wizard navigation helpers ── */
  function goNext() {
    setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length));
  }

  function goBack() {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  function goToStep(step: number) {
    // Allow clicking completed steps or current step only
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  }

  // Can proceed from step 1 only if a client is selected and context loaded
  const canProceedStep1 = !!selectedClient && !!profile && !contextLoading;
  // Can proceed from step 2 if request state exists (objective fields)
  const canProceedStep2 = !!requestState;
  // Can proceed from step 3 always (details are optional enrichment)
  const canProceedStep3 = true;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        {/* ── Header ── */}
        <section className="mb-8 rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 md:p-8">
          <Badge className="border border-[#E8912D]/20 bg-[#E8912D]/10 text-[#f6c978]">
            Stratégie IA
          </Badge>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="text-3xl font-black tracking-[-0.05em] text-white md:text-4xl">
                Strategie
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/55 md:text-base">
                Sélectionnez un client, configurez le profil stratégique et lancez
                une génération IA adaptée. Le moteur analyse le contexte, identifie
                les données manquantes et produit des recommandations
                stratégiques actionnables.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white/45">
              {contextLoading ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Chargement du contexte...
                </span>
              ) : selectedClient ? (
                `${selectedClient.name} | ${permissions.role ?? "no-role"}`
              ) : (
                "Selectionne un client pour commencer"
              )}
            </div>
          </div>
        </section>

        {/* ── Error / Status messages ── */}
        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/15 bg-red-500/8 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="mb-6 rounded-2xl border border-[#E8912D]/15 bg-[#E8912D]/8 p-4 text-sm text-[#f6c978]">
            {statusMessage}
          </div>
        ) : null}

        {/* ── Wizard Progress Bar ── */}
        <WizardProgress currentStep={currentStep} onStepClick={goToStep} />

        {/* ══════════════════════════════════════════════
            STEP 1 — Sélection du client
        ══════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-white">Quel client veux-tu accompagner?</h2>
                <p className="mt-2 text-sm text-white/45">
                  Recherche et sélectionne un client. Son profil stratégique sera chargé automatiquement.
                </p>
              </div>

              <StrategyClientSnapshot
                clients={clients}
                contextLoading={contextLoading}
                dropdownClients={dropdownClients}
                onSelectClient={(client) => void loadContext(client)}
                profile={profile}
                search={search}
                selectedClient={selectedClient}
                setSearch={setSearch}
                setShowDropdown={setShowDropdown}
                showDropdown={showDropdown}
              />

              {profile && (
                <div className="mt-6">
                  <StrategyProfileEditor
                    canWrite={permissions.canWrite}
                    onBoolean={updateMarketingBoolean}
                    onSectionPatch={updateProfileSection}
                    profile={profile}
                  />
                </div>
              )}

              <WizardNav
                currentStep={currentStep}
                canNext={canProceedStep1}
                onBack={goBack}
                onNext={goNext}
                nextLabel="Définir l'objectif"
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 2 — Objectif stratégique
        ══════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-white">Quel est ton objectif?</h2>
                <p className="mt-2 text-sm text-white/45">
                  Définis l&apos;objectif, le stade du client et l&apos;horizon de planification.
                </p>
              </div>

              <StrategyRequestForm
                canWrite={permissions.canWrite}
                onConstraintPatch={updateConstraint}
                onPatch={updateRequest}
                onTestedPatch={updateTestedContext}
                overlays={overlays}
                request={requestState}
              />

              <WizardNav
                currentStep={currentStep}
                canNext={canProceedStep2}
                onBack={goBack}
                onNext={goNext}
                nextLabel="Ajouter les détails"
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 3 — Détails de la demande
        ══════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-white">Contexte récupéré & mode de sortie</h2>
                <p className="mt-2 text-sm text-white/45">
                  Vérifie les données récupérées, les alertes de contexte manquant, et choisis le format de sortie.
                </p>
              </div>

              <div className="space-y-6">
                <StrategyRetrievedContextPanel
                  request={requestState}
                  sourceContext={sourceContext}
                />

                <StrategyMissingContextPanel evaluation={evaluation} contextAnswers={contextAnswers} onAnswer={(field, value) => setContextAnswers((prev) => ({ ...prev, [field]: value }))} />

                <StrategyOutputModeSelect
                  canWrite={permissions.canWrite}
                  onChange={(value) =>
                    updateRequest({
                      requestedOutputs: [value],
                    })
                  }
                  value={requestState?.requestedOutputs[0] ?? "30_day_action_plan"}
                />
              </div>

              <WizardNav
                currentStep={currentStep}
                canNext={canProceedStep3}
                onBack={goBack}
                onNext={goNext}
                nextLabel="Réviser & Générer"
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 4 — Révision & Génération
        ══════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mx-auto max-w-4xl">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-white">Révision & Génération</h2>
                <p className="mt-2 text-sm text-white/45">
                  Vérifie le résumé, sauvegarde tes données et lance la génération stratégique.
                </p>
              </div>

              {/* Summary cards */}
              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left transition-all hover:border-[#E8912D]/20 hover:bg-white/[0.05]"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Client</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {selectedClient?.name ?? "—"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left transition-all hover:border-[#E8912D]/20 hover:bg-white/[0.05]"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Objectif</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {requestState?.objective || "—"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left transition-all hover:border-[#E8912D]/20 hover:bg-white/[0.05]"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Format</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {requestState?.requestedOutputs[0]?.replace(/_/g, " ") ?? "—"}
                  </p>
                </button>
              </div>

              {/* Missing context warning if any */}
              {evaluation && (
                <div className="mb-6">
                  <StrategyMissingContextPanel evaluation={evaluation} contextAnswers={contextAnswers} onAnswer={(field, value) => setContextAnswers((prev) => ({ ...prev, [field]: value }))} />
                </div>
              )}

              {/* Generate panel */}
              <StrategyGeneratePanel
                canWrite={permissions.canWrite}
                evaluation={evaluation}
                generating={generating}
                lastGeneratedAt={requestState?.generatedAt ?? null}
                meta={meta}
                onGenerate={() => void generateStrategy()}
                onSaveProfile={() => void saveProfile()}
                onSaveRequest={() => void saveRequest()}
                savingProfile={savingProfile}
                savingRequest={savingRequest}
              />

              {/* Output view - 7 Phase Cards (FastAPI) */}
              {phaseOutput && (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Strategie 7 Phases</span>
                    <a
                      href={`/api/strategy/export-docx/${encodeURIComponent(selectedClient?.name ?? "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8912D]/30 bg-[#E8912D]/10 px-3 py-1.5 text-xs font-medium text-[#f6c978] transition-colors hover:bg-[#E8912D]/20"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Exporter DOCX
                    </a>
                  </div>
                  {[
                    { key: "audit", label: "Phase 1 \u2014 Audit", color: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
                    { key: "research", label: "Phase 2 \u2014 Research", color: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
                    { key: "strategy", label: "Phase 3 \u2014 Strat\u00e9gie", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
                    { key: "build", label: "Phase 4 \u2014 Build", color: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
                    { key: "launch", label: "Phase 5 \u2014 Lancement", color: "bg-red-500/15 text-red-400 border-red-500/25" },
                    { key: "scale", label: "Phase 6 \u2014 Scale", color: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
                    { key: "kpis", label: "Phase 7 \u2014 KPIs", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
                  ].map((phase) => {
                    const text = phaseOutput[phase.key];
                    if (!text) return null;
                    return (
                      <details key={phase.key} className="group rounded-2xl border border-white/[0.06] bg-[#1a1a1f]" open>
                        <summary className="flex cursor-pointer items-center gap-3 px-5 py-4 text-sm font-medium text-white/80 select-none">
                          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${phase.color}`}>
                            {phase.label}
                          </span>
                          <svg className="ml-auto h-4 w-4 text-white/30 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <div className="border-t border-white/[0.06] px-5 py-4">
                          <div
                            className="prose prose-invert prose-sm max-w-none text-white/65 [&_h3]:text-white/80 [&_h3]:text-sm [&_h3]:font-semibold [&_strong]:text-white/80 [&_table]:text-xs [&_th]:text-left [&_th]:pr-4 [&_td]:pr-4 [&_td]:py-1"
                            dangerouslySetInnerHTML={{
                              __html: (() => {
                                const lines = text.split('\n');
                                const parts: string[] = [];
                                let inUl = false;
                                let inOl = false;
                                const closeLists = () => {
                                  if (inUl) { parts.push('</ul>'); inUl = false; }
                                  if (inOl) { parts.push('</ol>'); inOl = false; }
                                };
                                const fmt = (s: string) => s
                                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
                                for (const raw of lines) {
                                  const ln = raw.trimEnd();
                                  if (!ln.trim()) { closeLists(); continue; }
                                  if (/^---+$/.test(ln.trim())) { closeLists(); parts.push('<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0;"/>'); continue; }
                                  const h1 = ln.match(/^# (.+)/);
                                  if (h1) { closeLists(); parts.push('<h2 style="color:#E8912D;font-size:18px;font-weight:700;margin:20px 0 10px;">' + fmt(h1[1]) + '</h2>'); continue; }
                                  const h2 = ln.match(/^## (.+)/);
                                  if (h2) { closeLists(); parts.push('<h3 style="color:#E8912D;font-size:16px;font-weight:700;margin:16px 0 8px;">' + fmt(h2[1]) + '</h3>'); continue; }
                                  const h3 = ln.match(/^### (.+)/);
                                  if (h3) { closeLists(); parts.push('<h3>' + fmt(h3[1]) + '</h3>'); continue; }
                                  const h4 = ln.match(/^#### (.+)/);
                                  if (h4) { closeLists(); parts.push('<h4 style="font-size:13px;font-weight:700;color:rgba(246,247,255,0.75);margin:12px 0 6px;text-transform:uppercase;letter-spacing:0.05em;">' + fmt(h4[1]) + '</h4>'); continue; }
                                  const ul = ln.match(/^[\-\*] (.+)/);
                                  if (ul) {
                                    if (inOl) { parts.push('</ol>'); inOl = false; }
                                    if (!inUl) { parts.push('<ul style="margin:6px 0;padding-left:18px;">'); inUl = true; }
                                    parts.push('<li style="margin-bottom:4px;">' + fmt(ul[1]) + '</li>');
                                    continue;
                                  }
                                  const ol = ln.match(/^\d+\. (.+)/);
                                  if (ol) {
                                    if (inUl) { parts.push('</ul>'); inUl = false; }
                                    if (!inOl) { parts.push('<ol style="margin:6px 0;padding-left:18px;">'); inOl = true; }
                                    parts.push('<li style="margin-bottom:4px;">' + fmt(ol[1]) + '</li>');
                                    continue;
                                  }
                                  closeLists();
                                  parts.push('<p style="margin:6px 0;">' + fmt(ln) + '</p>');
                                }
                                closeLists();
                                return parts.join('\n');
                              })()
                            }}
                          />
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
              {/* Fallback: Codex output if no phase output */}
              {!phaseOutput && output && (
                <div className="mt-6">
                  <StrategyOutputView meta={meta} output={output} />
                </div>
              )}

              {/* History */}
              <div className="mt-6">
                <StrategyHistoryPanel history={history} onOpen={openHistoryEntry} />
              </div>

              {!permissions.canWrite && selectedClient ? (
                <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/45">
                  <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/28">
                    <CircleAlert className="h-3.5 w-3.5" />
                    Lecture seule
                  </div>
                  Ton role permet de consulter le moteur, mais pas d&apos;ecrire dans les
                  tables strategie.
                </div>
              ) : null}

              {!output && !phaseOutput && selectedClient ? (
                <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-white/38">
                  <div className="mb-2 inline-flex items-center gap-2 text-white/55">
                    <Sparkles className="h-4 w-4" />
                    Sortie structuree
                  </div>
                  <div>
                    Le rendu canonique apparaitra ici apres une generation valide ou
                    apres l&apos;ouverture d&apos;une entree de l&apos;historique.
                  </div>
                </div>
              ) : null}

              {/* Back button on step 4 */}
              <div className="mt-6">
                <WizardNav
                  currentStep={currentStep}
                  canNext={false}
                  onBack={goBack}
                  onNext={() => {}}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
