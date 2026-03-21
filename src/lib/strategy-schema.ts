export const STRATEGY_NICHES = [
  "ecommerce",
  "coaching_high_ticket",
  "construction_local_services",
  "appointment_local",
  "b2b_lead_gen",
] as const;

export const BUSINESS_MODELS = [
  "direct_purchase",
  "lead_gen",
  "application_funnel",
  "booked_call",
  "quote_request",
  "appointment_booking",
  "subscription",
  "launch_cohort",
] as const;

export const STRATEGY_STAGES = [
  "launch",
  "stabilization",
  "scaling",
  "recovery",
  "seasonal_push",
  "optimization",
] as const;

export const STRATEGY_OBJECTIVES = [
  "launch",
  "stabilize",
  "scale",
  "recover",
  "creative_refresh",
  "funnel_optimization",
  "offer_repositioning",
  "improve_lead_quality",
  "improve_close_rate",
  "improve_show_up_rate",
  "improve_profitability",
  "seasonal_push",
  "retention_reactivation",
] as const;

export const TIME_HORIZONS = ["7_days", "30_days", "90_days"] as const;

export const OUTPUT_MODES = [
  "executive_summary",
  "30_day_action_plan",
  "paid_media_strategy",
  "funnel_strategy",
  "creative_testing_plan",
  "client_facing_summary",
  "internal_execution_brief",
  "recovery_diagnosis",
  "launch_plan",
  "retargeting_plan",
] as const;

export const SOURCE_TYPES = [
  "meta_ads",
  "google_ads",
  "sheets",
  "slack",
  "asana",
  "drive",
  "crm",
  "website",
  "manual",
] as const;

export const SOURCE_FRESHNESS_STATUSES = [
  "today",
  "days_1_2",
  "stale",
  "missing",
  "unknown",
] as const;

export const READINESS_STATES = [
  "ready",
  "needs_more_context",
  "low_confidence",
] as const;

export const REQUEST_SEVERITIES = ["low", "medium", "high"] as const;

export type StrategyNiche = (typeof STRATEGY_NICHES)[number];
export type StrategyBusinessModel = (typeof BUSINESS_MODELS)[number];
export type StrategyStage = (typeof STRATEGY_STAGES)[number];
export type StrategyObjective = (typeof STRATEGY_OBJECTIVES)[number];
export type StrategyTimeHorizon = (typeof TIME_HORIZONS)[number];
export type StrategyOutputMode = (typeof OUTPUT_MODES)[number];
export type StrategySourceType = (typeof SOURCE_TYPES)[number];
export type SourceFreshnessStatus = (typeof SOURCE_FRESHNESS_STATUSES)[number];
export type GenerationReadiness = (typeof READINESS_STATES)[number];
export type StrategySeverity = (typeof REQUEST_SEVERITIES)[number];

export type StrategySeedClient = {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  status?: string | null;
  health_score?: string | null;
  retainer_monthly?: number | null;
  monthly_budget?: number | null;
  notes?: string | null;
  meta_data?: Record<string, unknown> | null;
  asana_project_id?: string | null;
  slack_channel_id?: string | null;
  google_drive_folder_id?: string | null;
  client_notes?: Array<Record<string, unknown>> | null;
  client_activity?: Array<Record<string, unknown>> | null;
};

export type StrategyProfileIdentity = {
  brandName: string;
  websiteUrl: string;
  primaryContact: string;
  accountManager: string;
  language: "fr" | "en";
  region: string;
};

export type StrategyProfileBusiness = {
  industry: string;
  subIndustry: string;
  niche: StrategyNiche | "";
  businessModel: StrategyBusinessModel | "";
  offerType: string;
  pricingModel: string;
  averageTicket: string;
  averageOrderValue: string;
  estimatedMarginRange: string;
  seasonalityNotes: string;
};

export type StrategyProfileOffers = {
  mainOffer: string;
  secondaryOffers: string[];
  flagshipOffer: string;
  promoModel: string;
  financingAvailable: string;
  guarantee: string;
  differentiators: string[];
};

export type StrategyProfileAudience = {
  idealCustomerProfile: string;
  personas: string[];
  targetGeo: string;
  objections: string[];
  painPoints: string[];
  desires: string[];
  buyingTriggers: string[];
};

export type StrategyProfileFunnel = {
  funnelType: string;
  trafficDestination: string;
  conversionEvent: string;
  salesProcess: string;
  bookingProcess: string;
  followUpProcess: string;
  crmUsed: string;
  averageSalesCycle: string;
  knownConstraints: string[];
};

export type StrategyProfileMarketing = {
  acquisitionChannels: string[];
  metaActive: boolean;
  googleActive: boolean;
  emailActive: boolean;
  smsActive: boolean;
  organicActive: boolean;
  retargetingStatus: string;
  creativeVolumeCapacity: string;
};

export type StrategyProfilePerformanceHistory = {
  pastWinningAngles: string[];
  pastLosingAngles: string[];
  bestCreativeFormats: string[];
  bestOffersTested: string[];
  previousStrategyNotes: string;
  historicalConstraints: string[];
};

