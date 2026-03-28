import { getBackendApiBase } from "@/lib/backend-api";

export type WorkflowClient = {
  asana_project_id?: string | null;
  client_activity?: WorkflowClientEntry[] | null;
  client_notes?: WorkflowClientEntry[] | null;
  created_at?: string | null;
  currency?: string | null;
  facebook_url?: string | null;
  google_ads_customer_id?: string | null;
  google_drive_folder_id?: string | null;
  id: string;
  name: string;
  industry?: string | null;
  status?: string | null;
  health_score?: number | string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  meta_account_id?: string | null;
  meta_data?: WorkflowClientMeta | null;
  monthly_budget?: number | null;
  notes?: string | null;
  onboarding_date?: string | null;
  retainer_monthly?: number | null;
  slack_channel_id?: string | null;
  slack_workspace?: string | null;
  tags?: string[] | null;
  team_lead?: string | null;
  tiktok_url?: string | null;
  updated_at?: string | null;
  visibility?: string | null;
  website?: string | null;
  youtube_url?: string | null;
};

export type WorkflowClientEntry = {
  content?: string | null;
  created_at?: string | null;
  note?: string | null;
  text?: string | null;
  title?: string | null;
  type?: string | null;
};

export type WorkflowClientMetaInsight =
  | string
  | {
      msg?: string | null;
      type?: string | null;
      value?: string | number | null;
    };

export type WorkflowClientCampaign = {
  effective_status?: string | null;
  id?: string | null;
  leads?: number | null;
  name?: string | null;
  objective?: string | null;
  spend?: number | null;
  type?: string | null;
  type_label?: string | null;
};

export type WorkflowClientDailyPoint = {
  d?: string | null;
  l?: number | null;
  s?: number | null;
};

export type WorkflowClientMeta = {
  campaigns?: WorkflowClientCampaign[] | null;
  clicks?: number | null;
  conv_value?: number | null;
  cpl?: number | null;
  ctr?: number | null;
  daily?: WorkflowClientDailyPoint[] | null;
  flags?: WorkflowClientMetaInsight[] | null;
  impressions?: number | null;
  leads?: number | null;
  purchases?: number | null;
  roas?: number | null;
  spend?: number | null;
  wins?: WorkflowClientMetaInsight[] | null;
};

export type WorkflowClientCoverage = {
  available: string[];
  missing: string[];
  score: number;
};

export type WorkflowRun = {
  client_id: string;
  client_name?: string | null;
  content?: string | null;
  created_at?: string | null;
  id: string;
  metadata?: Record<string, unknown> | null;
  title?: string | null;
  type?: string | null;
};

export const workflowClientColumns = [
  "id",
  "name",
  "industry",
  "status",
  "health_score",
  "retainer_monthly",
  "monthly_budget",
  "website",
  "notes",
  "visibility",
  "meta_account_id",
  "google_ads_customer_id",
  "facebook_url",
  "instagram_url",
  "tiktok_url",
  "youtube_url",
  "linkedin_url",
  "asana_project_id",
  "slack_channel_id",
  "google_drive_folder_id",
].join(",");

function hasValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return typeof value === "string" ? value.trim().length > 0 : false;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatMetricNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value.toLocaleString("en-US");
}

function formatMetricCurrency(value: number | null | undefined, currency = "CAD") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat("en-CA", {
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
    style: "currency",
  }).format(value);
}

function formatMetricRatio(value: number | null | undefined, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return `${value.toFixed(value >= 10 ? 0 : 2)}${suffix}`;
}

function formatInsight(item: WorkflowClientMetaInsight) {
  if (typeof item === "string") {
    return normalizeString(item);
  }

  if (!item || typeof item !== "object") {
    return "";
  }

  const message = normalizeString(item.msg);
  if (message) {
    return message;
  }

  const type = normalizeString(item.type);
  const value =
    typeof item.value === "number"
      ? String(item.value)
      : normalizeString(item.value);

  return [type, value].filter(Boolean).join(": ");
}

function extractEntryText(entry: WorkflowClientEntry | null | undefined) {
  if (!entry) {
    return "";
  }

  return [
    normalizeString(entry.content),
    normalizeString(entry.note),
    normalizeString(entry.text),
    normalizeString(entry.title),
  ].find(Boolean) ?? "";
}

function buildRecentContextLines(client: WorkflowClient) {
  return [
    ...(client.client_notes ?? []),
    ...(client.client_activity ?? []),
  ]
    .map((entry) => extractEntryText(entry))
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 4);
}

function buildPerformanceSnapshot(client: WorkflowClient) {
  const meta = client.meta_data;
  if (!meta || typeof meta !== "object") {
    return [];
  }

  const currency = normalizeString(client.currency) || "CAD";
  const snapshotLines = [
    formatMetricCurrency(meta.spend, currency) ? `Spend: ${formatMetricCurrency(meta.spend, currency)}` : null,
    formatMetricNumber(meta.leads) ? `Leads: ${formatMetricNumber(meta.leads)}` : null,
    formatMetricCurrency(meta.cpl, currency) ? `CPL: ${formatMetricCurrency(meta.cpl, currency)}` : null,
    formatMetricRatio(meta.roas, "x") ? `ROAS: ${formatMetricRatio(meta.roas, "x")}` : null,
    formatMetricRatio(meta.ctr, "%") ? `CTR: ${formatMetricRatio(meta.ctr, "%")}` : null,
    formatMetricNumber(meta.purchases) ? `Purchases: ${formatMetricNumber(meta.purchases)}` : null,
    formatMetricCurrency(meta.conv_value, currency) ? `Revenue: ${formatMetricCurrency(meta.conv_value, currency)}` : null,
  ].filter((line): line is string => Boolean(line));

  if (snapshotLines.length === 0) {
    return [];
  }

  return [`Performance snapshot: ${snapshotLines.join(", ")}`];
}

