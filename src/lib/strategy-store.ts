import {
  createEmptyStrategyProfile,
  createEmptyStrategyRequest,
  type SourceFreshnessStatus,
  type StrategyEngineOutput,
  type StrategyHistoryRecord,
  type StrategyOutputMode,
  type StrategyProfileRecord,
  type StrategyRequestRecord,
  type StrategySeedClient,
  type StrategySourceContextRecord,
} from "@/lib/strategy-schema";

type SupabaseClientLike = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string | null } | null };
      error: { message: string } | null;
    }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export type StrategyUserContext = {
  canAdmin: boolean;
  canWrite: boolean;
  email: string;
  role: string | null;
  userId: string;
};

function getApiBase() {
  const explicitBase =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (normalizeString(explicitBase)) {
    return normalizeString(explicitBase).replace(/\/$/, "");
  }

  const port = normalizeString(process.env.PORT) || "3000";
  return `http://127.0.0.1:${port}`;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter(Boolean);
  }

  return [];
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingTableError(error: unknown) {
  if (!error) {
    return false;
  }

  const code =
    isObjectLike(error) && typeof error.code === "string"
      ? error.code.trim()
      : "";
  const message =
    error instanceof Error
      ? error.message
      : isObjectLike(error) && typeof error.message === "string"
        ? error.message.trim()
        : "";

  return (
    code === "PGRST205" ||
    message.includes("Could not find the table") ||
    message.includes("schema cache")
  );
}

function isMissingColumnError(
  error: unknown,
  input: {
    column: string;
    table?: string;
  },
) {
  if (!error) {
    return false;
  }

  const code =
    isObjectLike(error) && typeof error.code === "string"
      ? error.code.trim()
      : "";
  const message =
    error instanceof Error
      ? error.message
      : isObjectLike(error) && typeof error.message === "string"
        ? error.message.trim()
        : "";
  const normalizedColumn = input.column.trim().toLowerCase();
  const normalizedTable = input.table?.trim().toLowerCase();

  return (
    code === "42703" ||
    message.toLowerCase().includes(`column ${normalizedColumn}`) ||
    (normalizedTable
      ? message.toLowerCase().includes(`column ${normalizedTable}.${normalizedColumn}`)
      : false) ||
    message.toLowerCase().includes(`'${normalizedColumn}' column`) ||
    message.toLowerCase().includes(`does not exist`)
  );
}

type LegacyStrategyState = {
  history: StrategyHistoryRecord[];
  profile: StrategyProfileRecord | null;
  request: StrategyRequestRecord | null;
  sourceContext: StrategySourceContextRecord[];
};

type UnknownRecord = Record<string, unknown>;

function extractEntryText(entry: Record<string, unknown>) {
  return [
    normalizeString(entry.content),
    normalizeString(entry.note),
    normalizeString(entry.text),
    normalizeString(entry.title),
  ].find(Boolean) ?? "";
}

function buildSourceFreshnessStatus(
  sourceType: StrategySourceContextRecord["sourceType"],
  client: StrategySeedClient,
): SourceFreshnessStatus {
  if (sourceType === "website") {
    return client.website ? "unknown" : "missing";
  }

  if (sourceType === "manual") {
    const hasManualContext =
      normalizeString(client.notes).length > 0 ||
      (client.client_notes?.length ?? 0) > 0 ||
      (client.client_activity?.length ?? 0) > 0;

    return hasManualContext ? "days_1_2" : "missing";
  }

  return "unknown";
}

export function computeProfileCompleteness(profile: StrategyProfileRecord) {
  const requiredFields = [
    { label: "Brand name", value: profile.identity.brandName },
    { label: "Website", value: profile.identity.websiteUrl },
    { label: "Region", value: profile.identity.region },
    { label: "Industry", value: profile.business.industry },
    { label: "Business model", value: profile.business.businessModel },
    { label: "Main offer", value: profile.offers.mainOffer },
    { label: "Target geo", value: profile.audience.targetGeo },
    { label: "Funnel type", value: profile.funnel.funnelType },
    { label: "Conversion event", value: profile.funnel.conversionEvent },
    { label: "Acquisition channels", value: profile.marketing.acquisitionChannels },
  ];

  const recommendedFields = [
    { label: "Average ticket", value: profile.business.averageTicket },
    { label: "Average order value", value: profile.business.averageOrderValue },
    { label: "Estimated margin range", value: profile.business.estimatedMarginRange },
    { label: "Primary objections", value: profile.audience.objections },
    { label: "Sales process", value: profile.funnel.salesProcess },
    { label: "Follow-up process", value: profile.funnel.followUpProcess },
    { label: "Sales capacity", value: profile.operations.salesCapacity },
    { label: "Inventory or service constraints", value: profile.operations.inventoryConstraints || profile.operations.serviceabilityConstraints },
  ];

  const hasValue = (value: unknown) => {
    if (Array.isArray(value)) return value.length > 0;
    return normalizeString(value).length > 0;
  };

  const completeRequired = requiredFields.filter((item) => hasValue(item.value)).length;
  const completeRecommended = recommendedFields.filter((item) => hasValue(item.value)).length;
  const score = Math.round(
    (completeRequired / requiredFields.length) * 75 +
      (completeRecommended / recommendedFields.length) * 25,
  );

  return {
    completenessScore: score,
    missingImportantFields: requiredFields
      .filter((item) => !hasValue(item.value))
      .map((item) => item.label),
    recommendedMissingFields: recommendedFields
      .filter((item) => !hasValue(item.value))
      .map((item) => item.label),
  };
}

export function buildSeedProfile(client: StrategySeedClient) {
  const meta = client.meta_data ?? {};
  const recentNotes = normalizeString(client.notes);
  const profile = createEmptyStrategyProfile({
    clientId: client.id,
    clientName: client.name,
    identity: {
      brandName: client.name,
      websiteUrl: normalizeString(client.website),
      primaryContact: "",
      accountManager: "",
      language: "fr",
      region: "",
    },
    business: {
      industry: normalizeString(client.industry),
      subIndustry: "",
      niche: "",
      businessModel: "",
      offerType: "",
      pricingModel: "",
      averageTicket: client.monthly_budget ? String(client.monthly_budget) : "",
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
      differentiators: normalizeList((meta as Record<string, unknown>).wins),
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
      trafficDestination: normalizeString(client.website),
      conversionEvent: "",
      salesProcess: "",
      bookingProcess: "",
      followUpProcess: "",
      crmUsed: "",
      averageSalesCycle: "",
      knownConstraints: normalizeList((meta as Record<string, unknown>).flags),
    },
    marketing: {
      acquisitionChannels: [
        (meta as Record<string, unknown>).spend ? "Meta Ads" : "",
        client.asana_project_id ? "Asana" : "",
        client.slack_channel_id ? "Slack" : "",
        client.google_drive_folder_id ? "Drive" : "",
      ].filter(Boolean),
      metaActive: Boolean((meta as Record<string, unknown>).spend),
      googleActive: false,
      emailActive: false,
      smsActive: false,
      organicActive: false,
      retargetingStatus: "",
      creativeVolumeCapacity: "",
    },
    performanceHistory: {
      pastWinningAngles: normalizeList((meta as Record<string, unknown>).wins),
      pastLosingAngles: normalizeList((meta as Record<string, unknown>).flags),
      bestCreativeFormats: [],
      bestOffersTested: [],
      previousStrategyNotes: recentNotes,
      historicalConstraints: normalizeList((meta as Record<string, unknown>).flags),
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
      clientRiskNotes: normalizeList((meta as Record<string, unknown>).flags).join(", "),
      communicationPreferences: "",
      approvalSpeed: "",
      recurringBlockers: normalizeList((meta as Record<string, unknown>).flags),
      internalContextNotes: [
        recentNotes,
        ...(client.client_notes ?? []).map((entry) => extractEntryText(entry)).filter(Boolean).slice(0, 3),
      ]
        .filter(Boolean)
        .join("\n"),
    },
  });

  return {
    ...profile,
    ...computeProfileCompleteness(profile),
  };
}

