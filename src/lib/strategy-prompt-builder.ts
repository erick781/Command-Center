import {
  type StrategyGenerationInput,
  type StrategyMissingContextEvaluation,
  type StrategySourceContextRecord,
} from "@/lib/strategy-schema";

function formatList(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

function formatSource(source: StrategySourceContextRecord) {
  const metrics = Object.entries(source.snapshot)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" | ");

  return [
    `- ${source.sourceLabel}`,
    `  type: ${source.sourceType}`,
    `  connected: ${source.isConnected ? "yes" : "no"}`,
    `  freshness: ${source.freshnessStatus}`,
    `  confidence: ${(source.confidenceScore * 100).toFixed(0)}%`,
    `  estimated: ${source.isEstimated ? "yes" : "no"}`,
    source.warnings.length > 0 ? `  warnings: ${source.warnings.join(" | ")}` : "",
    metrics ? `  snapshot: ${metrics}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildStructuredStrategyContext(
  input: StrategyGenerationInput,
  evaluation: StrategyMissingContextEvaluation,
) {
  const profile = input.clientProfile;
  const request = input.requestContext;
  const overlays = input.resolvedOverlays;

  return [
    "# Strategist System",
    "You are acting as a senior agency strategist for Partenaire.io and Triade Marketing.",
    "Do not assume missing facts. Use caution when data confidence is low.",
    "Adapt recommendations to niche, business model, stage, KPI hierarchy, and operational constraints.",
    "",
    "# Client Profile",
    `Client: ${profile.clientName}`,
    `Brand: ${profile.identity.brandName || profile.clientName}`,
    `Website: ${profile.identity.websiteUrl || "unknown"}`,
    `Language: ${profile.identity.language}`,
    `Region: ${profile.identity.region || "unknown"}`,
    `Industry: ${profile.business.industry || "unknown"}`,
    `Sub-industry: ${profile.business.subIndustry || "unknown"}`,
    `Niche overlay: ${overlays.niche}`,
    `Business model: ${overlays.businessModel}`,
    `Offer type: ${profile.business.offerType || "unknown"}`,
    `Main offer: ${profile.offers.mainOffer || "unknown"}`,
    `Pricing model: ${profile.business.pricingModel || "unknown"}`,
    `Average ticket: ${profile.business.averageTicket || "unknown"}`,
    `Average order value: ${profile.business.averageOrderValue || "unknown"}`,
    `Estimated margin: ${profile.business.estimatedMarginRange || "unknown"}`,
    `Audience / ICP: ${profile.audience.idealCustomerProfile || "unknown"}`,
    `Target geo: ${profile.audience.targetGeo || "unknown"}`,
    `Funnel type: ${profile.funnel.funnelType || "unknown"}`,
    `Traffic destination: ${profile.funnel.trafficDestination || "unknown"}`,
    `Conversion event: ${profile.funnel.conversionEvent || "unknown"}`,
    `Sales process: ${profile.funnel.salesProcess || "unknown"}`,
    `Booking process: ${profile.funnel.bookingProcess || "unknown"}`,
    `Follow-up process: ${profile.funnel.followUpProcess || "unknown"}`,
    `CRM used: ${profile.funnel.crmUsed || "unknown"}`,
    `Acquisition channels: ${profile.marketing.acquisitionChannels.join(", ") || "none"}`,
    `Operational constraints: ${profile.operations.serviceabilityConstraints || "none stated"}`,
    `Known blockers: ${profile.internalNotes.recurringBlockers.join(", ") || "none stated"}`,
    "",
    "# Strategy Request",
    `Objective: ${request.objective}`,
    `Stage: ${request.stage}`,
    `Time horizon: ${request.timeHorizon}`,
    `Priority KPI: ${request.priorityKpi || "not confirmed"}`,
    `Main problem: ${request.mainProblem || "not confirmed"}`,
    `Severity: ${request.severity}`,
    `When did it start: ${request.startedAtHint || "unknown"}`,
    `Desired deliverable: ${request.requestedOutputs.join(", ")}`,
    "Recent changes:",
    formatList(request.recentChanges),
    "What has been tested:",
    formatList([
      ...request.testedContext.creatives,
      ...request.testedContext.angles,
      ...request.testedContext.audiences,
      ...request.testedContext.offers,
      ...request.testedContext.funnels,
      ...request.testedContext.landingPages,
      ...request.testedContext.followUpChanges,
    ]),
    "What worked:",
    formatList(request.testedContext.worked),
    "What did not work:",
    formatList(request.testedContext.didNotWork),
    "Constraints:",
    formatList(
      Object.entries(request.constraints)
        .filter(([, value]) => value.trim().length > 0)
        .map(([key, value]) => `${key}: ${value}`),
    ),
    request.manualNotes ? `Manual notes:\n${request.manualNotes}` : "",
    "",
    "# KPI Logic",
    `North star KPIs: ${overlays.kpiFramework.northStar.join(", ")}`,
    `Funnel KPIs: ${overlays.kpiFramework.funnel.join(", ")}`,
    `Efficiency KPIs: ${overlays.kpiFramework.efficiency.join(", ")}`,
    `Guardrail KPIs: ${overlays.kpiFramework.guardrails.join(", ")}`,
    "",
    "# Connected Sources",
    input.sourceContext.map(formatSource).join("\n"),
    "",
    "# Missing Context",
    `Generation readiness: ${evaluation.generationReadiness}`,
    `Confidence score: ${(evaluation.confidenceScore * 100).toFixed(0)}%`,
    "Critical missing questions:",
    formatList(evaluation.criticalMissing.map((item) => item.question)),
    "Recommended missing questions:",
    formatList(evaluation.recommendedMissing.map((item) => item.question)),
    "Source warnings:",
    formatList(evaluation.sourceWarnings),
    "",
    "# Output Contract",
    "Return a strategist-grade diagnosis with the following ideas covered: executive summary, likely changes, diagnosis, KPI interpretation, top priorities, concrete actions, prioritized test plan, risks, client-facing explanation, internal execution guidance, and a confidence note.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildFastApiStrategyPayload(
  input: StrategyGenerationInput,
  evaluation: StrategyMissingContextEvaluation,
) {
  return {
    client_name: input.clientProfile.clientName,
    industry: input.clientProfile.business.industry || input.resolvedOverlays.niche,
    strategy_type: input.resolvedOverlays.businessModel,
    context: buildStructuredStrategyContext(input, evaluation),
  };
}
