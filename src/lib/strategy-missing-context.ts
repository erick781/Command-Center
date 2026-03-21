import {
  type StrategyGenerationInput,
  type StrategyMissingContextEvaluation,
  type StrategyMissingQuestion,
  type StrategyProfileRecord,
  type StrategyRequestRecord,
  type StrategyResolvedOverlays,
  type StrategySourceContextRecord,
} from "@/lib/strategy-schema";

type MissingRule = {
  critical?: boolean;
  field: string;
  label: string;
  question: string;
  when?: (input: StrategyGenerationInput) => boolean;
  value: (input: StrategyGenerationInput) => unknown;
};

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function question(rule: MissingRule): StrategyMissingQuestion {
  return {
    field: rule.field,
    label: rule.label,
    question: rule.question,
  };
}

const baseRules: MissingRule[] = [
  {
    critical: true,
    field: "identity.websiteUrl",
    label: "Website",
    question: "Quel est le site ou la landing page actuelle du client ?",
    value: (input) => input.clientProfile.identity.websiteUrl,
  },
  {
    critical: true,
    field: "business.industry",
    label: "Industrie",
    question: "Dans quelle niche precise ce client opere-t-il ?",
    value: (input) => input.clientProfile.business.industry,
  },
  {
    critical: true,
    field: "business.businessModel",
    label: "Business model",
    question: "Quel est le vrai business model du client pour cette strategie ?",
    value: (input) => input.clientProfile.business.businessModel,
  },
  {
    critical: true,
    field: "offers.mainOffer",
    label: "Main offer",
    question: "Quelle offre principale doit etre poussee maintenant ?",
    value: (input) => input.clientProfile.offers.mainOffer,
  },
  {
    critical: true,
    field: "funnel.funnelType",
    label: "Funnel type",
    question: "Quel type de funnel est actif aujourd'hui ?",
    value: (input) => input.clientProfile.funnel.funnelType,
  },
  {
    critical: true,
    field: "funnel.conversionEvent",
    label: "Conversion event",
    question: "Quel est l'evenement de conversion principal a optimiser ?",
    value: (input) => input.clientProfile.funnel.conversionEvent,
  },
  {
    critical: true,
    field: "request.mainProblem",
    label: "Current problem",
    question: "Quel est le probleme principal a regler maintenant ?",
    value: (input) => input.requestContext.mainProblem,
  },
  {
    field: "request.priorityKpi",
    label: "Priority KPI",
    question: "Quel KPI prioritaire doit guider cette recommandation ?",
    value: (input) => input.requestContext.priorityKpi,
  },
];

const ecommerceRules: MissingRule[] = [
  {
    critical: true,
    field: "business.averageOrderValue",
    label: "AOV",
    question: "Quel est le AOV actuel ou estime ?",
    when: (input) => input.resolvedOverlays.niche === "ecommerce",
    value: (input) => input.clientProfile.business.averageOrderValue,
  },
  {
    critical: true,
    field: "business.estimatedMarginRange",
    label: "Margin range",
    question: "Quelle est la marge approximative sur les ventes ?",
    when: (input) => input.resolvedOverlays.niche === "ecommerce",
    value: (input) => input.clientProfile.business.estimatedMarginRange,
  },
  {
    field: "operations.inventoryConstraints",
    label: "Inventory constraints",
    question: "Y a-t-il des contraintes d'inventaire ou de promo a prendre en compte ?",
    when: (input) => input.resolvedOverlays.niche === "ecommerce",
    value: (input) => input.clientProfile.operations.inventoryConstraints,
  },
  {
    field: "marketing.emailActive",
    label: "Email / SMS retention",
    question: "Quels flows email / SMS sont actifs en retention ?",
    when: (input) => input.resolvedOverlays.niche === "ecommerce",
    value: (input) =>
      input.clientProfile.marketing.emailActive || input.clientProfile.marketing.smsActive,
  },
];

const highTicketRules: MissingRule[] = [
  {
    critical: true,
    field: "business.averageTicket",
    label: "Offer price",
    question: "Quel est le prix de l'offre ou la valeur moyenne vendue ?",
    when: (input) =>
      input.resolvedOverlays.niche === "coaching_high_ticket" ||
      input.resolvedOverlays.businessModel === "application_funnel" ||
      input.resolvedOverlays.businessModel === "booked_call",
    value: (input) => input.clientProfile.business.averageTicket,
  },
  {
    critical: true,
    field: "funnel.bookingProcess",
    label: "Booking process",
    question: "Comment passe-t-on du lead au call / a l'application ?",
    when: (input) =>
      input.resolvedOverlays.niche === "coaching_high_ticket" ||
      input.resolvedOverlays.businessModel === "booked_call",
    value: (input) => input.clientProfile.funnel.bookingProcess,
  },
  {
    critical: true,
    field: "operations.salesCapacity",
    label: "Sales capacity",
    question: "Quelle est la capacite reelle de l'equipe de vente ?",
    when: (input) =>
      input.resolvedOverlays.niche === "coaching_high_ticket" ||
      input.resolvedOverlays.businessModel === "application_funnel" ||
      input.resolvedOverlays.businessModel === "booked_call",
    value: (input) => input.clientProfile.operations.salesCapacity,
  },
];