function mapSourceLabel(sourceType: StrategySourceContextRecord["sourceType"]) {
  const labels: Record<StrategySourceContextRecord["sourceType"], string> = {
    meta_ads: "Meta Ads",
    google_ads: "Google Ads",
    sheets: "Google Sheets",
    slack: "Slack",
    asana: "Asana",
    drive: "Drive",
    crm: "CRM / GHL",
    website: "Website",
    manual: "Notes internes",
  };

  return labels[sourceType];
}

export function buildSeedSourceContext(client: StrategySeedClient) {
  const meta = client.meta_data ?? {};
  const rows: StrategySourceContextRecord[] = [
    {
      sourceType: "meta_ads",
      sourceLabel: mapSourceLabel("meta_ads"),
      isConnected: Boolean((meta as Record<string, unknown>).spend || (meta as Record<string, unknown>).campaigns),
      freshnessStatus: "unknown",
      lastSyncedAt: null,
      confidenceScore: (meta as Record<string, unknown>).spend ? 0.58 : 0,
      isEstimated: true,
      warnings: (meta as Record<string, unknown>).spend ? ["Les donnees Meta ne portent pas encore de fraicheur confirmee."] : ["Source Meta non connectee ou non confirmee."],
      snapshot: {
        spend: (meta as Record<string, unknown>).spend ?? null,
        leads: (meta as Record<string, unknown>).leads ?? null,
        cpl: (meta as Record<string, unknown>).cpl ?? null,
        roas: (meta as Record<string, unknown>).roas ?? null,
        revenue: (meta as Record<string, unknown>).revenue ?? null,
      },
    },
    {
      sourceType: "asana",
      sourceLabel: mapSourceLabel("asana"),
      isConnected: Boolean(client.asana_project_id),
      freshnessStatus: client.asana_project_id ? "unknown" : "missing",
      lastSyncedAt: null,
      confidenceScore: client.asana_project_id ? 0.42 : 0,
      isEstimated: true,
      warnings: client.asana_project_id ? [] : ["Projet Asana non connecte."],
      snapshot: { project_id: normalizeString(client.asana_project_id) },
    },
    {
      sourceType: "slack",
      sourceLabel: mapSourceLabel("slack"),
      isConnected: Boolean(client.slack_channel_id),
      freshnessStatus: client.slack_channel_id ? "unknown" : "missing",
      lastSyncedAt: null,
      confidenceScore: client.slack_channel_id ? 0.38 : 0,
      isEstimated: true,
      warnings: client.slack_channel_id ? [] : ["Canal Slack non connecte."],
      snapshot: { channel_id: normalizeString(client.slack_channel_id) },
    },
    {
      sourceType: "drive",
      sourceLabel: mapSourceLabel("drive"),
      isConnected: Boolean(client.google_drive_folder_id),
      freshnessStatus: client.google_drive_folder_id ? "unknown" : "missing",
      lastSyncedAt: null,
      confidenceScore: client.google_drive_folder_id ? 0.36 : 0,
      isEstimated: true,
      warnings: client.google_drive_folder_id ? [] : ["Drive non connecte."],
      snapshot: { folder_id: normalizeString(client.google_drive_folder_id) },
    },
    {
      sourceType: "website",
      sourceLabel: mapSourceLabel("website"),
      isConnected: Boolean(client.website),
      freshnessStatus: buildSourceFreshnessStatus("website", client),
      lastSyncedAt: null,
      confidenceScore: client.website ? 0.48 : 0,
      isEstimated: true,
      warnings: client.website ? [] : ["URL du site manquante."],
      snapshot: { url: normalizeString(client.website) },
    },
    {
      sourceType: "manual",
      sourceLabel: mapSourceLabel("manual"),
      isConnected:
        normalizeString(client.notes).length > 0 ||
        (client.client_notes?.length ?? 0) > 0 ||
        (client.client_activity?.length ?? 0) > 0,
      freshnessStatus: buildSourceFreshnessStatus("manual", client),
      lastSyncedAt: null,
      confidenceScore:
        normalizeString(client.notes).length > 0 || (client.client_notes?.length ?? 0) > 0
          ? 0.62
          : 0.22,
      isEstimated: false,
      warnings:
        normalizeString(client.notes).length > 0 || (client.client_notes?.length ?? 0) > 0
          ? []
          : ["Le contexte manuel interne reste faible."],
      snapshot: {
        note_count: client.client_notes?.length ?? 0,
        activity_count: client.client_activity?.length ?? 0,
      },
    },
  ];

  return rows;
}

function buildProfileFallbackSourceContext(
  profile: StrategyProfileRecord,
): StrategySourceContextRecord[] {
  return [
    {
      sourceType: "meta_ads",
      sourceLabel: mapSourceLabel("meta_ads"),
      isConnected: profile.marketing.metaActive,
      freshnessStatus: profile.marketing.metaActive ? "unknown" : "missing",
      lastSyncedAt: null,
      confidenceScore: profile.marketing.metaActive ? 0.38 : 0,
      isEstimated: true,
      warnings: profile.marketing.metaActive ? [] : ["Source Meta non connectee ou non confirmee."],
      snapshot: {},
    },
    {
      sourceType: "website",
      sourceLabel: mapSourceLabel("website"),
      isConnected: normalizeString(profile.identity.websiteUrl).length > 0,
      freshnessStatus:
        normalizeString(profile.identity.websiteUrl).length > 0 ? "unknown" : "missing",
      lastSyncedAt: null,
      confidenceScore: normalizeString(profile.identity.websiteUrl).length > 0 ? 0.42 : 0,
      isEstimated: true,
      warnings:
        normalizeString(profile.identity.websiteUrl).length > 0
          ? []
          : ["URL du site manquante."],
      snapshot: { url: profile.identity.websiteUrl },
    },
    {
      sourceType: "manual",
      sourceLabel: mapSourceLabel("manual"),
      isConnected:
        normalizeString(profile.internalNotes.internalContextNotes).length > 0 ||
        profile.internalNotes.recurringBlockers.length > 0,
      freshnessStatus:
        normalizeString(profile.internalNotes.internalContextNotes).length > 0
          ? "days_1_2"
          : "missing",
      lastSyncedAt: null,
      confidenceScore:
        normalizeString(profile.internalNotes.internalContextNotes).length > 0 ? 0.58 : 0.2,
      isEstimated: false,
      warnings:
        normalizeString(profile.internalNotes.internalContextNotes).length > 0
          ? []
          : ["Le contexte manuel interne reste faible."],
      snapshot: {},
    },
  ];
}