export type StrategyProfileOperations = {
  fulfillmentCapacity: string;
  salesCapacity: string;
  territoryConstraints: string;
  inventoryConstraints: string;
  staffingConstraints: string;
  bookingDelay: string;
  serviceabilityConstraints: string;
};

export type StrategyProfileCompliance = {
  toneOfVoice: string;
  claimsAllowed: string[];
  claimsNotAllowed: string[];
  brandGuidelines: string;
  legalComplianceNotes: string;
};

export type StrategyProfileInternalNotes = {
  clientRiskNotes: string;
  communicationPreferences: string;
  approvalSpeed: string;
  recurringBlockers: string[];
  internalContextNotes: string;
};

export type StrategyProfileRecord = {
  id?: string;
  clientId: string;
  clientName: string;
  status?: "active" | "archived";
  identity: StrategyProfileIdentity;
  business: StrategyProfileBusiness;
  offers: StrategyProfileOffers;
  audience: StrategyProfileAudience;
  funnel: StrategyProfileFunnel;
  marketing: StrategyProfileMarketing;
  performanceHistory: StrategyProfilePerformanceHistory;
  operations: StrategyProfileOperations;
  compliance: StrategyProfileCompliance;
  internalNotes: StrategyProfileInternalNotes;
  connectedSourceSummary: Record<string, unknown>;
  completenessScore: number;
  missingImportantFields: string[];
  recommendedMissingFields: string[];
  updatedAt?: string;
};

export type StrategyProfileEditableSection =
  | "identity"
  | "business"
  | "offers"
  | "audience"
  | "funnel"
  | "marketing"
  | "performanceHistory"
  | "operations"
  | "compliance"
  | "internalNotes";

export type StrategyRequestRecord = {
  id?: string;
  profileId?: string;
  clientId: string;
  status?: "draft" | "ready_for_generation" | "generated" | "approved" | "archived";
  objective: StrategyObjective;
  stage: StrategyStage;
  timeHorizon: StrategyTimeHorizon;
  priorityKpi: string;
  mainProblem: string;
  severity: StrategySeverity;
  startedAtHint: string;
  recentChanges: string[];
  testedContext: {
    creatives: string[];
    angles: string[];
    audiences: string[];
    offers: string[];
    funnels: string[];
    landingPages: string[];
    followUpChanges: string[];
    worked: string[];
    didNotWork: string[];
  };
  constraints: {
    budget: string;
    timeline: string;
    creativeProduction: string;
    approvals: string;
    salesCapacity: string;
    fulfillment: string;
    inventory: string;
    compliance: string;
  };
  requestedOutputs: StrategyOutputMode[];
  manualNotes: string;
  missingQuestions: string[];
  answeredMissingContext: Record<string, string>;
  retrievedContextSnapshot: Record<string, unknown>;
  dataConfidence: Record<string, unknown>;
  generatedAt?: string | null;
  updatedAt?: string;
};

export type StrategySourceContextRecord = {
  id?: string;
  profileId?: string;
  requestId?: string;
  sourceType: StrategySourceType;
  sourceLabel: string;
  isConnected: boolean;
  freshnessStatus: SourceFreshnessStatus;
  lastSyncedAt: string | null;
  confidenceScore: number;
  isEstimated: boolean;
  warnings: string[];
  snapshot: Record<string, unknown>;
};

export type StrategyKpiFramework = {
  northStar: string[];
  funnel: string[];
  efficiency: string[];
  guardrails: string[];
};

export type StrategyResolvedOverlays = {
  businessModel: StrategyBusinessModel;
  niche: StrategyNiche;
  stage: StrategyStage;
  objective: StrategyObjective;
  primaryOutputMode: StrategyOutputMode;
  kpiFramework: StrategyKpiFramework;
  priorityKpiOptions: string[];
};

export type StrategyMissingQuestion = {
  field: string;
  label: string;
  question: string;
};

export type StrategyMissingContextEvaluation = {
  criticalMissing: StrategyMissingQuestion[];
  recommendedMissing: StrategyMissingQuestion[];
  autofillCandidates: string[];
  generationReadiness: GenerationReadiness;
  confidencePenalty: number;
  confidenceScore: number;
  sourceWarnings: string[];
};

export type StrategyOutputSection = {
  heading: string;
  items: string[];
};

export type StrategyEngineOutput = {
  executiveSummary: string;
  whatChanged: string[];
  diagnosis: {
    primaryBottleneck: string;
    likelyCauses: string[];
    reasoning: string;
  };
  kpiInterpretation: {
    northStar: string[];
    funnel: string[];
    efficiency: string[];
    guardrails: string[];
    explanation: string;
  };
  topPriorities: string[];
  recommendedActions: {
    ads: string[];
    creative: string[];
    funnel: string[];
    offer: string[];
    crmFollowUp: string[];
    clientOps: string[];
    salesProcess: string[];
  };
  testPlan: Array<{
    name: string;
    hypothesis: string;
    expectedImpact: "low" | "medium" | "high";
    difficulty: "low" | "medium" | "high";
    ownerType: "strategist" | "media_buyer" | "creative" | "ops_csm" | "client";
    timeline: string;
  }>;
  risksConstraints: string[];
  clientFacingSummary: string;
  internalExecutionPlan: Array<{
    ownerType: "strategist" | "media_buyer" | "creative" | "ops_csm" | "client";
    tasks: string[];
  }>;
  confidenceNote: {
    level: "low" | "medium" | "high";
    rationale: string;
    missingInputs: string[];
    sourceWarnings: string[];
  };
};