function buildCampaignLines(client: WorkflowClient) {
  const campaigns = Array.isArray(client.meta_data?.campaigns)
    ? client.meta_data?.campaigns ?? []
    : [];

  return campaigns
    .slice()
    .sort((left, right) => Number(right?.spend ?? 0) - Number(left?.spend ?? 0))
    .slice(0, 3)
    .map((campaign) => {
      const metrics = [
        formatMetricCurrency(campaign.spend, normalizeString(client.currency) || "CAD"),
        typeof campaign.leads === "number" ? `${campaign.leads} leads` : null,
        normalizeString(campaign.effective_status) || null,
      ].filter(Boolean);

      return [
        normalizeString(campaign.name) || "Unnamed campaign",
        metrics.length > 0 ? `(${metrics.join(", ")})` : null,
      ]
        .filter(Boolean)
        .join(" ");
    });
}

function buildInsightLines(items: WorkflowClientMetaInsight[] | null | undefined) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => formatInsight(item))
    .filter(Boolean)
    .slice(0, 4);
}

export async function hydrateWorkflowClient(client: WorkflowClient): Promise<WorkflowClient> {
  try {
    const response = await fetch(
      `${getBackendApiBase()}/api/client-hub/clients/${encodeURIComponent(client.id)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      return client;
    }

    const data = (await response.json().catch(() => null)) as Partial<WorkflowClient> | null;

    if (!data || typeof data !== "object") {
      return client;
    }

    return {
      ...client,
      ...data,
    };
  } catch {
    return client;
  }
}

export function hasWorkflowManualContext(client: WorkflowClient) {
  return Boolean(
    normalizeString(client.notes) ||
      buildRecentContextLines(client).length > 0,
  );
}

export function buildWorkflowClientCoverage(client: WorkflowClient): WorkflowClientCoverage {
  const available: string[] = [];
  const missing: string[] = [];
  const checks: Array<[string, string | null | undefined]> = [
    ["website", client.website],
    ["notes", hasWorkflowManualContext(client) ? "saved" : null],
    ["meta ads", client.meta_account_id],
    ["google ads", client.google_ads_customer_id],
    ["asana", client.asana_project_id],
    ["slack", client.slack_channel_id],
    ["drive", client.google_drive_folder_id],
    [
      "social URLs",
      client.facebook_url ||
        client.instagram_url ||
        client.tiktok_url ||
        client.youtube_url ||
        client.linkedin_url,
    ],
  ];

  checks.forEach(([label, value]) => {
    if (hasValue(value)) {
      available.push(label);
    } else {
      missing.push(label);
    }
  });

  return {
    available,
    missing,
    score: Math.round((available.length / 8) * 100),
  };
}

export function buildWorkflowContextBlock(client: WorkflowClient) {
  const socialLinks = [
    client.facebook_url ? `Facebook: ${client.facebook_url}` : null,
    client.instagram_url ? `Instagram: ${client.instagram_url}` : null,
    client.tiktok_url ? `TikTok: ${client.tiktok_url}` : null,
    client.youtube_url ? `YouTube: ${client.youtube_url}` : null,
    client.linkedin_url ? `LinkedIn: ${client.linkedin_url}` : null,
  ].filter(Boolean);

  const connectors = [
    client.meta_account_id ? `Meta Ads (${client.meta_account_id})` : null,
    client.google_ads_customer_id ? `Google Ads (${client.google_ads_customer_id})` : null,
    client.asana_project_id ? `Asana (${client.asana_project_id})` : null,
    client.slack_channel_id ? `Slack (${client.slack_channel_id})` : null,
    client.google_drive_folder_id ? `Google Drive (${client.google_drive_folder_id})` : null,
  ].filter(Boolean);

  const performanceLines = buildPerformanceSnapshot(client);
  const campaignLines = buildCampaignLines(client);
  const winLines = buildInsightLines(client.meta_data?.wins);
  const flagLines = buildInsightLines(client.meta_data?.flags);
  const recentContextLines = buildRecentContextLines(client);

  return [
    `Client: ${client.name}`,
    client.industry ? `Industry: ${client.industry}` : null,
    client.status ? `Status: ${client.status}` : null,
    client.team_lead ? `Team lead: ${client.team_lead}` : null,
    client.website ? `Website: ${client.website}` : null,
    typeof client.retainer_monthly === "number" && client.retainer_monthly > 0
      ? `Retainer monthly: ${client.retainer_monthly}`
      : null,
    typeof client.monthly_budget === "number" && client.monthly_budget > 0
      ? `Monthly budget: ${client.monthly_budget}`
      : null,
    connectors.length > 0 ? `Connectors: ${connectors.join(", ")}` : "Connectors: none connected",
    socialLinks.length > 0 ? `Social URLs:\n- ${socialLinks.join("\n- ")}` : "Social URLs: none saved",
    performanceLines.length > 0 ? performanceLines.join("\n") : "Performance snapshot: none saved",
    campaignLines.length > 0 ? `Top campaigns:\n- ${campaignLines.join("\n- ")}` : null,
    winLines.length > 0 ? `Current wins:\n- ${winLines.join("\n- ")}` : null,
    flagLines.length > 0 ? `Current risks:\n- ${flagLines.join("\n- ")}` : null,
    client.notes ? `Internal notes:\n${client.notes}` : "Internal notes: none saved",
    recentContextLines.length > 0 ? `Recent activity / notes:\n- ${recentContextLines.join("\n- ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
