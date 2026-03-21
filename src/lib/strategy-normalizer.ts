import {
  type StrategyEngineOutput,
  type StrategyGenerationInput,
  type StrategyMissingContextEvaluation,
  type StrategyOutputMeta,
} from "@/lib/strategy-schema";

type LegacyStrategyPayload = Record<string, unknown>;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function splitParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractBullets(value: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, ""))
    .filter(Boolean);

  return Array.from(new Set(lines)).slice(0, 6);
}

function firstNonEmpty(...values: string[]) {
  return values.find((value) => value.trim().length > 0) ?? "";
}

function confidenceLevel(score: number) {
  if (score < 0.55) return "low";
  if (score < 0.78) return "medium";
  return "high";
}

function buildTestPlan(source: LegacyStrategyPayload) {
  const launch = extractBullets(asString(source.launch));
  const build = extractBullets(asString(source.build));
  const scale = extractBullets(asString(source.scale));
  const tests = [...launch, ...build, ...scale].slice(0, 5);

  return tests.map((item, index) => ({
    name: `Test ${index + 1}`,
    hypothesis: item,
    expectedImpact: index === 0 ? "high" : index < 3 ? "medium" : "low",
    difficulty: index < 2 ? "medium" : "low",
    ownerType: index === 0 ? "media_buyer" : index === 1 ? "creative" : "strategist",
    timeline: index < 2 ? "7 jours" : "30 jours",
  })) as StrategyEngineOutput["testPlan"];
}

function buildInternalExecutionPlan(source: LegacyStrategyPayload) {
  return [
    {
      ownerType: "strategist" as const,
      tasks: extractBullets(firstNonEmpty(asString(source.strategy), asString(source.audit))).slice(0, 4),
    },
    {
      ownerType: "media_buyer" as const,
      tasks: extractBullets(firstNonEmpty(asString(source.launch), asString(source.scale))).slice(0, 4),
    },
    {
      ownerType: "creative" as const,
      tasks: extractBullets(firstNonEmpty(asString(source.build), asString(source.research))).slice(0, 4),
    },
    {
      ownerType: "ops_csm" as const,
      tasks: extractBullets(asString(source.kpis)).slice(0, 3),
    },
  ].filter((section) => section.tasks.length > 0);
}

export function normalizeStrategyOutput(args: {
  raw: unknown;
  input: StrategyGenerationInput;
  evaluation: StrategyMissingContextEvaluation;
  requestId: string;
  latencyMs: number;
}): { meta: StrategyOutputMeta; output: StrategyEngineOutput } {
  const payload =
    args.raw && typeof args.raw === "object" ? (args.raw as LegacyStrategyPayload) : {};

  const audit = asString(payload.audit);
  const research = asString(payload.research);
  const strategy = asString(payload.strategy);
  const build = asString(payload.build);
  const launch = asString(payload.launch);
  const scale = asString(payload.scale);
  const kpis = asString(payload.kpis);

  const executiveSummary = firstNonEmpty(
    splitParagraphs(strategy)[0] ?? "",
    splitParagraphs(audit)[0] ?? "",
    "La situation actuelle demande une lecture strategique structuree avant execution.",
  );

  const likelyCauses = extractBullets(firstNonEmpty(audit, research, strategy)).slice(0, 4);
  const topPriorities = extractBullets(
    [strategy, launch, scale]
      .filter(Boolean)
      .join("\n"),
  ).slice(0, 3);
  const risksConstraints = [
    ...extractBullets(args.input.requestContext.constraints.budget),
    ...extractBullets(args.input.requestContext.constraints.fulfillment),
    ...args.evaluation.sourceWarnings,
  ].slice(0, 6);

  const output: StrategyEngineOutput = {
    executiveSummary,
    whatChanged: extractBullets(firstNonEmpty(research, audit)).slice(0, 4),
    diagnosis: {
      primaryBottleneck: firstNonEmpty(
        topPriorities[0] ?? "",
        args.input.requestContext.mainProblem,
        "Le principal goulot d'etranglement reste a confirmer.",
      ),
      likelyCauses,
      reasoning: firstNonEmpty(audit, research, strategy),
    },
    kpiInterpretation: {
      northStar: args.input.resolvedOverlays.kpiFramework.northStar,
      funnel: args.input.resolvedOverlays.kpiFramework.funnel,
      efficiency: args.input.resolvedOverlays.kpiFramework.efficiency,
      guardrails: args.input.resolvedOverlays.kpiFramework.guardrails,
      explanation: firstNonEmpty(kpis, "Les KPIs prioritaires sont calibres selon le business model, le funnel et le stade actuel."),
    },
    topPriorities,
    recommendedActions: {
      ads: extractBullets(firstNonEmpty(launch, strategy)).slice(0, 4),
      creative: extractBullets(firstNonEmpty(build, research)).slice(0, 4),
      funnel: extractBullets(firstNonEmpty(strategy, audit)).slice(0, 4),
      offer: extractBullets(firstNonEmpty(research, strategy)).slice(0, 3),
      crmFollowUp: extractBullets(firstNonEmpty(scale, kpis)).slice(0, 3),
      clientOps: extractBullets(args.input.clientProfile.operations.serviceabilityConstraints).slice(0, 3),
      salesProcess: extractBullets(firstNonEmpty(scale, strategy)).slice(0, 3),
    },
    testPlan: buildTestPlan(payload),
    risksConstraints,
    clientFacingSummary: firstNonEmpty(
      splitParagraphs(strategy)[0] ?? "",
      splitParagraphs(audit)[0] ?? "",
      executiveSummary,
    ),
    internalExecutionPlan: buildInternalExecutionPlan(payload),
    confidenceNote: {
      level: confidenceLevel(args.evaluation.confidenceScore),
      rationale:
        args.evaluation.generationReadiness === "needs_more_context"
          ? "Plusieurs champs critiques manquent encore; la strategie doit etre lue comme une premiere hypothese."
          : args.evaluation.generationReadiness === "low_confidence"
            ? "La recommandation est exploitable, mais certaines sources sont faibles ou incompletes."
            : "Le contexte disponible permet une lecture strategique relativement solide pour une premiere passe.",
      missingInputs: [
        ...args.evaluation.criticalMissing.map((item) => item.label),
        ...args.evaluation.recommendedMissing.map((item) => item.label),
      ].slice(0, 8),
      sourceWarnings: args.evaluation.sourceWarnings,
    },
  };

  return {
    meta: {
      provider: "fastapi_legacy",
      model: "opaque_fastapi_strategy",
      requestId: args.requestId,
      latencyMs: args.latencyMs,
      normalizedFrom: "legacy_fastapi",
    },
    output,
  };
}