export type StrategyOutputMeta = {
  provider: string;
  model: string;
  requestId: string;
  latencyMs: number;
  normalizedFrom: "legacy_fastapi" | "canonical";
};

export type StrategyHistoryRecord = {
  id: string;
  clientId: string;
  clientName: string;
  outputMode: StrategyOutputMode;
  status: string;
  generatedAt: string;
  executiveSummary: string;
  confidenceLevel: "low" | "medium" | "high";
  output?: StrategyEngineOutput | null;
};

export type StrategyGenerationInput = {
  clientProfile: StrategyProfileRecord;
  requestContext: StrategyRequestRecord;
  sourceContext: StrategySourceContextRecord[];
  resolvedOverlays: StrategyResolvedOverlays;
  generationOptions: {
    outputMode: StrategyOutputMode;
    language: "fr" | "en";
  };
};

export function createEmptyStrategyProfile(
  overrides: Partial<StrategyProfileRecord> = {},
): StrategyProfileRecord {
  return {
    clientId: "",
    clientName: "",
    status: "active",
    identity: {
      brandName: "",
      websiteUrl: "",
      primaryContact: "",
      accountManager: "",
      language: "fr",
      region: "",
    },
    business: {
      industry: "",
      subIndustry: "",
      niche: "",
      businessModel: "",
      offerType: "",
      pricingModel: "",
      averageTicket: "",
      averageOrderValue: "",
      estimatedMarginRange: "",
      seasonalityNotes: "",
    },
    offers: {
      mainOffer: "",
      secondaryOffers: [],
      flagshipOffer: "",
      promoModel: "",
      financingAvailable: "",
      guarantee: "",
      differentiators: [],
    },
    audience: {
      idealCustomerProfile: "",
      personas: [],
      targetGeo: "",
      objections: [],
      painPoints: [],
      desires: [],
      buyingTriggers: [],
    },
    funnel: {
      funnelType: "",
      trafficDestination: "",
      conversionEvent: "",
      salesProcess: "",
      bookingProcess: "",
      followUpProcess: "",
      crmUsed: "",
      averageSalesCycle: "",
      knownConstraints: [],
    },
    marketing: {
      acquisitionChannels: [],
      metaActive: false,
      googleActive: false,
      emailActive: false,
      smsActive: false,
      organicActive: false,
      retargetingStatus: "",
      creativeVolumeCapacity: "",
    },
    performanceHistory: {
      pastWinningAngles: [],
      pastLosingAngles: [],
      bestCreativeFormats: [],
      bestOffersTested: [],
      previousStrategyNotes: "",
      historicalConstraints: [],
    },
    operations: {
      fulfillmentCapacity: "",
      salesCapacity: "",
      territoryConstraints: "",
      inventoryConstraints: "",
      staffingConstraints: "",
      bookingDelay: "",
      serviceabilityConstraints: "",
    },
    compliance: {
      toneOfVoice: "",
      claimsAllowed: [],
      claimsNotAllowed: [],
      brandGuidelines: "",
      legalComplianceNotes: "",
    },
    internalNotes: {
      clientRiskNotes: "",
      communicationPreferences: "",
      approvalSpeed: "",
      recurringBlockers: [],
      internalContextNotes: "",
    },
    connectedSourceSummary: {},
    completenessScore: 0,
    missingImportantFields: [],
    recommendedMissingFields: [],
    ...overrides,
  };
}

export function createEmptyStrategyRequest(
  overrides: Partial<StrategyRequestRecord> = {},
): StrategyRequestRecord {
  return {
    clientId: "",
    status: "draft",
    objective: "stabilize",
    stage: "stabilization",
    timeHorizon: "30_days",
    priorityKpi: "",
    mainProblem: "",
    severity: "medium",
    startedAtHint: "",
    recentChanges: [],
    testedContext: {
      creatives: [],
      angles: [],
      audiences: [],
      offers: [],
      funnels: [],
      landingPages: [],
      followUpChanges: [],
      worked: [],
      didNotWork: [],
    },
    constraints: {
      budget: "",
      timeline: "",
      creativeProduction: "",
      approvals: "",
      salesCapacity: "",
      fulfillment: "",
      inventory: "",
      compliance: "",
    },
    requestedOutputs: ["30_day_action_plan"],
    manualNotes: "",
    missingQuestions: [],
    answeredMissingContext: {},
    retrievedContextSnapshot: {},
    dataConfidence: {},
    generatedAt: null,
    ...overrides,
  };
}