const localServiceRules: MissingRule[] = [
  {
    critical: true,
    field: "audience.targetGeo",
    label: "Service area",
    question: "Quelle zone geographique peut reellement etre servie ?",
    when: (input) =>
      input.resolvedOverlays.niche === "construction_local_services" ||
      input.resolvedOverlays.niche === "appointment_local",
    value: (input) => input.clientProfile.audience.targetGeo,
  },
  {
    field: "operations.bookingDelay",
    label: "Booking delay",
    question: "Quel est le delai de prise en charge ou de booking actuellement ?",
    when: (input) =>
      input.resolvedOverlays.niche === "construction_local_services" ||
      input.resolvedOverlays.niche === "appointment_local",
    value: (input) => input.clientProfile.operations.bookingDelay,
  },
  {
    field: "operations.serviceabilityConstraints",
    label: "Capacity constraints",
    question: "Quelles contraintes d'operation ou de capacite peuvent freiner l'execution ?",
    when: (input) =>
      input.resolvedOverlays.niche === "construction_local_services" ||
      input.resolvedOverlays.niche === "appointment_local",
    value: (input) => input.clientProfile.operations.serviceabilityConstraints,
  },
];

const recoveryRules: MissingRule[] = [
  {
    critical: true,
    field: "request.recentChanges",
    label: "Recent changes",
    question: "Qu'est-ce qui a change recemment avant la baisse de performance ?",
    when: (input) => input.requestContext.stage === "recovery",
    value: (input) => input.requestContext.recentChanges,
  },
  {
    critical: true,
    field: "request.testedContext",
    label: "Tested context",
    question: "Quels tests ou changements ont deja ete faits ?",
    when: (input) => input.requestContext.stage === "recovery",
    value: (input) => [
      ...input.requestContext.testedContext.creatives,
      ...input.requestContext.testedContext.angles,
      ...input.requestContext.testedContext.offers,
      ...input.requestContext.testedContext.funnels,
    ],
  },
];

function collectRules(input: StrategyGenerationInput) {
  return [...baseRules, ...ecommerceRules, ...highTicketRules, ...localServiceRules, ...recoveryRules].filter(
    (rule) => !rule.when || rule.when(input),
  );
}

function buildAutofillCandidates(
  profile: StrategyProfileRecord,
  sourceContext: StrategySourceContextRecord[],
) {
  const candidates = new Set<string>();

  if (profile.identity.websiteUrl) candidates.add("website");
  if (profile.business.industry) candidates.add("industry");
  if (profile.marketing.metaActive) candidates.add("meta_ads");
  if (profile.marketing.acquisitionChannels.length > 0) candidates.add("acquisition_channels");

  sourceContext.forEach((source) => {
    if (source.isConnected && source.sourceType !== "manual") {
      candidates.add(source.sourceType);
    }
  });

  return [...candidates];
}

function buildSourceWarnings(
  sourceContext: StrategySourceContextRecord[],
  request: StrategyRequestRecord,
  overlays: StrategyResolvedOverlays,
) {
  const warnings = sourceContext.flatMap((source) => source.warnings);

  if (!sourceContext.some((source) => source.sourceType === "meta_ads" && source.isConnected)) {
    warnings.push("Aucune source Meta Ads connectee ou confirmee.");
  }

  if (
    overlays.businessModel !== "direct_purchase" &&
    !sourceContext.some((source) => source.sourceType === "manual" && source.isConnected)
  ) {
    warnings.push("Les notes manuelles internes sont faibles ou absentes.");
  }

  if (!request.priorityKpi.trim()) {
    warnings.push("Le KPI prioritaire n'est pas encore confirme.");
  }

  return Array.from(new Set(warnings));
}

export function evaluateMissingContext(input: StrategyGenerationInput): StrategyMissingContextEvaluation {
  const rules = collectRules(input);
  const criticalMissing = rules
    .filter((rule) => rule.critical && !hasValue(rule.value(input)))
    .map(question);
  const recommendedMissing = rules
    .filter((rule) => !rule.critical && !hasValue(rule.value(input)))
    .map(question);
  const sourceWarnings = buildSourceWarnings(
    input.sourceContext,
    input.requestContext,
    input.resolvedOverlays,
  );

  let confidencePenalty = 0;
  confidencePenalty += criticalMissing.length * 0.16;
  confidencePenalty += recommendedMissing.length * 0.05;
  confidencePenalty += sourceWarnings.length * 0.04;

  const confidenceScore = Math.max(0.12, Math.min(0.96, 0.92 - confidencePenalty));
  const generationReadiness =
    criticalMissing.length > 0
      ? "needs_more_context"
      : confidenceScore < 0.62
        ? "low_confidence"
        : "ready";

  return {
    criticalMissing,
    recommendedMissing,
    autofillCandidates: buildAutofillCandidates(
      input.clientProfile,
      input.sourceContext,
    ),
    generationReadiness,
    confidencePenalty,
    confidenceScore,
    sourceWarnings,
  };
}