function applyProfileSourceContextOverrides(
  seeded: StrategySourceContextRecord[],
  profile: StrategyProfileRecord,
) {
  const overridesByType = new Map(
    buildProfileFallbackSourceContext(profile).map((source) => [source.sourceType, source]),
  );

  const merged = seeded.map((seed) => {
    const override = overridesByType.get(seed.sourceType);
    if (!override) {
      return seed;
    }

    return {
      ...seed,
      ...override,
      sourceLabel: override.sourceLabel || seed.sourceLabel,
      warnings: Array.from(new Set([...seed.warnings, ...override.warnings])),
      snapshot: {
        ...seed.snapshot,
        ...override.snapshot,
      },
    };
  });

  const extraOverrides = Array.from(overridesByType.values()).filter(
    (source) => !seeded.some((seed) => seed.sourceType === source.sourceType),
  );

  return [...merged, ...extraOverrides];
}

function hasSnapshotData(snapshot: Record<string, unknown>) {
  return Object.values(snapshot).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (value && typeof value === "object") {
      return Object.keys(value as Record<string, unknown>).length > 0;
    }

    return value !== null && value !== undefined && normalizeString(value).length > 0;
  });
}

function freshnessStatusRank(status: SourceFreshnessStatus) {
  const rankings: Record<SourceFreshnessStatus, number> = {
    today: 5,
    days_1_2: 4,
    stale: 3,
    unknown: 2,
    missing: 1,
  };

  return rankings[status];
}

function pickFreshnessStatus(
  seeded: StrategySourceContextRecord,
  persisted: StrategySourceContextRecord,
  isConnected: boolean,
): SourceFreshnessStatus {
  if (!isConnected) {
    return "missing";
  }

  if (
    persisted.lastSyncedAt ||
    freshnessStatusRank(persisted.freshnessStatus) >= freshnessStatusRank(seeded.freshnessStatus)
  ) {
    return persisted.freshnessStatus;
  }

  return seeded.freshnessStatus;
}

function mergeSeedAndPersistedSourceContext(
  seeded: StrategySourceContextRecord[],
  persisted: StrategySourceContextRecord[],
) {
  const persistedByType = new Map(
    persisted.map((source) => [source.sourceType, source]),
  );

  const mergedSeeded = seeded.map((seed) => {
    const stored = persistedByType.get(seed.sourceType);
    if (!stored) {
      return seed;
    }

    const hasConfirmedStoredData =
      Boolean(stored.lastSyncedAt) ||
      (!stored.isEstimated && hasSnapshotData(stored.snapshot));
    const isConnected = hasConfirmedStoredData
      ? seed.isConnected || stored.isConnected
      : seed.isConnected;
    const snapshot = hasConfirmedStoredData && hasSnapshotData(stored.snapshot)
      ? {
          ...seed.snapshot,
          ...stored.snapshot,
        }
      : seed.snapshot;

    return {
      ...seed,
      ...stored,
      sourceLabel: stored.sourceLabel || seed.sourceLabel,
      isConnected,
      freshnessStatus: hasConfirmedStoredData
        ? pickFreshnessStatus(seed, stored, isConnected)
        : seed.freshnessStatus,
      confidenceScore: hasConfirmedStoredData
        ? Math.max(seed.confidenceScore, stored.confidenceScore)
        : seed.confidenceScore,
      isEstimated: hasConfirmedStoredData ? stored.isEstimated : seed.isEstimated,
      lastSyncedAt: hasConfirmedStoredData ? stored.lastSyncedAt ?? seed.lastSyncedAt : seed.lastSyncedAt,
      warnings: Array.from(new Set([...seed.warnings, ...stored.warnings])),
      snapshot,
    };
  });

  const extraPersisted = persisted.filter(
    (source) => !seeded.some((seed) => seed.sourceType === source.sourceType),
  );

  return [...mergedSeeded, ...extraPersisted];
}

export function buildRetrievedContextSnapshot(
  client: StrategySeedClient,
  sourceContext: StrategySourceContextRecord[],
  profile?: StrategyProfileRecord | null,
) {
  const meta = client.meta_data ?? {};
  const metaSource = sourceContext.find((source) => source.sourceType === "meta_ads");
  const websiteSource = sourceContext.find((source) => source.sourceType === "website");

  return {
    budget:
      client.monthly_budget ??
      client.retainer_monthly ??
      null,
    website:
      normalizeString(websiteSource?.snapshot.url) ||
      normalizeString(profile?.identity.websiteUrl) ||
      normalizeString(client.website),
    spend: metaSource?.snapshot.spend ?? (meta as Record<string, unknown>).spend ?? null,
    leads: metaSource?.snapshot.leads ?? (meta as Record<string, unknown>).leads ?? null,
    cpl: metaSource?.snapshot.cpl ?? (meta as Record<string, unknown>).cpl ?? null,
    roas: metaSource?.snapshot.roas ?? (meta as Record<string, unknown>).roas ?? null,
    revenue: metaSource?.snapshot.revenue ?? (meta as Record<string, unknown>).revenue ?? null,
    connectedSources: sourceContext.filter((source) => source.isConnected).map((source) => source.sourceLabel),
    freshness: sourceContext.reduce<Record<string, string>>((accumulator, source) => {
      accumulator[source.sourceType] = source.freshnessStatus;
      return accumulator;
    }, {}),
  };
}

export async function requireStrategyUser(
  supabase: SupabaseClientLike,
): Promise<StrategyUserContext | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  const normalizedEmail = normalizeString(user.email).toLowerCase();
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  const role = normalizeString(roleData?.role) || null;

  return {
    canAdmin: role === "admin" || role === "super_admin",
    canWrite: role === "super_admin" || role === "admin" || role === "manager",
    email: normalizedEmail,
    role,
    userId: user.id,
  };
}

async function fetchSeedClient(input: {
  clientId?: string | null;
  clientName?: string | null;
}): Promise<StrategySeedClient | null> {
  if (!input.clientId && !input.clientName) {
    return null;
  }

  const base = getApiBase();
  const clientById = input.clientId
    ? await fetch(`${base}/api/client-hub/clients/${encodeURIComponent(input.clientId)}`, {
        cache: "no-store",
      }).catch(() => null)
    : null;

  if (clientById?.ok) {
    const data = (await clientById.json()) as StrategySeedClient;
    return data?.id ? data : null;
  }

  const listResponse = await fetch(`${base}/api/client-hub/clients?show_hidden=true`, {
    cache: "no-store",
  }).catch(() => null);

  if (!listResponse?.ok) {
    return null;
  }

  const data = (await listResponse.json()) as StrategySeedClient[];
  const normalizedName = normalizeString(input.clientName);
  return (
    data.find((client) => client.id === input.clientId) ??
    data.find((client) => normalizeString(client.name) === normalizedName) ??
    null
  );
}

export async function loadFreshSourceContext(input: {
  clientId?: string | null;
  clientName?: string | null;
  profile?: StrategyProfileRecord | null;
}) {
  const client = await fetchSeedClient(input);
  if (client) {
    const seeded = buildSeedSourceContext(client);
    return input.profile ? applyProfileSourceContextOverrides(seeded, input.profile) : seeded;
  }

  if (input.profile) {
    return buildProfileFallbackSourceContext(input.profile);
  }

  return [] as StrategySourceContextRecord[];
}

