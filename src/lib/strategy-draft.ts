export type StrategyMetric = {
  label: string;
  value: string;
};

export type RetrievedContextSnapshot = {
  budget: string;
  integrations: string[];
  metrics: StrategyMetric[];
  name: string;
  notes: string[];
  profileCompleteness: number;
  website: string;
};

export type StrategyDraftStatus = "draft" | "generated" | "approved";

export type StrategyRequestDraft = {
  clientId: string;
  clientName: string;
  constraints: string;
  generatedAt: string | null;
  industry: string;
  mainProblem: string;
  missingQuestions: string[];
  notes: string;
  objective: string;
  outputMode: string;
  recentChanges: string;
  retrievedContextSnapshot: RetrievedContextSnapshot | null;
  status: StrategyDraftStatus;
  strategyType: string;
  tested: string;
  timeHorizon: string;
  updatedAt: string;
  version: 1;
};

export type StrategyHistoryEntry = {
  clientId: string;
  clientName: string;
  draft: StrategyRequestDraft;
  generatedAt: string | null;
  id: string;
  mainProblem: string;
  objective: string;
  outputMode: string;
  savedAt: string;
  status: StrategyDraftStatus;
  strategyType: string;
  summary: string;
};

type StrategyResponseLike = Record<string, string | boolean | undefined>;

const strategyTypeLabels: Record<string, string> = {
  "360": "Strategie 360",
  branding: "Branding & Positionnement",
  ecommerce: "Strategie eCommerce",
  leadgen: "Generation de Leads",
  recrutement: "Recrutement / Marketing RH",
  social: "Reseaux Sociaux",
  video: "Strategie Video",
};

export function strategyTypeLabel(value: string) {
  return strategyTypeLabels[value] || value;
}

export function createStrategyDraft(
  overrides: Partial<StrategyRequestDraft> = {},
): StrategyRequestDraft {
  return {
    clientId: "",
    clientName: "",
    constraints: "",
    generatedAt: null,
    industry: "",
    mainProblem: "Leads too expensive",
    missingQuestions: [],
    notes: "",
    objective: "stabilize",
    outputMode: "30_day_plan",
    recentChanges: "",
    retrievedContextSnapshot: null,
    status: "draft",
    strategyType: "360",
    tested: "",
    timeHorizon: "30_days",
    updatedAt: new Date().toISOString(),
    version: 1,
    ...overrides,
  };
}

export function buildStrategyContext(draft: StrategyRequestDraft) {
  const context = draft.retrievedContextSnapshot;

  return [
    `Client: ${draft.clientName || "Unknown client"}`,
    `Industry: ${draft.industry || "unknown"}`,
    `Strategy type: ${strategyTypeLabel(draft.strategyType)}`,
    `Objective: ${draft.objective}`,
    `Time horizon: ${draft.timeHorizon}`,
    `Desired output: ${draft.outputMode}`,
    `Main problem: ${draft.mainProblem}`,
    `Website: ${context?.website || "unknown"}`,
    `Budget range: ${context?.budget || "--"}`,
    `Connected sources: ${context?.integrations.join(", ") || "none"}`,
    `Performance snapshot: ${
      context?.metrics.map((metric) => `${metric.label}=${metric.value}`).join(" | ") ||
      "none"
    }`,
    draft.recentChanges ? `Recent changes: ${draft.recentChanges}` : "",
    draft.tested ? `What has already been tested: ${draft.tested}` : "",
    draft.constraints ? `Constraints: ${draft.constraints}` : "",
    draft.notes ? `Additional notes: ${draft.notes}` : "",
    draft.missingQuestions.length > 0
      ? `Missing context to verify: ${draft.missingQuestions.join(" | ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function summarizeStrategyOutput(strategy: StrategyResponseLike) {
  return [strategy.audit, strategy.strategy, strategy.kpis]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n\n")
    .slice(0, 1200);
}

export function createStrategyHistoryEntry(
  draft: StrategyRequestDraft,
  strategy: StrategyResponseLike,
): StrategyHistoryEntry {
  const savedAt = new Date().toISOString();

  return {
    clientId: draft.clientId,
    clientName: draft.clientName,
    draft: { ...draft },
    generatedAt: draft.generatedAt,
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${savedAt}-${Math.random().toString(36).slice(2, 10)}`,
    mainProblem: draft.mainProblem,
    objective: draft.objective,
    outputMode: draft.outputMode,
    savedAt,
    status: draft.status,
    strategyType: draft.strategyType,
    summary: summarizeStrategyOutput(strategy),
  };
}
