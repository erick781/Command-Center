import {
  createEmptyStrategyProfile,
  type StrategyProfileRecord,
} from "@/lib/strategy-schema";
import { saveStrategyProfile } from "@/lib/strategy-store";

type SupabaseClientLike = {
  auth: {
    getUser: () => Promise<{
      data: { user: { email?: string | null; id: string } | null };
      error: { message: string } | null;
    }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export type ClientMemorySeed = {
  id: string;
  industry?: string | null;
  name: string;
  notes?: string | null;
  website?: string | null;
};

export type ClientMemoryForm = {
  approvalSpeed: string;
  bestCreativeFormats: string;
  brandGuidelines: string;
  businessModel: string;
  buyingTriggers: string;
  communicationPreferences: string;
  crmUsed: string;
  differentiators: string;
  flagshipOffer: string;
  followUpProcess: string;
  idealCustomerProfile: string;
  internalContextNotes: string;
  knownConstraints: string;
  mainOffer: string;
  objections: string;
  painPoints: string;
  pastLosingAngles: string;
  pastWinningAngles: string;
  previousStrategyNotes: string;
  pricingModel: string;
  recurringBlockers: string;
  salesProcess: string;
  seasonalityNotes: string;
  targetGeo: string;
  toneOfVoice: string;
};

type StrategyProfileRow = {
  audience?: Partial<StrategyProfileRecord["audience"]> | null;
  business?: Partial<StrategyProfileRecord["business"]> | null;
  client_id?: string | null;
  client_name?: string | null;
  completeness_score?: number | null;
  compliance?: Partial<StrategyProfileRecord["compliance"]> | null;
  connected_source_summary?: Record<string, unknown> | null;
  funnel?: Partial<StrategyProfileRecord["funnel"]> | null;
  id?: string | null;
  identity?: Partial<StrategyProfileRecord["identity"]> | null;
  internal_notes?: Partial<StrategyProfileRecord["internalNotes"]> | null;
  marketing?: Partial<StrategyProfileRecord["marketing"]> | null;
  missing_important_fields?: string[] | null;
  offers?: Partial<StrategyProfileRecord["offers"]> | null;
  operations?: Partial<StrategyProfileRecord["operations"]> | null;
  performance_history?: Partial<StrategyProfileRecord["performanceHistory"]> | null;
  recommended_missing_fields?: string[] | null;
  status?: StrategyProfileRecord["status"] | null;
  updated_at?: string | null;
};

export const clientMemoryKeys = [
  "mainOffer",
  "flagshipOffer",
  "differentiators",
  "businessModel",
  "pricingModel",
  "seasonalityNotes",
  "idealCustomerProfile",
  "targetGeo",
  "objections",
  "painPoints",
  "buyingTriggers",
  "salesProcess",
  "followUpProcess",
  "crmUsed",
  "knownConstraints",
  "pastWinningAngles",
  "pastLosingAngles",
  "bestCreativeFormats",
  "previousStrategyNotes",
  "communicationPreferences",
  "approvalSpeed",
  "recurringBlockers",
  "internalContextNotes",
  "toneOfVoice",
  "brandGuidelines",
] as const;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function splitList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.map((item) => item.trim()).filter(Boolean).join("\n") : "";
}

function createSeedProfile(seed: ClientMemorySeed): StrategyProfileRecord {
  const defaults = createEmptyStrategyProfile();

  return {
    ...defaults,
    clientId: seed.id,
    clientName: seed.name,
    identity: {
      ...defaults.identity,
      brandName: seed.name,
      websiteUrl: normalizeString(seed.website),
    },
    business: {
      ...defaults.business,
      industry: normalizeString(seed.industry),
    },
    funnel: {
      ...defaults.funnel,
      trafficDestination: normalizeString(seed.website),
    },
    internalNotes: {
      ...defaults.internalNotes,
      internalContextNotes: normalizeString(seed.notes),
    },
  };
}

function mergeStrategyProfile(
  base: StrategyProfileRecord,
  row: StrategyProfileRow | null | undefined,
): StrategyProfileRecord {
  if (!row) {
    return base;
  }

  return {
    ...base,
    id: normalizeString(row.id) || base.id,
    clientId: normalizeString(row.client_id) || base.clientId,
    clientName: normalizeString(row.client_name) || base.clientName,
    status: row.status ?? base.status,
    identity: {
      ...base.identity,
      ...(row.identity ?? {}),
    },
    business: {
      ...base.business,
      ...(row.business ?? {}),
    },
    offers: {
      ...base.offers,
      ...(row.offers ?? {}),
    },
    audience: {
      ...base.audience,
      ...(row.audience ?? {}),
    },
    funnel: {
      ...base.funnel,
      ...(row.funnel ?? {}),
    },
    marketing: {
      ...base.marketing,
      ...(row.marketing ?? {}),
    },
    performanceHistory: {
      ...base.performanceHistory,
      ...(row.performance_history ?? {}),
    },
    operations: {
      ...base.operations,
      ...(row.operations ?? {}),
    },
    compliance: {
      ...base.compliance,
      ...(row.compliance ?? {}),
    },
    internalNotes: {
      ...base.internalNotes,
      ...(row.internal_notes ?? {}),
    },
    connectedSourceSummary: row.connected_source_summary ?? base.connectedSourceSummary,
    completenessScore:
      typeof row.completeness_score === "number"
        ? row.completeness_score
        : base.completenessScore,
    missingImportantFields: row.missing_important_fields ?? base.missingImportantFields,
    recommendedMissingFields:
      row.recommended_missing_fields ?? base.recommendedMissingFields,
    updatedAt: row.updated_at ?? base.updatedAt,
  };
}

export function createClientMemoryForm(profile?: StrategyProfileRecord | null): ClientMemoryForm {
  return {
    approvalSpeed: normalizeString(profile?.internalNotes.approvalSpeed),
    bestCreativeFormats: joinList(profile?.performanceHistory.bestCreativeFormats),
    brandGuidelines: normalizeString(profile?.compliance.brandGuidelines),
    businessModel: normalizeString(profile?.business.businessModel),
    buyingTriggers: joinList(profile?.audience.buyingTriggers),
    communicationPreferences: normalizeString(profile?.internalNotes.communicationPreferences),
    crmUsed: normalizeString(profile?.funnel.crmUsed),
    differentiators: joinList(profile?.offers.differentiators),
    flagshipOffer: normalizeString(profile?.offers.flagshipOffer),
    followUpProcess: normalizeString(profile?.funnel.followUpProcess),
    idealCustomerProfile: normalizeString(profile?.audience.idealCustomerProfile),
    internalContextNotes: normalizeString(profile?.internalNotes.internalContextNotes),
    knownConstraints: joinList(profile?.funnel.knownConstraints),
    mainOffer: normalizeString(profile?.offers.mainOffer),
    objections: joinList(profile?.audience.objections),
    painPoints: joinList(profile?.audience.painPoints),
    pastLosingAngles: joinList(profile?.performanceHistory.pastLosingAngles),
    pastWinningAngles: joinList(profile?.performanceHistory.pastWinningAngles),
    previousStrategyNotes: normalizeString(profile?.performanceHistory.previousStrategyNotes),
    pricingModel: normalizeString(profile?.business.pricingModel),
    recurringBlockers: joinList(profile?.internalNotes.recurringBlockers),
    salesProcess: normalizeString(profile?.funnel.salesProcess),
    seasonalityNotes: normalizeString(profile?.business.seasonalityNotes),
    targetGeo: normalizeString(profile?.audience.targetGeo),
    toneOfVoice: normalizeString(profile?.compliance.toneOfVoice),
  };
}

export function createEmptyClientMemoryForm(): ClientMemoryForm {
  return createClientMemoryForm(createEmptyStrategyProfile());
}

function applyClientMemoryForm(
  profile: StrategyProfileRecord,
  memory: Partial<ClientMemoryForm>,
): StrategyProfileRecord {
  return {
    ...profile,
    offers: {
      ...profile.offers,
      mainOffer:
        memory.mainOffer !== undefined ? normalizeString(memory.mainOffer) : profile.offers.mainOffer,
      flagshipOffer:
        memory.flagshipOffer !== undefined
          ? normalizeString(memory.flagshipOffer)
          : profile.offers.flagshipOffer,
      differentiators:
        memory.differentiators !== undefined
          ? splitList(memory.differentiators)
          : profile.offers.differentiators,
    },
    business: {
      ...profile.business,
      businessModel:
        memory.businessModel !== undefined
          ? (normalizeString(memory.businessModel) as StrategyProfileRecord["business"]["businessModel"])
          : profile.business.businessModel,
      pricingModel:
        memory.pricingModel !== undefined
          ? normalizeString(memory.pricingModel)
          : profile.business.pricingModel,
      seasonalityNotes:
        memory.seasonalityNotes !== undefined
          ? normalizeString(memory.seasonalityNotes)
          : profile.business.seasonalityNotes,
    },
    audience: {
      ...profile.audience,
      idealCustomerProfile:
        memory.idealCustomerProfile !== undefined
          ? normalizeString(memory.idealCustomerProfile)
          : profile.audience.idealCustomerProfile,
      targetGeo:
        memory.targetGeo !== undefined
          ? normalizeString(memory.targetGeo)
          : profile.audience.targetGeo,
      objections:
        memory.objections !== undefined
          ? splitList(memory.objections)
          : profile.audience.objections,
      painPoints:
        memory.painPoints !== undefined
          ? splitList(memory.painPoints)
          : profile.audience.painPoints,
      buyingTriggers:
        memory.buyingTriggers !== undefined
          ? splitList(memory.buyingTriggers)
          : profile.audience.buyingTriggers,
    },
    funnel: {
      ...profile.funnel,
      salesProcess:
        memory.salesProcess !== undefined
          ? normalizeString(memory.salesProcess)
          : profile.funnel.salesProcess,
      followUpProcess:
        memory.followUpProcess !== undefined
          ? normalizeString(memory.followUpProcess)
          : profile.funnel.followUpProcess,
      crmUsed:
        memory.crmUsed !== undefined ? normalizeString(memory.crmUsed) : profile.funnel.crmUsed,
      knownConstraints:
        memory.knownConstraints !== undefined
          ? splitList(memory.knownConstraints)
          : profile.funnel.knownConstraints,
    },
    performanceHistory: {
      ...profile.performanceHistory,
      pastWinningAngles:
        memory.pastWinningAngles !== undefined
          ? splitList(memory.pastWinningAngles)
          : profile.performanceHistory.pastWinningAngles,
      pastLosingAngles:
        memory.pastLosingAngles !== undefined
          ? splitList(memory.pastLosingAngles)
          : profile.performanceHistory.pastLosingAngles,
      bestCreativeFormats:
        memory.bestCreativeFormats !== undefined
          ? splitList(memory.bestCreativeFormats)
          : profile.performanceHistory.bestCreativeFormats,
      previousStrategyNotes:
        memory.previousStrategyNotes !== undefined
          ? normalizeString(memory.previousStrategyNotes)
          : profile.performanceHistory.previousStrategyNotes,
    },
    compliance: {
      ...profile.compliance,
      toneOfVoice:
        memory.toneOfVoice !== undefined
          ? normalizeString(memory.toneOfVoice)
          : profile.compliance.toneOfVoice,
      brandGuidelines:
        memory.brandGuidelines !== undefined
          ? normalizeString(memory.brandGuidelines)
          : profile.compliance.brandGuidelines,
    },
    internalNotes: {
      ...profile.internalNotes,
      communicationPreferences:
        memory.communicationPreferences !== undefined
          ? normalizeString(memory.communicationPreferences)
          : profile.internalNotes.communicationPreferences,
      approvalSpeed:
        memory.approvalSpeed !== undefined
          ? normalizeString(memory.approvalSpeed)
          : profile.internalNotes.approvalSpeed,
      recurringBlockers:
        memory.recurringBlockers !== undefined
          ? splitList(memory.recurringBlockers)
          : profile.internalNotes.recurringBlockers,
      internalContextNotes:
        memory.internalContextNotes !== undefined
          ? normalizeString(memory.internalContextNotes)
          : profile.internalNotes.internalContextNotes,
    },
  };
}

export async function loadClientMemory(
  supabase: SupabaseClientLike,
  seed: ClientMemorySeed,
) {
  const seedProfile = createSeedProfile(seed);

  try {
    const { data, error } = await supabase
      .from("strategy_profiles")
      .select("*")
      .eq("client_id", seed.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const profile = mergeStrategyProfile(seedProfile, (data as StrategyProfileRow | null) ?? null);
    return {
      memory: createClientMemoryForm(profile),
      profile,
    };
  } catch {
    return {
      memory: createClientMemoryForm(seedProfile),
      profile: seedProfile,
    };
  }
}

export async function saveClientMemory(
  supabase: SupabaseClientLike,
  seed: ClientMemorySeed,
  memory: Partial<ClientMemoryForm>,
) {
  const current = await loadClientMemory(supabase, seed);
  const nextProfile = applyClientMemoryForm(
    {
      ...current.profile,
      clientId: seed.id,
      clientName: seed.name,
      identity: {
        ...current.profile.identity,
        brandName: seed.name,
        websiteUrl: normalizeString(seed.website) || current.profile.identity.websiteUrl,
      },
      business: {
        ...current.profile.business,
        industry: normalizeString(seed.industry) || current.profile.business.industry,
      },
      funnel: {
        ...current.profile.funnel,
        trafficDestination:
          normalizeString(seed.website) || current.profile.funnel.trafficDestination,
      },
    },
    memory,
  );

  const savedProfile = await saveStrategyProfile(supabase, nextProfile);

  return {
    memory: createClientMemoryForm(savedProfile),
    profile: savedProfile,
  };
}

function buildSection(title: string, lines: string[]) {
  const filtered = lines.map((line) => line.trim()).filter(Boolean);
  if (filtered.length === 0) {
    return "";
  }

  return `${title}:\n- ${filtered.join("\n- ")}`;
}

export function buildClientMemoryContextBlock(memory: ClientMemoryForm) {
  const sections = [
    buildSection("Positioning memory", [
      memory.mainOffer ? `Main offer: ${memory.mainOffer}` : "",
      memory.flagshipOffer ? `Flagship offer: ${memory.flagshipOffer}` : "",
      memory.businessModel ? `Business model: ${memory.businessModel}` : "",
      memory.pricingModel ? `Pricing model: ${memory.pricingModel}` : "",
      memory.differentiators ? `Differentiators:\n${memory.differentiators}` : "",
      memory.seasonalityNotes ? `Seasonality notes: ${memory.seasonalityNotes}` : "",
    ]),
    buildSection("Audience memory", [
      memory.idealCustomerProfile ? `Ideal customer profile: ${memory.idealCustomerProfile}` : "",
      memory.targetGeo ? `Target geo: ${memory.targetGeo}` : "",
      memory.objections ? `Objections:\n${memory.objections}` : "",
      memory.painPoints ? `Pain points:\n${memory.painPoints}` : "",
      memory.buyingTriggers ? `Buying triggers:\n${memory.buyingTriggers}` : "",
    ]),
    buildSection("Funnel and delivery memory", [
      memory.salesProcess ? `Sales process: ${memory.salesProcess}` : "",
      memory.followUpProcess ? `Follow-up process: ${memory.followUpProcess}` : "",
      memory.crmUsed ? `CRM used: ${memory.crmUsed}` : "",
      memory.knownConstraints ? `Known constraints:\n${memory.knownConstraints}` : "",
      memory.communicationPreferences
        ? `Communication preferences: ${memory.communicationPreferences}`
        : "",
      memory.approvalSpeed ? `Approval speed: ${memory.approvalSpeed}` : "",
      memory.recurringBlockers ? `Recurring blockers:\n${memory.recurringBlockers}` : "",
    ]),
    buildSection("Strategy memory", [
      memory.pastWinningAngles ? `Past winning angles:\n${memory.pastWinningAngles}` : "",
      memory.pastLosingAngles ? `Past losing angles:\n${memory.pastLosingAngles}` : "",
      memory.bestCreativeFormats ? `Best creative formats:\n${memory.bestCreativeFormats}` : "",
      memory.previousStrategyNotes
        ? `Previous strategy notes: ${memory.previousStrategyNotes}`
        : "",
      memory.internalContextNotes ? `Internal context notes: ${memory.internalContextNotes}` : "",
      memory.toneOfVoice ? `Tone of voice: ${memory.toneOfVoice}` : "",
      memory.brandGuidelines ? `Brand guidelines: ${memory.brandGuidelines}` : "",
    ]),
  ]
    .map((section) => section.trim())
    .filter(Boolean);

  return sections.join("\n\n");
}

export function hasClientMemory(memory: ClientMemoryForm) {
  return Object.values(memory).some((value) => normalizeString(value).length > 0);
}