export async function loadRetrievedContextSnapshot(input: {
  clientId?: string | null;
  clientName?: string | null;
  profile?: StrategyProfileRecord | null;
  sourceContext: StrategySourceContextRecord[];
}) {
  const client = await fetchSeedClient(input);
  if (client) {
    return buildRetrievedContextSnapshot(client, input.sourceContext, input.profile);
  }

  return {
    budget: null,
    website: normalizeString(input.profile?.identity.websiteUrl),
    spend: null,
    leads: null,
    cpl: null,
    roas: null,
    revenue: null,
    connectedSources: input.sourceContext
      .filter((source) => source.isConnected)
      .map((source) => source.sourceLabel),
    freshness: input.sourceContext.reduce<Record<string, string>>((accumulator, source) => {
      accumulator[source.sourceType] = source.freshnessStatus;
      return accumulator;
    }, {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeProfileSections(row: Record<string, any>): StrategyProfileRecord {
  const defaults = createEmptyStrategyProfile();

  return {
    ...defaults,
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    status: row.status,
    identity: {
      ...defaults.identity,
      ...(row.identity ?? {}),
    },
    business: {
      ...defaults.business,
      ...(row.business ?? {}),
    },
    offers: {
      ...defaults.offers,
      ...(row.offers ?? {}),
    },
    audience: {
      ...defaults.audience,
      ...(row.audience ?? {}),
    },
    funnel: {
      ...defaults.funnel,
      ...(row.funnel ?? {}),
    },
    marketing: {
      ...defaults.marketing,
      ...(row.marketing ?? {}),
    },
    performanceHistory: {
      ...defaults.performanceHistory,
      ...(row.performance_history ?? {}),
    },
    operations: {
      ...defaults.operations,
      ...(row.operations ?? {}),
    },
    compliance: {
      ...defaults.compliance,
      ...(row.compliance ?? {}),
    },
    internalNotes: {
      ...defaults.internalNotes,
      ...(row.internal_notes ?? {}),
    },
    connectedSourceSummary: row.connected_source_summary ?? defaults.connectedSourceSummary,
    completenessScore: row.completeness_score ?? defaults.completenessScore,
    missingImportantFields: row.missing_important_fields ?? defaults.missingImportantFields,
    recommendedMissingFields:
      row.recommended_missing_fields ?? defaults.recommendedMissingFields,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeRequestSections(row: Record<string, any>): StrategyRequestRecord {
  const defaults = createEmptyStrategyRequest();

  return {
    ...defaults,
    id: row.id,
    profileId: row.profile_id,
    clientId: row.client_id,
    status: row.status,
    objective: row.objective ?? defaults.objective,
    stage: row.stage ?? defaults.stage,
    timeHorizon: row.time_horizon ?? defaults.timeHorizon,
    priorityKpi: row.priority_kpi ?? defaults.priorityKpi,
    mainProblem: row.main_problem ?? defaults.mainProblem,
    severity: row.severity ?? defaults.severity,
    startedAtHint: row.started_at_hint ?? defaults.startedAtHint,
    recentChanges: row.recent_changes ?? defaults.recentChanges,
    testedContext: {
      ...defaults.testedContext,
      ...(row.tested_context ?? {}),
    },
    constraints: {
      ...defaults.constraints,
      ...(row.constraints ?? {}),
    },
    requestedOutputs: row.requested_outputs ?? defaults.requestedOutputs,
    manualNotes: row.manual_notes ?? defaults.manualNotes,
    missingQuestions: row.missing_questions ?? defaults.missingQuestions,
    answeredMissingContext:
      row.answered_missing_context ?? defaults.answeredMissingContext,
    retrievedContextSnapshot:
      row.retrieved_context_snapshot ?? defaults.retrievedContextSnapshot,
    dataConfidence: row.data_confidence ?? defaults.dataConfidence,
    generatedAt: row.generated_at ?? defaults.generatedAt,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfileRow(row: Record<string, any>): StrategyProfileRecord {
  return mergeProfileSections(row);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRequestRow(row: Record<string, any>): StrategyRequestRecord {
  return mergeRequestSections(row);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSourceRow(row: Record<string, any>): StrategySourceContextRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    requestId: row.request_id,
    sourceType: row.source_type,
    sourceLabel: row.source_label ?? mapSourceLabel(row.source_type),
    isConnected: Boolean(row.is_connected),
    freshnessStatus: row.freshness_status ?? "unknown",
    lastSyncedAt: row.last_synced_at ?? null,
    confidenceScore: Number(row.confidence_score ?? 0),
    isEstimated: Boolean(row.is_estimated),
    warnings: row.warnings ?? [],
    snapshot: row.snapshot ?? {},
  };
}

function prioritizeSourceRows(
  rows: StrategySourceContextRecord[],
  requestId?: string,
) {
  return Array.from(
    rows.reduce<Map<string, StrategySourceContextRecord>>((accumulator, source) => {
      const current = accumulator.get(source.sourceType);
      const getWeight = (value?: string) => {
        if (requestId) {
          return value === requestId ? 3 : value ? 1 : 2;
        }

        return value ? 1 : 2;
      };
      const currentWeight = getWeight(current?.requestId);
      const nextWeight = getWeight(source.requestId);

      if (
        !current ||
        nextWeight > currentWeight ||
        (nextWeight === currentWeight &&
          (source.lastSyncedAt ?? "") > (current.lastSyncedAt ?? ""))
      ) {
        accumulator.set(source.sourceType, source);
      }

      return accumulator;
    }, new Map()).values(),
  );
}

async function loadPersistedSourceContext(
  supabase: SupabaseClientLike,
  profileId: string,
  requestId?: string,
) {
  try {
    const { data, error } = await supabase
      .from("strategy_source_context")
      .select("*")
      .eq("profile_id", profileId);

    if (error) {
      throw error;
    }

    const rows = Array.isArray(data) ? data.map(mapSourceRow) : [];
    return prioritizeSourceRows(rows, requestId);
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw new Error(error instanceof Error ? error.message : "Impossible de charger les sources.");
    }

    return [] as StrategySourceContextRecord[];
  }
}

export async function loadEffectiveSourceContext(
  supabase: SupabaseClientLike,
  input: {
    profileId?: string;
    requestId?: string;
    clientId?: string | null;
    clientName?: string | null;
    profile?: StrategyProfileRecord | null;
  },
) {
  const freshSourceContext = await loadFreshSourceContext(input);
  if (!input.profileId) {
    return freshSourceContext;
  }

  try {
    const persistedSourceContext = await loadPersistedSourceContext(
      supabase,
      input.profileId,
      input.requestId,
    );

    if (persistedSourceContext.length > 0) {
      return mergeSeedAndPersistedSourceContext(freshSourceContext, persistedSourceContext);
    }

    const clientId = normalizeString(input.clientId ?? input.profile?.clientId);
    const clientName = normalizeString(input.clientName ?? input.profile?.clientName);

    if (!clientId) {
      return freshSourceContext;
    }

    const legacyRow = await loadLegacyDraftRow(supabase, {
      clientId,
    });
    const legacyState = extractLegacyStrategyState(legacyRow, {
      clientId,
      clientName,
    });

    return legacyState.sourceContext.length > 0
      ? mergeSeedAndPersistedSourceContext(freshSourceContext, legacyState.sourceContext)
      : freshSourceContext;
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }

    return freshSourceContext;
  }
}

function summarizeSourceContext(sourceContext: StrategySourceContextRecord[]) {
  const connected = sourceContext.filter((source) => source.isConnected);
  return {
    connectedCount: connected.length,
    connectedSources: connected.map((source) => source.sourceType),
    missingCount: sourceContext.filter((source) => !source.isConnected).length,
    averageConfidence:
      sourceContext.length > 0
        ? Number(
            (
              sourceContext.reduce((sum, source) => sum + source.confidenceScore, 0) /
              sourceContext.length
            ).toFixed(2),
          )
      : 0,
  };
}

function mergeStrategyHistoryRecords(history: StrategyHistoryRecord[]) {
  return history
    .reduce<StrategyHistoryRecord[]>((accumulator, entry) => {
      if (!entry?.id || accumulator.some((current) => current.id === entry.id)) {
        return accumulator;
      }

      accumulator.push(entry);
      return accumulator;
    }, [])
    .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
    .slice(0, 10);
}

function mergeLegacyProfileState(
  current: Partial<StrategyProfileRecord> | null | undefined,
  next: Partial<StrategyProfileRecord> | null | undefined,
  input: {
    clientId: string;
    clientName: string;
    id?: string;
  },
) {
  const defaults = createEmptyStrategyProfile({
    clientId: input.clientId,
    clientName: input.clientName,
  });

  return {
    ...defaults,
    ...current,
    ...next,
    id: normalizeString(next?.id) || normalizeString(current?.id) || input.id,
    clientId: input.clientId,
    clientName: input.clientName,
    identity: {
      ...defaults.identity,
      ...(current?.identity ?? {}),
      ...(next?.identity ?? {}),
    },
    business: {
      ...defaults.business,
      ...(current?.business ?? {}),
      ...(next?.business ?? {}),
    },
    offers: {
      ...defaults.offers,
      ...(current?.offers ?? {}),
      ...(next?.offers ?? {}),
    },
    audience: {
      ...defaults.audience,
      ...(current?.audience ?? {}),
      ...(next?.audience ?? {}),
    },
    funnel: {
      ...defaults.funnel,
      ...(current?.funnel ?? {}),
      ...(next?.funnel ?? {}),
    },
    marketing: {
      ...defaults.marketing,
      ...(current?.marketing ?? {}),
      ...(next?.marketing ?? {}),
    },
    performanceHistory: {
      ...defaults.performanceHistory,
      ...(current?.performanceHistory ?? {}),
      ...(next?.performanceHistory ?? {}),
    },
    operations: {
      ...defaults.operations,
      ...(current?.operations ?? {}),
      ...(next?.operations ?? {}),
    },
    compliance: {
      ...defaults.compliance,
      ...(current?.compliance ?? {}),
      ...(next?.compliance ?? {}),
    },
    internalNotes: {
      ...defaults.internalNotes,
      ...(current?.internalNotes ?? {}),
      ...(next?.internalNotes ?? {}),
    },
    connectedSourceSummary:
      next?.connectedSourceSummary ?? current?.connectedSourceSummary ?? defaults.connectedSourceSummary,
    completenessScore: Number(
      next?.completenessScore ?? current?.completenessScore ?? defaults.completenessScore,
    ),
    missingImportantFields:
      next?.missingImportantFields ?? current?.missingImportantFields ?? defaults.missingImportantFields,
    recommendedMissingFields:
      next?.recommendedMissingFields ??
      current?.recommendedMissingFields ??
      defaults.recommendedMissingFields,
    updatedAt:
      normalizeString(next?.updatedAt) || normalizeString(current?.updatedAt) || undefined,
  } satisfies StrategyProfileRecord;
}

function mergeLegacyRequestState(
  current: Partial<StrategyRequestRecord> | null | undefined,
  next: Partial<StrategyRequestRecord> | null | undefined,
  input: {
    clientId: string;
    profileId?: string;
    requestId?: string;
  },
) {
  const defaults = createEmptyStrategyRequest({
    clientId: input.clientId,
    profileId: input.profileId,
  });
  const merged = {
    ...defaults,
    ...current,
    ...next,
    id: normalizeString(next?.id) || normalizeString(current?.id) || input.requestId,
    profileId: input.profileId ?? next?.profileId ?? current?.profileId,
    clientId: input.clientId,
    testedContext: {
      ...defaults.testedContext,
      ...(current?.testedContext ?? {}),
      ...(next?.testedContext ?? {}),
    },
    constraints: {
      ...defaults.constraints,
      ...(current?.constraints ?? {}),
      ...(next?.constraints ?? {}),
    },
    answeredMissingContext: {
      ...defaults.answeredMissingContext,
      ...(current?.answeredMissingContext ?? {}),
      ...(next?.answeredMissingContext ?? {}),
    },
    retrievedContextSnapshot:
      next?.retrievedContextSnapshot ??
      current?.retrievedContextSnapshot ??
      defaults.retrievedContextSnapshot,
    dataConfidence: next?.dataConfidence ?? current?.dataConfidence ?? defaults.dataConfidence,
    requestedOutputs: next?.requestedOutputs ?? current?.requestedOutputs ?? defaults.requestedOutputs,
  } satisfies StrategyRequestRecord;

  if (!merged.id) {
    merged.id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}`;
  }

  return merged;
}

function normalizeLegacySourceContext(
  sourceContext: StrategySourceContextRecord[] | null | undefined,
  input: {
    profileId?: string;
    requestId?: string;
  },
) {
  if (!Array.isArray(sourceContext)) {
    return [] as StrategySourceContextRecord[];
  }

  return sourceContext
    .filter((source) => Boolean(source?.sourceType))
    .map((source) => ({
      ...source,
      profileId: input.profileId ?? source.profileId,
      requestId: input.requestId ?? source.requestId,
      sourceLabel: normalizeString(source.sourceLabel) || mapSourceLabel(source.sourceType),
      warnings: Array.isArray(source.warnings) ? source.warnings : [],
      snapshot: isObjectLike(source.snapshot) ? source.snapshot : {},
    }));
}

async function resolveLegacyOwnerUserId(
  supabase: SupabaseClientLike,
  ownerUserId?: string | null,
) {
  if (normalizeString(ownerUserId)) {
    return normalizeString(ownerUserId);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return normalizeString(user?.id);
}

async function loadLegacyDraftRow(
  supabase: SupabaseClientLike,
  input: {
    clientId: string;
    ownerUserId?: string | null;
  },
) {
  const ownerUserId = await resolveLegacyOwnerUserId(supabase, input.ownerUserId);
  const runQuery = async (filterByOwner: boolean) => {
    let query = supabase
      .from("strategy_drafts")
      .select("*")
      .eq("client_id", input.clientId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (filterByOwner && ownerUserId) {
      query = query.eq("owner_user_id", ownerUserId);
    }

    return query;
  };

  let result = await runQuery(Boolean(ownerUserId));

  if (
    result.error &&
    ownerUserId &&
    isMissingColumnError(result.error, {
      column: "owner_user_id",
      table: "strategy_drafts",
    })
  ) {
    result = await runQuery(false);
  }

  if (result.error) {
    throw new Error(result.error.message);
  }

  return Array.isArray(result.data) && result.data.length > 0 && isObjectLike(result.data[0])
    ? (result.data[0] as UnknownRecord)
    : null;
}

function extractLegacyStrategyState(
  row: UnknownRecord | null,
  input: {
    clientId: string;
    clientName: string;
  },
): LegacyStrategyState {
  const draft = isObjectLike(row?.draft) ? row.draft : {};
  const strategyEngine = isObjectLike(draft.strategyEngine) ? draft.strategyEngine : {};
  const profileCandidate = isObjectLike(strategyEngine.profile) ? strategyEngine.profile : null;
  const requestCandidate = isObjectLike(strategyEngine.request) ? strategyEngine.request : null;
  const sourceContextCandidate = Array.isArray(strategyEngine.sourceContext)
    ? (strategyEngine.sourceContext as StrategySourceContextRecord[])
    : [];
  const historyCandidate = Array.isArray(strategyEngine.history)
    ? (strategyEngine.history as StrategyHistoryRecord[])
    : [];

  return {
    history: mergeStrategyHistoryRecords(
      historyCandidate.filter(
        (entry): entry is StrategyHistoryRecord =>
          isObjectLike(entry) &&
          typeof entry.id === "string" &&
          typeof entry.generatedAt === "string" &&
          typeof entry.clientId === "string" &&
          typeof entry.clientName === "string" &&
          typeof entry.outputMode === "string" &&
          typeof entry.executiveSummary === "string",
      ),
    ),
    profile:
      profileCandidate
        ? mergeLegacyProfileState(
            null,
            profileCandidate as Partial<StrategyProfileRecord>,
            {
              clientId: input.clientId,
              clientName: input.clientName,
              id: normalizeString(row?.id),
            },
          )
        : null,
    request:
      requestCandidate
        ? mergeLegacyRequestState(
            null,
            requestCandidate as Partial<StrategyRequestRecord>,
            {
              clientId: input.clientId,
              profileId: normalizeString(row?.id) || undefined,
            },
          )
        : null,
    sourceContext: normalizeLegacySourceContext(sourceContextCandidate, {
      profileId: normalizeString(row?.id) || undefined,
      requestId:
        isObjectLike(requestCandidate) && typeof requestCandidate.id === "string"
          ? requestCandidate.id
          : undefined,
    }),
  };
}

async function persistLegacyStrategyState(
  supabase: SupabaseClientLike,
  input: {
    clientId: string;
    clientName: string;
    ownerUserId?: string | null;
    profile?: StrategyProfileRecord | null;
    request?: StrategyRequestRecord | null;
    sourceContext?: StrategySourceContextRecord[];
    historyEntry?: StrategyHistoryRecord | null;
  },
) {
  const existingRow = await loadLegacyDraftRow(supabase, {
    clientId: input.clientId,
    ownerUserId: input.ownerUserId,
  });
  const existingState = extractLegacyStrategyState(existingRow, {
    clientId: input.clientId,
    clientName: input.clientName,
  });
  const nextProfile = mergeLegacyProfileState(
    existingState.profile,
    input.profile ?? null,
    {
      clientId: input.clientId,
      clientName: input.clientName,
      id: normalizeString(existingRow?.id),
    },
  );
  const nextRequest = mergeLegacyRequestState(
    existingState.request,
    input.request ?? null,
    {
      clientId: input.clientId,
      profileId: normalizeString(existingRow?.id) || undefined,
      requestId: existingState.request?.id,
    },
  );
  const nextSourceContext =
    input.sourceContext && input.sourceContext.length > 0
      ? normalizeLegacySourceContext(input.sourceContext, {
          profileId: normalizeString(existingRow?.id) || undefined,
          requestId: nextRequest.id,
        })
      : existingState.sourceContext;
  const nextHistory = mergeStrategyHistoryRecords([
    ...(input.historyEntry ? [input.historyEntry] : []),
    ...existingState.history,
  ]);
  const payload = {
    client_id: input.clientId,
    client_name: input.clientName,
    status:
      nextRequest.status === "generated" || input.historyEntry
        ? "generated"
        : nextRequest.status === "approved"
          ? "approved"
          : "draft",
    version: 2,
    draft: {
      strategyEngine: {
        history: nextHistory,
        profile: nextProfile,
        request: nextRequest,
        sourceContext: nextSourceContext,
      },
    },
    summary:
      input.historyEntry?.executiveSummary ??
      nextHistory[0]?.executiveSummary ??
      normalizeString(existingRow?.summary) ??
      null,
    generated_at:
      input.historyEntry?.generatedAt ??
      nextRequest.generatedAt ??
      existingRow?.generated_at ??
      null,
  };
  let row = existingRow;
  let usedEphemeralFallback = false;

  try {
    const query = existingRow?.id
      ? supabase
          .from("strategy_drafts")
          .update(payload)
          .eq("id", existingRow.id)
          .select("*")
          .single()
      : supabase.from("strategy_drafts").insert(payload).select("*").single();
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    row = isObjectLike(data) ? (data as UnknownRecord) : existingRow;
  } catch (error) {
    const isLegacySchemaMismatch =
      isMissingColumnError(error, { column: "draft", table: "strategy_drafts" }) ||
      (error instanceof Error &&
        error.message.toLowerCase().includes("strategy_drafts.") &&
        error.message.toLowerCase().includes("does not exist"));

    if (!isLegacySchemaMismatch) {
      throw new Error(error instanceof Error ? error.message : "Impossible de persister le draft.");
    }

    usedEphemeralFallback = true;
    row = {
      client_id: input.clientId,
      client_name: input.clientName,
      generated_at: payload.generated_at,
      id: normalizeString(existingRow?.id) || `legacy-${input.clientId}`,
    };
  }

  const state = usedEphemeralFallback
    ? {
        history: nextHistory,
        profile: nextProfile,
        request: nextRequest,
        sourceContext: nextSourceContext,
      }
    : extractLegacyStrategyState(row, {
        clientId: input.clientId,
        clientName: input.clientName,
      });

  return {
    history: mergeStrategyHistoryRecords(state.history),
    profile: mergeLegacyProfileState(state.profile, null, {
      clientId: input.clientId,
      clientName: input.clientName,
      id: normalizeString(row?.id),
    }),
    request: mergeLegacyRequestState(state.request, null, {
      clientId: input.clientId,
      profileId: normalizeString(row?.id) || undefined,
      requestId: state.request?.id,
    }),
    rowId: normalizeString(row?.id),
    sourceContext: normalizeLegacySourceContext(state.sourceContext, {
      profileId: normalizeString(row?.id) || undefined,
      requestId: state.request?.id,
    }),
  };
}

async function loadLegacyStrategyHistory(
  supabase: SupabaseClientLike,
  clientId: string,
) {
  const { data, error } = await supabase
    .from("strategy_drafts")
    .select("*")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const history = (Array.isArray(data) ? data : []).flatMap((row) =>
    extractLegacyStrategyState(
      isObjectLike(row) ? (row as UnknownRecord) : null,
      {
        clientId,
        clientName: normalizeString(
          isObjectLike(row) && typeof row.client_name === "string" ? row.client_name : "",
        ),
      },
    ).history,
  );

  return mergeStrategyHistoryRecords(history);
}

async function loadLegacyStrategyContext(
  supabase: SupabaseClientLike,
  user: StrategyUserContext,
  client: StrategySeedClient,
) {
  const seedProfile = buildSeedProfile(client);
  const legacyRow = await loadLegacyDraftRow(supabase, {
    clientId: client.id,
    ownerUserId: user.userId,
  });
  const legacyState = extractLegacyStrategyState(legacyRow, {
    clientId: client.id,
    clientName: client.name,
  });
  const profile = legacyState.profile
    ? mergeLegacyProfileState(seedProfile, legacyState.profile, {
        clientId: client.id,
        clientName: client.name,
        id: normalizeString(legacyRow?.id),
      })
    : seedProfile;
  const sourceContext =
    legacyState.sourceContext.length > 0
      ? mergeSeedAndPersistedSourceContext(
          buildSeedSourceContext(client),
          normalizeLegacySourceContext(legacyState.sourceContext, {
            profileId: profile.id,
            requestId: legacyState.request?.id,
          }),
        )
      : buildSeedSourceContext(client);
  const rebuiltRetrievedContextSnapshot = buildRetrievedContextSnapshot(
    client,
    sourceContext,
    profile,
  );
  const request = legacyState.request
    ? {
        ...mergeLegacyRequestState(legacyState.request, null, {
          clientId: client.id,
          profileId: profile.id,
          requestId: legacyState.request.id,
        }),
        retrievedContextSnapshot:
          Object.keys(legacyState.request.retrievedContextSnapshot ?? {}).length > 0
            ? legacyState.request.retrievedContextSnapshot
            : rebuiltRetrievedContextSnapshot,
      }
    : createEmptyStrategyRequest({
        clientId: client.id,
        profileId: profile.id,
        retrievedContextSnapshot: rebuiltRetrievedContextSnapshot,
      });

  return {
    client,
    history: legacyState.history,
    profile: {
      ...profile,
      ...computeProfileCompleteness(profile),
    },
    request,
    sourceContext,
  };
}

export async function saveStrategyProfile(
  supabase: SupabaseClientLike,
  profile: StrategyProfileRecord,
  sourceContext: StrategySourceContextRecord[] = [],
) {
  const completeness = computeProfileCompleteness(profile);
  const payload = {
    client_id: profile.clientId,
    client_name: profile.clientName,
    status: profile.status ?? "active",
    identity: profile.identity,
    business: profile.business,
    offers: profile.offers,
    audience: profile.audience,
    funnel: profile.funnel,
    marketing: profile.marketing,
    performance_history: profile.performanceHistory,
    operations: profile.operations,
    compliance: profile.compliance,
    internal_notes: profile.internalNotes,
    connected_source_summary:
      sourceContext.length > 0 ? summarizeSourceContext(sourceContext) : profile.connectedSourceSummary,
    completeness_score: completeness.completenessScore,
    missing_important_fields: completeness.missingImportantFields,
    recommended_missing_fields: completeness.recommendedMissingFields,
  };

  try {
    const { data, error } = await supabase
      .from("strategy_profiles")
      .upsert(payload, {
        onConflict: "client_id",
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapProfileRow(data);
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw new Error(error instanceof Error ? error.message : "Impossible d'enregistrer le profil.");
    }

    const legacy = await persistLegacyStrategyState(supabase, {
      clientId: profile.clientId,
      clientName: profile.clientName,
      profile: {
        ...profile,
        ...computeProfileCompleteness(profile),
      },
      sourceContext,
    });

    return legacy.profile;
  }
}

export async function saveStrategyRequest(
  supabase: SupabaseClientLike,
  input: {
    clientName?: string;
    ownerUserId: string;
    profileId: string;
    request: StrategyRequestRecord;
    generationState: "draft" | "ready_for_generation" | "generated";
  },
) {
  const request = input.request;
  const payload = {
    profile_id: input.profileId,
    client_id: request.clientId,
    owner_user_id: input.ownerUserId,
    status: input.generationState,
    objective: request.objective,
    stage: request.stage,
    time_horizon: request.timeHorizon,
    priority_kpi: request.priorityKpi,
    main_problem: request.mainProblem,
    severity: request.severity,
    started_at_hint: request.startedAtHint,
    recent_changes: request.recentChanges,
    tested_context: request.testedContext,
    constraints: request.constraints,
    requested_outputs: request.requestedOutputs,
    manual_notes: request.manualNotes,
    missing_questions: request.missingQuestions,
    answered_missing_context: request.answeredMissingContext,
    retrieved_context_snapshot: request.retrievedContextSnapshot,
    data_confidence: request.dataConfidence,
    generated_at:
      input.generationState === "generated" ? new Date().toISOString() : request.generatedAt,
  };

  const query = request.id
    ? supabase
        .from("strategy_requests")
        .upsert({
          id: request.id,
          ...payload,
        })
        .select("*")
        .single()
    : supabase.from("strategy_requests").insert(payload).select("*").single();

  try {
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return mapRequestRow(data);
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw new Error(error instanceof Error ? error.message : "Impossible d'enregistrer la requete.");
    }

    const legacy = await persistLegacyStrategyState(supabase, {
      clientId: request.clientId,
      clientName: normalizeString(input.clientName) || "Client",
      ownerUserId: input.ownerUserId,
      request: {
        ...request,
        id: request.id,
        profileId: input.profileId,
        status: input.generationState,
      },
    });

    return {
      ...legacy.request,
      clientId: request.clientId,
      profileId: input.profileId,
      status: input.generationState,
    };
  }
}

export async function upsertSourceContext(
  supabase: SupabaseClientLike,
  profileId: string,
  requestId: string | undefined,
  sourceContext: StrategySourceContextRecord[],
) {
  if (sourceContext.length === 0) {
    return [] as StrategySourceContextRecord[];
  }

  const payload = sourceContext.map((source) => ({
    profile_id: profileId,
    request_id: requestId ?? null,
    source_type: source.sourceType,
    source_label: source.sourceLabel,
    is_connected: source.isConnected,
    freshness_status: source.freshnessStatus,
    last_synced_at: source.lastSyncedAt,
    confidence_score: source.confidenceScore,
    is_estimated: source.isEstimated,
    warnings: source.warnings,
    snapshot: source.snapshot,
  }));

  try {
    if (requestId) {
      const { error: deleteRequestScopedError } = await supabase
        .from("strategy_source_context")
        .delete()
        .eq("profile_id", profileId)
        .eq("request_id", requestId);

      if (deleteRequestScopedError) {
        throw deleteRequestScopedError;
      }
    }

    const { error: deleteProfileScopedError } = await supabase
      .from("strategy_source_context")
      .delete()
      .eq("profile_id", profileId)
      .is("request_id", null);

    if (deleteProfileScopedError) {
      throw deleteProfileScopedError;
    }

    const insertPayload = requestId
      ? [
          ...payload.map((row) => ({ ...row, request_id: null })),
          ...payload,
        ]
      : payload;

    const { data, error } = await supabase
      .from("strategy_source_context")
      .insert(insertPayload)
      .select("*");

    if (error) {
      throw error;
    }

    const rows = Array.isArray(data) ? data.map(mapSourceRow) : [];
    return requestId ? rows.filter((row) => row.requestId === requestId) : rows;
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw new Error(error instanceof Error ? error.message : "Impossible d'enregistrer les sources.");
    }

    return normalizeLegacySourceContext(sourceContext, {
      profileId,
      requestId,
    });
  }
}

export async function saveStrategyOutput(
  supabase: SupabaseClientLike,
  input: {
    profileId: string;
    requestId: string;
    clientId: string;
    clientName: string;
    createdByUserId: string;
    outputMode: StrategyOutputMode;
    output: StrategyEngineOutput;
    inputSnapshot: Record<string, unknown>;
    provider: string;
    model: string;
    strategyType: string;
    objective: string;
    confidenceScore: number;
    confidenceNote: string;
    sourceConfidenceSnapshot: Record<string, unknown>;
  },
) {
  try {
    const { data, error } = await supabase
      .from("strategy_outputs")
      .insert({
        request_id: input.requestId,
        profile_id: input.profileId,
        client_id: input.clientId,
        client_name: input.clientName,
        created_by_user_id: input.createdByUserId,
        strategy_type: input.strategyType,
        objective: input.objective,
        output_mode: input.outputMode,
        status: "generated",
        provider: input.provider,
        model: input.model,
        prompt_version: "strategy-engine-phase-1",
        input_snapshot: input.inputSnapshot,
        draft_snapshot: input.inputSnapshot,
        output: input.output,
        summary: input.output.executiveSummary,
        executive_summary: input.output.executiveSummary,
        client_summary: input.output.clientFacingSummary,
        confidence_score: input.confidenceScore,
        confidence_note: input.confidenceNote,
        source_confidence_snapshot: input.sourceConfidenceSnapshot,
        generated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw new Error(error instanceof Error ? error.message : "Impossible d'enregistrer la sortie.");
    }

    const generatedAt = new Date().toISOString();
    const historyEntry: StrategyHistoryRecord = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${input.requestId}-${generatedAt}`,
      clientId: input.clientId,
      clientName: input.clientName,
      outputMode: input.outputMode,
      status: "generated",
      generatedAt,
      executiveSummary: input.output.executiveSummary,
      confidenceLevel: input.output.confidenceNote.level,
      output: input.output,
    };

    await persistLegacyStrategyState(supabase, {
      clientId: input.clientId,
      clientName: input.clientName,
      ownerUserId: input.createdByUserId,
      historyEntry,
    });

    return historyEntry;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHistoryRow(row: Record<string, any>): StrategyHistoryRecord {
  const score = Number(row.confidence_score ?? 0.6);
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    outputMode: row.output_mode,
    status: row.status,
    generatedAt: row.generated_at ?? row.created_at,
    executiveSummary: row.executive_summary ?? normalizeString(row.client_summary),
    confidenceLevel: score < 0.55 ? "low" : score < 0.78 ? "medium" : "high",
    output: row.output ?? null,
  };
}

export async function loadStrategyHistory(
  supabase: SupabaseClientLike,
  clientId: string,
) {
  try {
    const { data, error } = await supabase
      .from("strategy_outputs")
      .select("*")
      .eq("client_id", clientId)
      .order("generated_at", { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data.map(mapHistoryRow) : [];
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw new Error(error instanceof Error ? error.message : "Impossible de charger l'historique.");
    }

    return loadLegacyStrategyHistory(supabase, clientId);
  }
}

export async function loadStrategyContext(
  supabase: SupabaseClientLike,
  user: StrategyUserContext,
  input: {
    clientId?: string | null;
    clientName?: string | null;
  },
) {
  const client = await fetchSeedClient(input);
  if (!client) {
    throw new Error("Client introuvable.");
  }

  try {
    const { data: profileRow, error: profileError } = await supabase
      .from("strategy_profiles")
      .select("*")
      .eq("client_id", client.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const seedProfile = buildSeedProfile(client);
    const mappedProfile =
      profileRow && typeof profileRow === "object" ? mapProfileRow(profileRow) : null;
    const profile =
      mappedProfile
        ? {
            ...seedProfile,
            ...mappedProfile,
            clientId: client.id,
            clientName: client.name,
            identity: {
              ...seedProfile.identity,
              ...mappedProfile.identity,
            },
            business: {
              ...seedProfile.business,
              ...mappedProfile.business,
            },
            offers: {
              ...seedProfile.offers,
              ...mappedProfile.offers,
            },
            audience: {
              ...seedProfile.audience,
              ...mappedProfile.audience,
            },
            funnel: {
              ...seedProfile.funnel,
              ...mappedProfile.funnel,
            },
            marketing: {
              ...seedProfile.marketing,
              ...mappedProfile.marketing,
            },
            performanceHistory: {
              ...seedProfile.performanceHistory,
              ...mappedProfile.performanceHistory,
            },
            operations: {
              ...seedProfile.operations,
              ...mappedProfile.operations,
            },
            compliance: {
              ...seedProfile.compliance,
              ...mappedProfile.compliance,
            },
            internalNotes: {
              ...seedProfile.internalNotes,
              ...mappedProfile.internalNotes,
            },
          }
        : seedProfile;

    const profileId = profileRow?.id ?? profile.id;
    const requestQuery = profileId
      ? supabase
          .from("strategy_requests")
          .select("*")
          .eq("profile_id", profileId)
          .neq("status", "archived")
          .order("updated_at", { ascending: false })
          .limit(1)
      : null;
    const requestResult =
      requestQuery
        ? user.role === "manager" || user.canAdmin
          ? await requestQuery
          : await requestQuery.eq("owner_user_id", user.userId)
        : { data: [], error: null };

    if (requestResult?.error) {
      throw requestResult.error;
    }

    const currentRequest =
      Array.isArray(requestResult.data) && requestResult.data.length > 0
        ? mapRequestRow(requestResult.data[0])
        : null;
    const sourceContext =
      profileId
        ? await loadEffectiveSourceContext(supabase, {
            profile,
            profileId,
            requestId: currentRequest?.id,
            clientId: client.id,
            clientName: client.name,
          })
        : buildSeedSourceContext(client);
    const rebuiltRetrievedContextSnapshot = buildRetrievedContextSnapshot(
      client,
      sourceContext,
      profile,
    );
    const retrievedContextSnapshot =
      currentRequest && Object.keys(currentRequest.retrievedContextSnapshot ?? {}).length > 0
        ? currentRequest.retrievedContextSnapshot
        : rebuiltRetrievedContextSnapshot;
    const request =
      currentRequest
        ? {
            ...currentRequest,
            clientId: client.id,
            retrievedContextSnapshot,
          }
        : createEmptyStrategyRequest({
            clientId: client.id,
            retrievedContextSnapshot,
          });

    const history = await loadStrategyHistory(supabase, client.id).catch(() => []);

    return {
      client,
      history,
      profile: {
        ...profile,
        ...computeProfileCompleteness(profile),
      },
      request,
      sourceContext,
    };
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }

    return loadLegacyStrategyContext(supabase, user, client);
  }
}
