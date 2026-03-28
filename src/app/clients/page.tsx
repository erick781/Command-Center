"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  ExternalLink,
  FileDown,
  FileText,
  FolderKanban,
  FolderOpen,
  Globe2,
  LoaderCircle,
  Megaphone,
  MessageSquare,
  Link2,
  NotebookPen,
  RefreshCw,
  ShieldAlert,
  Target,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";

import {
  ClientDeliverableRunList,
  type ClientDeliverableRunItem,
} from "@/components/client-deliverable-run-list";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  clientMemoryKeys,
  createEmptyClientMemoryForm,
  type ClientMemoryForm as StrategyMemoryForm,
} from "@/lib/client-memory";
import { loadCurrentUserAccess } from "@/lib/current-user-access";
import {
  buildDeliverableFileBase,
  downloadDeliverableDocx,
  downloadDeliverableMarkdown,
} from "@/lib/deliverable-download";

type StrategyRecord = {
  created_at?: string;
  strategy_content?: string;
  strategy_summary?: string;
  version?: number;
};

type ClientActivity = {
  created_at?: string;
  note?: string;
  text?: string;
  type?: string;
};

type ClientNote = {
  created_at?: string;
  content?: string;
  note?: string;
  title?: string;
};

type ClientMeta = {
  spend?: number;
  cpl?: number;
  roas?: number;
  campaigns?: unknown[];
  flags?: string[];
  wins?: string[];
};

type Client = {
  id: string;
  name: string;
  status: string;
  health_score: string;
  retainer_monthly: number;
  monthly_budget?: number;
  industry?: string;
  website?: string;
  facebook_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  linkedin_url?: string;
  meta_data?: ClientMeta;
  meta_account_id?: string;
  google_ads_customer_id?: string;
  asana_project_id?: string;
  slack_channel_id?: string;
  google_drive_folder_id?: string;
  visibility?: string;
  notes?: string;
  client_notes?: ClientNote[] | null;
  client_activity?: ClientActivity[] | null;
};

type ViewMode = "list" | "detail" | "strategy";
type DetailSection = "overview" | "sources" | "memory" | "history";
type ClientListFilter =
  | "all"
  | "active"
  | "paused"
  | "risk"
  | "missing_context"
  | "missing_connectors";
type ClientContextCoreForm = {
  website: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  linkedin_url: string;
  meta_account_id: string;
  google_ads_customer_id: string;
  asana_project_id: string;
  slack_channel_id: string;
  google_drive_folder_id: string;
  notes: string;
};

type ClientContextForm = ClientContextCoreForm & StrategyMemoryForm;

type ClientContextResponse = {
  client?: Partial<Client> | null;
  memory?: StrategyMemoryForm | null;
};

type DeliverableRun = ClientDeliverableRunItem & {
  metadata?: Record<string, unknown> | null;
};

type ClientReferenceAsset = {
  contentType?: string | null;
  createdAt?: string | null;
  fileName: string;
  path: string;
  signedUrl?: string | null;
  sizeBytes?: number | null;
};

type ContextSourceCard = {
  captureMode?: string;
  actionLabel?: string;
  connected: boolean;
  description: string;
  icon: LucideIcon;
  label: string;
  onAction?: (() => void) | null;
  setupHint?: string;
  target?: ContextTarget;
  value?: string;
};

type ContextTarget = keyof ClientContextCoreForm | "reference_files";

const detailSections: Array<{ key: DetailSection; short: string }> = [
  { key: "overview", short: "Vue d'ensemble" },
  { key: "sources", short: "Sources" },
  { key: "memory", short: "Mémoire" },
  { key: "history", short: "Historique" },
];

const contextBaseFields: Array<{
  accepts: string;
  helper: string;
  key: keyof ClientContextCoreForm;
  label: string;
  placeholder: string;
  type: "text" | "url";
}> = [
  {
    key: "website",
    accepts: "URL public",
    helper: "Colle le site principal du client. Si tu oublies https, on le normalise.",
    label: "Website",
    placeholder: "https://client.com",
    type: "url",
  },
  {
    key: "meta_account_id",
    accepts: "ID ou lien Ads Manager",
    helper: "Colle act_123..., juste les chiffres, ou un lien Meta Ads Manager. On extrait l'ID automatiquement.",
    label: "Meta account ID",
    placeholder: "act_123456789",
    type: "text",
  },
  {
    key: "google_ads_customer_id",
    accepts: "ID ou lien Google Ads",
    helper: "Colle 123-456-7890, juste les chiffres, ou un lien Google Ads. On reformate le customer ID.",
    label: "Google Ads customer ID",
    placeholder: "123-456-7890",
    type: "text",
  },
  {
    key: "asana_project_id",
    accepts: "ID ou URL Asana",
    helper: "Colle le projet Asana ou l'URL complète du projet. On récupère le project ID.",
    label: "Asana project ID",
    placeholder: "1200000000000000",
    type: "text",
  },
  {
    key: "slack_channel_id",
    accepts: "ID ou URL Slack",
    helper: "Colle C0123456789, un lien slack.com/archives/... ou un lien app.slack.com/client/...",
    label: "Slack channel ID",
    placeholder: "C0123456789",
    type: "text",
  },
  {
    key: "google_drive_folder_id",
    accepts: "ID ou URL Drive",
    helper: "Colle le dossier Drive complet ou seulement son folder ID. On extrait l'ID si besoin.",
    label: "Google Drive folder ID",
    placeholder: "1AbCdEfGhIjKlMnOp",
    type: "text",
  },
  {
    key: "facebook_url",
    accepts: "URL publique",
    helper: "Lien de la page ou du profil Facebook du client.",
    label: "Facebook URL",
    placeholder: "https://facebook.com/...",
    type: "url",
  },
  {
    key: "instagram_url",
    accepts: "URL publique",
    helper: "Lien du profil Instagram. Le backend peut déjà s'en servir pour enrichir le contexte social.",
    label: "Instagram URL",
    placeholder: "https://instagram.com/...",
    type: "url",
  },
  {
    key: "tiktok_url",
    accepts: "URL publique",
    helper: "Lien du profil TikTok ou d'une présence principale du client.",
    label: "TikTok URL",
    placeholder: "https://tiktok.com/@...",
    type: "url",
  },
  {
    key: "youtube_url",
    accepts: "URL publique",
    helper: "Chaîne YouTube, playlist ou hub vidéo principal.",
    label: "YouTube URL",
    placeholder: "https://youtube.com/...",
    type: "url",
  },
  {
    key: "linkedin_url",
    accepts: "URL publique",
    helper: "Page entreprise ou profil LinkedIn qui donne du contexte business et ton de marque.",
    label: "LinkedIn URL",
    placeholder: "https://linkedin.com/company/...",
    type: "url",
  },
];

const memorySections: Array<{
  description: string;
  fields: Array<{
    key: keyof StrategyMemoryForm;
    label: string;
    placeholder: string;
    rows?: number;
  }>;
  title: string;
}> = [
  {
    title: "Positioning memory",
    description: "Core offer, market shape, and how this client should be framed in deliverables.",
    fields: [
      {
        key: "mainOffer",
        label: "Main offer",
        placeholder: "Primary service, offer, or transformation.",
        rows: 3,
      },
      {
        key: "flagshipOffer",
        label: "Flagship offer",
        placeholder: "Specific package, program, or hero service to reference.",
        rows: 3,
      },
      {
        key: "differentiators",
        label: "Differentiators",
        placeholder: "One per line. What makes this client meaningfully different?",
        rows: 4,
      },
      {
        key: "businessModel",
        label: "Business model",
        placeholder: "Lead gen, booked call, ecommerce, recurring service, etc.",
        rows: 2,
      },
      {
        key: "pricingModel",
        label: "Pricing model",
        placeholder: "Project-based, monthly retainer, quote-based, financing, etc.",
        rows: 2,
      },
      {
        key: "seasonalityNotes",
        label: "Seasonality notes",
        placeholder: "Busy seasons, slow periods, timing sensitivities, weather dependency, etc.",
        rows: 3,
      },
    ],
  },
  {
    title: "Audience memory",
    description: "Who we are speaking to and what tends to move or block them.",
    fields: [
      {
        key: "idealCustomerProfile",
        label: "Ideal customer profile",
        placeholder: "Who is the best-fit buyer for this client?",
        rows: 4,
      },
      {
        key: "targetGeo",
        label: "Target geo",
        placeholder: "Primary regions, cities, service radius, or territory.",
        rows: 2,
      },
      {
        key: "objections",
        label: "Objections",
        placeholder: "One per line. What objections come up most often?",
        rows: 4,
      },
      {
        key: "painPoints",
        label: "Pain points",
        placeholder: "One per line. What problems are most acute for the audience?",
        rows: 4,
      },
      {
        key: "buyingTriggers",
        label: "Buying triggers",
        placeholder: "One per line. What situations make people act now?",
        rows: 4,
      },
    ],
  },
  {
    title: "Funnel and ops memory",
    description: "How the lead actually gets handled once marketing does its job.",
    fields: [
      {
        key: "salesProcess",
        label: "Sales process",
        placeholder: "How they quote, book, close, and what the handoff looks like.",
        rows: 4,
      },
      {
        key: "followUpProcess",
        label: "Follow-up process",
        placeholder: "Speed-to-lead, reminders, nurture, who follows up, etc.",
        rows: 4,
      },
      {
        key: "crmUsed",
        label: "CRM / pipeline tool",
        placeholder: "GHL, HubSpot, spreadsheet, Asana workaround, etc.",
        rows: 2,
      },
      {
        key: "knownConstraints",
        label: "Known constraints",
        placeholder: "One per line. Budget realities, approvals, staffing, fulfillment, compliance, etc.",
        rows: 4,
      },
      {
        key: "communicationPreferences",
        label: "Communication preferences",
        placeholder: "Slack-first, async, wants concise decks, prefers Loom, etc.",
        rows: 3,
      },
      {
        key: "approvalSpeed",
        label: "Approval speed",
        placeholder: "Fast, slow, needs multiple stakeholders, founder-only, etc.",
        rows: 2,
      },
      {
        key: "recurringBlockers",
        label: "Recurring blockers",
        placeholder: "One per line. Anything that repeatedly stalls progress.",
        rows: 4,
      },
    ],
  },
  {
    title: "Strategy memory",
    description: "What we have learned so far and what future deliverables should remember.",
    fields: [
      {
        key: "pastWinningAngles",
        label: "Past winning angles",
        placeholder: "One per line. Angles, hooks, offers, or messages that have worked.",
        rows: 4,
      },
      {
        key: "pastLosingAngles",
        label: "Past losing angles",
        placeholder: "One per line. What has underperformed or fallen flat?",
        rows: 4,
      },
      {
        key: "bestCreativeFormats",
        label: "Best creative formats",
        placeholder: "One per line. Testimonial, founder video, static UGC, before/after, etc.",
        rows: 4,
      },
      {
        key: "previousStrategyNotes",
        label: "Previous strategy notes",
        placeholder: "What strategy context should we carry forward by default?",
        rows: 5,
      },
      {
        key: "internalContextNotes",
        label: "Deep internal context",
        placeholder: "Nuance, politics, delivery caveats, preferences, positioning notes, meeting memory, etc.",
        rows: 6,
      },
      {
        key: "toneOfVoice",
        label: "Tone of voice",
        placeholder: "Direct response, premium, educational, founder-led, playful, restrained, etc.",
        rows: 3,
      },
      {
        key: "brandGuidelines",
        label: "Brand guidelines",
        placeholder: "Any messaging, design, or compliance boundaries that should shape outputs.",
        rows: 4,
      },
    ],
  },
];

function money(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function shortDate(value?: string) {
  if (!value) return "recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString("en-CA");
}

function fileSizeLabel(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) return "";
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function parseUploadErrorMessage(status: number, rawBody: string | null) {
  const body = rawBody?.trim() ?? "";

  if (status === 413 || /request entity too large/i.test(body)) {
    return "Le fichier est trop volumineux pour l'upload actuel. Limite: 50 MB.";
  }

  if (/maximum allowed size/i.test(body) || /exceeded the maximum allowed size/i.test(body)) {
    return "Le fichier dépasse la limite autorisée pour ce client. Limite: 50 MB.";
  }

  if (!body) {
    return "Impossible d'uploader les fichiers client.";
  }

  try {
    const payload = JSON.parse(body) as { error?: unknown };
    if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
  } catch {}

  return "Impossible d'uploader les fichiers client.";
}

function contextTargetId(target: ContextTarget) {
  return `client-context-target-${target}`;
}

function statusColor(client: Client) {
  if (client.visibility === "admin") return "bg-white/5 text-white/35";
  if (client.status === "paused") return "bg-orange-500/10 text-orange-300";
  if (client.status === "churned") return "bg-red-500/10 text-red-300";
  return "bg-green-500/10 text-green-300";
}

function statusLabel(client: Client) {
  if (client.visibility === "admin") return "Cache";
  if (client.status === "paused") return "Pause";
  if (client.status === "churned") return "Churn";
  return "Actif";
}

function hasConnectorMapping(client: Client) {
  return Boolean(
    client.meta_account_id ||
      client.google_ads_customer_id ||
      client.asana_project_id ||
      client.slack_channel_id ||
      client.google_drive_folder_id,
  );
}

function hasReferenceContext(client: Client) {
  return Boolean(
    client.website ||
      client.notes ||
      client.facebook_url ||
      client.instagram_url ||
      client.tiktok_url ||
      client.youtube_url ||
      client.linkedin_url,
  );
}

function hasContextGap(client: Client) {
  return !client.website || !client.notes || !hasConnectorMapping(client);
}

function connectorCount(client: Partial<Client>) {
  return [
    client.meta_account_id,
    client.google_ads_customer_id,
    client.asana_project_id,
    client.slack_channel_id,
    client.google_drive_folder_id,
  ].filter((value) => typeof value === "string" && value.trim().length > 0).length;
}

function referenceSourceCount(client: Partial<Client>) {
  return [
    client.website,
    client.facebook_url,
    client.instagram_url,
    client.tiktok_url,
    client.youtube_url,
    client.linkedin_url,
    client.notes,
  ].filter((value) => typeof value === "string" && value.trim().length > 0).length;
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clientReadinessScore(client: Partial<Client>) {
  const connectors = connectorCount(client);
  const references = referenceSourceCount(client);

  return clampPercentage((references / 7) * 55 + (connectors / 5) * 35 + (client.notes ? 10 : 0));
}

function readinessTone(score: number) {
  if (score >= 75) {
    return {
      bar: "bg-emerald-400",
      badge: "bg-emerald-500/12 text-emerald-200",
      label: "Base forte",
    };
  }

  if (score >= 45) {
    return {
      bar: "bg-[#E8912D]",
      badge: "bg-[#E8912D]/12 text-[#f6c978]",
      label: "Bonne base",
    };
  }

  return {
    bar: "bg-white/30",
    badge: "bg-white/[0.06] text-white/55",
    label: "Contexte mince",
  };
}

function SourceStatusCard(props: ContextSourceCard) {
  const {
    actionLabel,
    captureMode,
    connected,
    description,
    icon: Icon,
    label,
    onAction,
    setupHint,
    value,
  } = props;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.15]">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
            connected
              ? "border-green-500/20 bg-green-500/10 text-green-300"
              : "border-white/[0.06] bg-white/[0.04] text-white/35"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <Badge
          className={
            connected
              ? "bg-green-500/10 text-green-300"
              : "bg-white/[0.04] text-white/35"
          }
        >
          {connected ? "Connecté" : "Manquant"}
        </Badge>
      </div>
      <div className="mt-3 text-sm font-semibold text-white">{label}</div>
      {captureMode ? (
        <div className="mt-2">
          <Badge className="bg-white/[0.04] text-white/40">{captureMode}</Badge>
        </div>
      ) : null}
      <p className="mt-1 text-xs leading-5 text-white/35">{description}</p>
      {setupHint ? (
        <p className="mt-2 text-[11px] leading-5 text-[#f6c978]">{setupHint}</p>
      ) : null}
      {value ? (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-white/55">
          <span className="text-white/30">Valeur:</span>{" "}
          <span className="font-mono">{value}</span>
        </div>
      ) : null}
      {!connected && onAction ? (
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className="mt-3 border-[#E8912D]/20 text-[#f6c978] hover:bg-[#E8912D]/10"
        >
          {actionLabel || "Configurer"}
        </Button>
      ) : null}
    </div>
  );
}

function runTypeLabel(type?: string) {
  switch (type) {
    case "strategy_360":
      return "Strategy 360";
    case "client_summary":
      return "Client Summary";
    case "performance_report":
      return "Performance Report";
    case "creative_brief":
      return "Creative Brief";
    case "ad_copy":
      return "Ad Copy";
    case "email_sequence":
      return "Email Sequence";
    case "content_ideas":
      return "Content Ideas";
    default:
      return type?.replace(/_/g, " ") || "Deliverable";
  }
}

function extractNoteText(entry: ClientNote | ClientActivity | undefined | null) {
  if (!entry) return "";
  if ("content" in entry && typeof entry.content === "string") return entry.content;
  if ("note" in entry && typeof entry.note === "string") return entry.note;
  if ("text" in entry && typeof entry.text === "string") return entry.text;
  if ("title" in entry && typeof entry.title === "string") return entry.title;
  return "";
}

function createClientContextForm(
  client?: Client | null,
  memory?: Partial<StrategyMemoryForm> | null,
): ClientContextForm {
  return {
    website: client?.website ?? "",
    facebook_url: client?.facebook_url ?? "",
    instagram_url: client?.instagram_url ?? "",
    tiktok_url: client?.tiktok_url ?? "",
    youtube_url: client?.youtube_url ?? "",
    linkedin_url: client?.linkedin_url ?? "",
    meta_account_id: client?.meta_account_id ?? "",
    google_ads_customer_id: client?.google_ads_customer_id ?? "",
    asana_project_id: client?.asana_project_id ?? "",
    slack_channel_id: client?.slack_channel_id ?? "",
    google_drive_folder_id: client?.google_drive_folder_id ?? "",
    notes: client?.notes ?? "",
    ...createEmptyClientMemoryForm(),
    ...(memory ?? {}),
  };
}

export default function ClientsPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ClientListFilter>("all");
  const [stats, setStats] = useState({ active: 0, spend: 0, mrr: 0 });

  const [view, setView] = useState<ViewMode>("list");
  const [detailSection, setDetailSection] = useState<DetailSection>("overview");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [strategyView, setStrategyView] = useState<StrategyRecord | null>(null);
  const [deliverableRuns, setDeliverableRuns] = useState<DeliverableRun[]>([]);
  const [clientAssets, setClientAssets] = useState<ClientReferenceAsset[]>([]);

  const [loadingClients, setLoadingClients] = useState(true);
  const [openingClientId, setOpeningClientId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [strategiesLoading, setStrategiesLoading] = useState(false);
  const [runsLoading, setRunsLoading] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [contextForm, setContextForm] = useState<ClientContextForm>(createClientContextForm());
  const [savedContextForm, setSavedContextForm] = useState<ClientContextForm>(createClientContextForm());
  const [contextStatus, setContextStatus] = useState<string | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [savingContext, setSavingContext] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [assetStatus, setAssetStatus] = useState<string | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [deletingAssetPath, setDeletingAssetPath] = useState<string | null>(null);
  const [downloadingRunKey, setDownloadingRunKey] = useState<string | null>(null);
  const [assetInputKey, setAssetInputKey] = useState(0);
  const [initialClientApplied, setInitialClientApplied] = useState(false);
  const assetInputRef = useRef<HTMLInputElement | null>(null);
  const isAdmin = currentUserRole === "admin" || currentUserRole === "super_admin";

  function openReferenceFilePicker() {
    if (!isAdmin) return;
    if (assetInputRef.current) {
      assetInputRef.current.value = "";
      assetInputRef.current.click();
    }
  }

  function openDeliverableRun(runId: string) {
    window.location.href = `/runs?runId=${encodeURIComponent(runId)}`;
  }

  async function downloadDeliverableRunDocx(run: DeliverableRun) {
    if (!selectedClient || !run.content) return;

    const nextKey = `${run.id}:docx`;
    setDownloadingRunKey(nextKey);

    try {
      await downloadDeliverableDocx({
        clientName: selectedClient.name,
        content: run.content,
        fileBaseName: buildDeliverableFileBase(run.type, selectedClient.name),
        industry: selectedClient.industry || "",
        language: "fr",
        type: run.type || "deliverable",
      });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Impossible de telecharger ce livrable.",
      );
    } finally {
      setDownloadingRunKey(null);
    }
  }

  function downloadDeliverableRunMarkdown(run: DeliverableRun) {
    if (!selectedClient || !run.content) return;

    const nextKey = `${run.id}:md`;
    setDownloadingRunKey(nextKey);

    try {
      downloadDeliverableMarkdown({
        clientName: selectedClient.name,
        content: run.content,
        fileBaseName: buildDeliverableFileBase(run.type, selectedClient.name),
        type: run.type || "deliverable",
      });
    } finally {
      setDownloadingRunKey(null);
    }
  }

  function openContextTarget(target: ContextTarget) {
    setDetailSection("sources");

    window.setTimeout(() => {
      const node = document.getElementById(contextTargetId(target));
      if (!node) return;

      node.scrollIntoView({ behavior: "smooth", block: "center" });

      if (target === "reference_files") {
        openReferenceFilePicker();
        return;
      }

      const focusable = node.querySelector("input, textarea") as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;

      focusable?.focus();
    }, 120);
  }

  const loadClients = useEffectEvent(async () => {
    setLoadingClients(true);
    try {
      const response = await fetch(`${API_BASE}/api/client-hub/clients?show_hidden=true`);
      const data = await response.json().catch(() => []);
      const list = Array.isArray(data) ? data : [];

      setClients(list);
      setStats({
        active: list.filter((client: Client) => client.status === "active").length,
        spend: list.reduce((sum: number, client: Client) => sum + (client.meta_data?.spend || 0), 0),
        mrr: list.reduce((sum: number, client: Client) => sum + (client.retainer_monthly || 0), 0),
      });
    } catch {
      setClients([]);
      setStats({ active: 0, spend: 0, mrr: 0 });
    } finally {
      setLoadingClients(false);
    }
  });

  useEffect(() => {
    let active = true;

    const bootstrapAccess = async () => {
      try {
        const access = await loadCurrentUserAccess();

        if (!active) return;
        setCurrentUserRole(access.role);
      } finally {
        if (active) setAccessReady(true);
      }
    };

    void bootstrapAccess();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!accessReady) return;

    if (!isAdmin) {
      setLoadingClients(false);
      return;
    }

    void loadClients();
  }, [accessReady, isAdmin]);

  const applyInitialClientSelection = useEffectEvent(async () => {
    const clientId = searchParams.get("clientId");
    const nextClient = clientId ? clients.find((client) => client.id === clientId) : null;

    if (nextClient) {
      await openClient(nextClient);
    }

    setInitialClientApplied(true);
  });

  useEffect(() => {
    if (initialClientApplied || !isAdmin || loadingClients || clients.length === 0) {
      return;
    }

    void applyInitialClientSelection();
  }, [clients.length, initialClientApplied, isAdmin, loadingClients]);

  async function openClient(client: Client) {
    setOpeningClientId(client.id);
    setView("detail");
    setDetailSection("overview");
    setStrategyView(null);
    setSelectedClient(client);
    setContextStatus(null);
    setContextError(null);
    setStrategies([]);
    setDeliverableRuns([]);
    setClientAssets([]);
    setAssetStatus(null);
    setAssetError(null);
    setDetailLoading(true);
    setStrategiesLoading(true);
    setRunsLoading(true);
    setAssetsLoading(true);

    const [detailResult, strategiesResult, contextResult, runsResult, assetsResult] = await Promise.allSettled([
      fetch(`${API_BASE}/api/client-hub/clients/${client.id}`).then((response) =>
        response.ok ? response.json() : client,
      ),
      fetch(`${API_BASE}/api/strategy/past/${encodeURIComponent(client.name)}`).then((response) =>
        response.ok ? response.json() : { strategies: [] },
      ),
      fetch(`/api/client-context/${client.id}`, {
        credentials: "include",
      }).then((response) => (response.ok ? response.json() : null)),
      fetch(`/api/workflow/runs?clientId=${encodeURIComponent(client.id)}`, {
        credentials: "include",
      }).then((response) => (response.ok ? response.json() : { runs: [] })),
      fetch(`/api/client-context/${client.id}/assets`, {
        credentials: "include",
      }).then((response) => (response.ok ? response.json() : { assets: [] })),
    ]);

    const detailClient =
      detailResult.status === "fulfilled" && detailResult.value ? detailResult.value : client;
    const contextPayload =
      contextResult.status === "fulfilled"
        ? (contextResult.value as ClientContextResponse | null)
        : null;
    const nextClient = {
      ...detailClient,
      ...(contextPayload?.client ?? {}),
    } as Client;

    setSelectedClient(nextClient);
    const nextContextForm = createClientContextForm(nextClient, contextPayload?.memory);
    setContextForm(nextContextForm);
    setSavedContextForm(nextContextForm);
    setDetailLoading(false);

    if (strategiesResult.status === "fulfilled") {
      const nextStrategies = Array.isArray(strategiesResult.value?.strategies)
        ? strategiesResult.value.strategies
        : [];
      setStrategies(nextStrategies);
    } else {
      setStrategies([]);
    }
    setStrategiesLoading(false);

    if (runsResult.status === "fulfilled") {
      setDeliverableRuns(
        Array.isArray(runsResult.value?.runs) ? (runsResult.value.runs as DeliverableRun[]) : [],
      );
    } else {
      setDeliverableRuns([]);
    }
    setRunsLoading(false);

    if (assetsResult.status === "fulfilled") {
      setClientAssets(
        Array.isArray(assetsResult.value?.assets)
          ? (assetsResult.value.assets as ClientReferenceAsset[])
          : [],
      );
    } else {
      setClientAssets([]);
    }
    setAssetsLoading(false);
    setOpeningClientId(null);
  }

  async function toggleVisibility() {
    if (!selectedClient || !isAdmin) return;

    const nextVisibility = selectedClient.visibility === "admin" ? "all" : "admin";
    setSavingVisibility(true);
    try {
      await fetch(`${API_BASE}/api/client-hub/clients/${selectedClient.id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: nextVisibility }),
      });

      setSelectedClient({ ...selectedClient, visibility: nextVisibility });
      setClients((current) =>
        current.map((client) =>
          client.id === selectedClient.id ? { ...client, visibility: nextVisibility } : client,
        ),
      );
    } finally {
      setSavingVisibility(false);
    }
  }

  async function saveClientContext() {
    if (!selectedClient || !isAdmin) return;

    setSavingContext(true);
    setContextStatus(null);
    setContextError(null);

    try {
      const response = await fetch(`/api/client-context/${selectedClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(contextForm),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de sauvegarder le contexte client.",
        );
      }

      const nextClient = {
        ...selectedClient,
        ...((data?.client as Partial<Client> | undefined) ?? contextForm),
      };

      setSelectedClient(nextClient);
      const nextContextForm = createClientContextForm(
        nextClient,
        data?.memory as StrategyMemoryForm | null | undefined,
      );
      setContextForm(nextContextForm);
      setSavedContextForm(nextContextForm);
      setClients((current) =>
        current.map((client) => (client.id === nextClient.id ? { ...client, ...nextClient } : client)),
      );
      setContextStatus("Contexte client sauvegarde.");
    } catch (error) {
      setContextError(
        error instanceof Error ? error.message : "Impossible de sauvegarder le contexte client.",
      );
    } finally {
      setSavingContext(false);
    }
  }

  async function uploadReferenceFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!selectedClient || files.length === 0) {
      event.target.value = "";
      return;
    }

    setUploadingAssets(true);
    setAssetStatus(null);
    setAssetError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch(`/api/client-context/${selectedClient.id}/assets`, {
        body: formData,
        credentials: "include",
        method: "POST",
      });

      const rawBody = await response.text();
      const data = rawBody
        ? ((() => {
            try {
              return JSON.parse(rawBody) as {
                assets?: ClientReferenceAsset[];
                error?: string;
              };
            } catch {
              return null;
            }
          })())
        : null;

      if (!response.ok) {
        throw new Error(parseUploadErrorMessage(response.status, rawBody));
      }

      setClientAssets(
        Array.isArray(data?.assets) ? (data.assets as ClientReferenceAsset[]) : [],
      );
      setAssetStatus(`${files.length} fichier(s) ajouté(s) au client.`);
      setAssetInputKey((current) => current + 1);
    } catch (error) {
      setAssetError(
        error instanceof Error ? error.message : "Impossible d'uploader les fichiers client.",
      );
    } finally {
      event.target.value = "";
      setUploadingAssets(false);
    }
  }

  async function deleteReferenceFile(path: string) {
    if (!selectedClient) return;

    setDeletingAssetPath(path);
    setAssetStatus(null);
    setAssetError(null);

    try {
      const response = await fetch(`/api/client-context/${selectedClient.id}/assets`, {
        body: JSON.stringify({ path }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de supprimer le fichier client.",
        );
      }

      setClientAssets(
        Array.isArray(data?.assets) ? (data.assets as ClientReferenceAsset[]) : [],
      );
      setAssetStatus("Fichier supprimé du client.");
    } catch (error) {
      setAssetError(
        error instanceof Error ? error.message : "Impossible de supprimer le fichier client.",
      );
    } finally {
      setDeletingAssetPath(null);
    }
  }

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (
        search &&
        ![client.name, client.industry, client.website]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(search.toLowerCase()))
      )
        return false;
      if (filter === "active" && client.status !== "active") return false;
      if (filter === "paused" && client.status !== "paused") return false;
      if (filter === "risk" && !String(client.health_score || "").toLowerCase().includes("red"))
        return false;
      if (filter === "missing_context" && !hasContextGap(client)) return false;
      if (filter === "missing_connectors" && hasConnectorMapping(client)) return false;
      return true;
    });
  }, [clients, filter, search]);

  const listInsights = useMemo(
    () => ({
      missingConnectors: clients.filter((client) => !hasConnectorMapping(client)).length,
      missingContext: clients.filter((client) => hasContextGap(client)).length,
      withReferenceContext: clients.filter((client) => hasReferenceContext(client)).length,
    }),
    [clients],
  );

  const parsedStrategy = useMemo(() => {
    if (!strategyView) return null;

    try {
      return JSON.parse(strategyView.strategy_content || "{}") as Record<string, string>;
    } catch {
      return { full: strategyView.strategy_content || "" };
    }
  }, [strategyView]);

  const selectedNotes = Array.isArray(selectedClient?.client_notes)
    ? selectedClient?.client_notes
    : [];
  const selectedActivity = Array.isArray(selectedClient?.client_activity)
    ? selectedClient?.client_activity
    : [];
  const selectedFlags = Array.isArray(selectedClient?.meta_data?.flags)
    ? selectedClient?.meta_data?.flags
    : [];
  const selectedWins = Array.isArray(selectedClient?.meta_data?.wins)
    ? selectedClient?.meta_data?.wins
    : [];
  const connectorCards: ContextSourceCard[] = [
    {
      captureMode: "ID ou lien",
      actionLabel: "Connecter Meta",
      connected:
        !!contextForm.meta_account_id.trim() ||
        typeof selectedClient?.meta_data?.spend === "number",
      description: "Compte publicitaire Meta branché ou activité spend détectée.",
      icon: Megaphone,
      label: "Meta Ads",
      onAction: () => openContextTarget("meta_account_id"),
      setupHint:
        "Colle l'account ID ou un lien Ads Manager. Le backend a déjà la couche Meta, ici on mappe juste le bon compte client.",
      target: "meta_account_id",
      value: contextForm.meta_account_id.trim() || undefined,
    },
    {
      captureMode: "ID ou lien",
      actionLabel: "Connecter Google Ads",
      connected: !!contextForm.google_ads_customer_id.trim(),
      description: "Customer ID Google Ads relié au client.",
      icon: Target,
      label: "Google Ads",
      onAction: () => openContextTarget("google_ads_customer_id"),
      setupHint:
        "Colle le customer ID ou un lien de compte Google Ads. Le système reformate automatiquement le bon ID.",
      target: "google_ads_customer_id",
      value: contextForm.google_ads_customer_id.trim() || undefined,
    },
    {
      captureMode: "ID ou lien",
      actionLabel: "Connecter Asana",
      connected: !!contextForm.asana_project_id.trim(),
      description: "Projet Asana pour le delivery, les tâches et le suivi.",
      icon: FolderKanban,
      label: "Asana",
      onAction: () => openContextTarget("asana_project_id"),
      setupHint:
        "Colle le projet Asana ou l'URL du projet. On garde ensuite ce project ID comme mapping client.",
      target: "asana_project_id",
      value: contextForm.asana_project_id.trim() || undefined,
    },
    {
      captureMode: "ID ou lien",
      actionLabel: "Connecter Drive",
      connected: !!contextForm.google_drive_folder_id.trim(),
      description: "Dossier Drive avec docs, assets et références client.",
      icon: FolderOpen,
      label: "Google Drive",
      onAction: () => openContextTarget("google_drive_folder_id"),
      setupHint:
        "Colle le dossier Drive ou son lien complet. C'est le meilleur endroit pour garder decks, docs et assets par client.",
      target: "google_drive_folder_id",
      value: contextForm.google_drive_folder_id.trim() || undefined,
    },
    {
      captureMode: "ID ou lien",
      actionLabel: "Connecter Slack",
      connected: !!contextForm.slack_channel_id.trim(),
      description: "Canal Slack ou point de contact opérationnel interne.",
      icon: MessageSquare,
      label: "Slack",
      onAction: () => openContextTarget("slack_channel_id"),
      setupHint:
        "Colle le channel ID ou un lien Slack du canal. Ça nous aide à rattacher les échanges et le contexte opérationnel.",
      target: "slack_channel_id",
      value: contextForm.slack_channel_id.trim() || undefined,
    },
  ];
  const referenceCards: ContextSourceCard[] = [
    {
      captureMode: "URL",
      actionLabel: "Ajouter l'URL",
      connected: !!contextForm.website.trim(),
      description: "Site web principal pour le contexte business et le messaging.",
      icon: Globe2,
      label: "Website",
      onAction: () => openContextTarget("website"),
      setupHint: "URL publique du client. Elle enrichit immédiatement le contexte de marque.",
      target: "website",
      value: contextForm.website.trim() || undefined,
    },
    {
      captureMode: "URL",
      actionLabel: "Ajouter Facebook",
      connected: !!contextForm.facebook_url.trim(),
      description: "Profil ou page Facebook du client.",
      icon: Link2,
      label: "Facebook",
      onAction: () => openContextTarget("facebook_url"),
      setupHint: "URL publique de la page ou du profil Facebook.",
      target: "facebook_url",
      value: contextForm.facebook_url.trim() || undefined,
    },
    {
      captureMode: "URL",
      actionLabel: "Ajouter Instagram",
      connected: !!contextForm.instagram_url.trim(),
      description: "Profil Instagram du client.",
      icon: Link2,
      label: "Instagram",
      onAction: () => openContextTarget("instagram_url"),
      setupHint: "URL publique du profil Instagram.",
      target: "instagram_url",
      value: contextForm.instagram_url.trim() || undefined,
    },
    {
      captureMode: "URL",
      actionLabel: "Ajouter TikTok",
      connected: !!contextForm.tiktok_url.trim(),
      description: "Profil TikTok du client.",
      icon: Link2,
      label: "TikTok",
      onAction: () => openContextTarget("tiktok_url"),
      setupHint: "URL publique du profil TikTok.",
      target: "tiktok_url",
      value: contextForm.tiktok_url.trim() || undefined,
    },
    {
      captureMode: "URL",
      actionLabel: "Ajouter YouTube",
      connected: !!contextForm.youtube_url.trim(),
      description: "Chaîne YouTube ou bibliothèque vidéo du client.",
      icon: Link2,
      label: "YouTube",
      onAction: () => openContextTarget("youtube_url"),
      setupHint: "URL publique de la chaîne ou du hub vidéo.",
      target: "youtube_url",
      value: contextForm.youtube_url.trim() || undefined,
    },
    {
      captureMode: "URL",
      actionLabel: "Ajouter LinkedIn",
      connected: !!contextForm.linkedin_url.trim(),
      description: "Profil ou page LinkedIn du client.",
      icon: Link2,
      label: "LinkedIn",
      onAction: () => openContextTarget("linkedin_url"),
      setupHint: "URL publique LinkedIn pour capter le positionnement B2B ou corporate.",
      target: "linkedin_url",
      value: contextForm.linkedin_url.trim() || undefined,
    },
    {
      captureMode: "Texte",
      actionLabel: "Ajouter la note",
      connected: !!contextForm.notes.trim(),
      description: "Notes rapides de meeting, contexte chaud et nuances récentes.",
      icon: NotebookPen,
      label: "Meeting notes",
      onAction: () => openContextTarget("notes"),
      setupHint: "Ajoute ici le contexte chaud qui n'existe nulle part ailleurs.",
      target: "notes",
      value: contextForm.notes.trim() ? `${contextForm.notes.trim().slice(0, 72)}...` : undefined,
    },
    {
      captureMode: "Fichiers",
      actionLabel: "Uploader",
      connected: clientAssets.length > 0,
      description: "Documents, decks, briefs, PDFs ou assets de référence déjà uploadés.",
      icon: FileText,
      label: "Reference files",
      onAction: () => openContextTarget("reference_files"),
      setupHint:
        "Upload les decks, notes d'appel, audits, exports ou briefs que le moteur doit garder en tête.",
      target: "reference_files",
      value: clientAssets.length > 0 ? `${clientAssets.length} fichier(s)` : undefined,
    },
  ];
  const missingSourceCards = [...connectorCards, ...referenceCards].filter(
    (item) => !item.connected,
  );
  const filledSourceFields =
    contextBaseFields.reduce((count, field) => count + (contextForm[field.key].trim() ? 1 : 0), 0) +
    (contextForm.notes.trim() ? 1 : 0);
  const filledMemoryFields = clientMemoryKeys.reduce(
    (count, key) => count + (contextForm[key].trim() ? 1 : 0),
    0,
  );
  const sourceFieldCount = contextBaseFields.length + 1;
  const memoryFieldCount = clientMemoryKeys.length;
  const connectedCount = connectorCards.filter((item) => item.connected).length;
  const detailReadinessScore = clampPercentage(
    (filledSourceFields / sourceFieldCount) * 50 +
      (filledMemoryFields / memoryFieldCount) * 30 +
      (connectedCount / connectorCards.length) * 15 +
      (clientAssets.length > 0 ? 5 : 0),
  );
  const detailTone = readinessTone(detailReadinessScore);
  const detailSignals = [
    contextForm.website.trim() ? "Website capté" : null,
    connectedCount > 0 ? `${connectedCount} connecteurs reliés` : null,
    filledMemoryFields > 0 ? `${filledMemoryFields} blocs mémoire remplis` : null,
    clientAssets.length > 0 ? `${clientAssets.length} fichiers de référence` : null,
  ].filter((value): value is string => Boolean(value));
  const detailNextMove =
    missingSourceCards[0]?.label ??
    (filledMemoryFields < Math.ceil(memoryFieldCount * 0.4) ? "Mémoire client" : null);

  const strategyTitles: Record<string, string> = {
    audit: "Phase 1 - Audit",
    research: "Phase 2 - Recherche",
    strategy: "Phase 3 - Strategie",
    build: "Phase 4 - Build",
    launch: "Phase 5 - Lancement",
    scale: "Phase 6 - Scale",
    kpis: "KPIs & Tracking",
    full: "Strategie",
  };

  async function downloadArchivedStrategyDocx() {
    if (!selectedClient || !parsedStrategy) return;

    const markdown = Object.entries(parsedStrategy)
      .filter(([, value]) => value && value.length > 20)
      .map(([key, value]) => `# ${strategyTitles[key] || key}\n${value}`)
      .join("\n\n");

    const response = await fetch("/api/deliverable/export-docx", {
      body: JSON.stringify({
        client_name: selectedClient.name,
        content: markdown,
        industry: selectedClient.industry || "",
        language: "fr",
        type: "strategy_360",
      }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Impossible d'exporter le DOCX.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `strategy_360_${selectedClient.name.replace(/\s+/g, "_")}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!accessReady) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="overflow-x-hidden mx-auto max-w-5xl px-4 py-4 md:py-8 md:px-6 md:py-10">
          <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a1f] p-6 text-sm text-white/45">
            Verification des acces...
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="overflow-x-hidden mx-auto max-w-5xl px-4 py-4 md:py-8 md:px-6 md:py-10">
          <Card className="border-white/[0.06] bg-[#1a1a1f]">
            <CardContent className="pt-6">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#E8912D]">
                Admin only
              </div>
              <h1 className="mt-2 text-2xl font-bold text-white">Client context</h1>
              <p className="mt-2 text-sm leading-6 text-white/45">
                Cette surface sert a enrichir le contexte client avec des URLs, connecteurs et
                notes internes. Elle est reservee a Erick et aux admins.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (view === "strategy" && strategyView && parsedStrategy) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="overflow-x-hidden mx-auto max-w-5xl px-4 py-4 md:py-8 md:px-6 md:py-10">
          <Button
            onClick={() => setView("detail")}
            variant="outline"
            size="sm"
            className="mb-5 border-white/[0.06] text-white/45"
          >
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Retour au client
          </Button>

          <div className="mb-6">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#E8912D]">
              Strategie archivee
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">{selectedClient?.name}</h1>
            <p className="mt-1 text-sm text-white/35">{shortDate(strategyView.created_at)}</p>
          </div>

          {Object.entries(parsedStrategy)
            .filter(([, value]) => value && value.length > 20)
            .map(([key, value]) => (
              <Card key={key} className="mb-4 border-white/[0.06] bg-[#1a1a1f]">
                <CardContent className="pt-5">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#E8912D]">
                    {strategyTitles[key] || key}
                  </div>
                  <div className="whitespace-pre-line text-sm leading-relaxed text-white/65">
                    {value}
                  </div>
                </CardContent>
              </Card>
            ))}

          <Button
            onClick={() => void downloadArchivedStrategyDocx()}
            className="bg-[#E8912D] text-[#17140f] hover:bg-[#f0a94b]"
          >
            Telecharger DOCX
          </Button>
        </main>
      </div>
    );
  }

  if (view === "detail" && selectedClient) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="overflow-x-hidden mx-auto max-w-6xl px-4 py-4 md:px-6 md:py-10">
          <Button
            onClick={() => {
              setView("list");
              setSelectedClient(null);
              setStrategies([]);
              setStrategyView(null);
            }}
            variant="outline"
            size="sm"
            className="mb-5 border-white/[0.06] text-white/45"
          >
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Retour a la liste
          </Button>

          <section className="rounded-[32px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.26)] md:p-8">
            <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusColor(selectedClient)}>{statusLabel(selectedClient)}</Badge>
                  <Badge className={detailTone.badge}>{detailTone.label}</Badge>
                  {selectedClient.industry ? (
                    <Badge className="bg-white/[0.04] text-white/55">{selectedClient.industry}</Badge>
                  ) : null}
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white md:text-[38px]">
                  {selectedClient.name}
                </h1>

                <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/42">
                  {selectedClient.retainer_monthly ? (
                    <span>{money(selectedClient.retainer_monthly)}/mo retainer</span>
                  ) : null}
                  {selectedClient.monthly_budget ? <span>· {money(selectedClient.monthly_budget)} budget</span> : null}
                  {selectedClient.website ? (
                    <a
                      href={selectedClient.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#f6c978] hover:text-white"
                    >
                      <span>· {selectedClient.website.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/48 md:text-[15px]">
                  Ce dossier devient la source de vérité du client. Plus il est riche, plus le
                  workflow peut générer des rapports, stratégies et livrables solides sans te
                  refaire le briefing.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {detailSignals.length > 0 ? (
                    detailSignals.map((signal) => (
                      <Badge
                        key={signal}
                        className="rounded-full bg-white/[0.04] px-3 py-1 text-white/60 ring-1 ring-white/10"
                      >
                        {signal}
                      </Badge>
                    ))
                  ) : (
                    <Badge className="rounded-full bg-white/[0.04] px-3 py-1 text-white/60 ring-1 ring-white/10">
                      Dossier encore léger
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/[0.06] bg-black/20 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#f6c978]">
                      Workflow readiness
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
                      {detailReadinessScore}%
                    </div>
                  </div>
                  <Badge className={detailTone.badge}>{detailTone.label}</Badge>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${detailTone.bar}`}
                    style={{ width: `${detailReadinessScore}%` }}
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Sources", value: `${filledSourceFields}/${sourceFieldCount}` },
                    { label: "Mémoire", value: `${filledMemoryFields}/${memoryFieldCount}` },
                    { label: "Connecteurs", value: `${connectedCount}/${connectorCards.length}` },
                    { label: "Fichiers", value: `${clientAssets.length}` },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
                    >
                      <div className="text-xl font-semibold tracking-[-0.04em] text-white">
                        {item.value}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                    Prochain move
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/65">
                    {detailNextMove
                      ? `Ajoute ou complète ${detailNextMove.toLowerCase()}.`
                      : "Base solide. Ajoute ensuite plus de mémoire et plus de fichiers."}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 border-t border-white/[0.06] pt-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {detailSections.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setDetailSection(section.key)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      detailSection === section.key
                        ? "border-[#E8912D]/30 bg-[#E8912D]/12 text-[#f6c978]"
                        : "border-white/[0.06] bg-white/[0.02] text-white/45 hover:text-white"
                    }`}
                  >
                    {section.short}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => void openClient(selectedClient)}
                  variant="outline"
                  className="border-white/[0.06] text-white/55"
                >
                  {detailLoading || strategiesLoading ? (
                    <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  )}
                  Rafraichir
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    window.open(
                      `/new?clientId=${encodeURIComponent(selectedClient.id)}&taskId=performance_report`,
                      "_self",
                    )
                  }
                  className="bg-[#E8912D] text-[#17140f] hover:bg-[#f0a94b]"
                >
                  Rapport
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    window.open(
                      `/new?clientId=${encodeURIComponent(selectedClient.id)}&taskId=strategy_360`,
                      "_self",
                    )
                  }
                  variant="outline"
                  className="border-[#E8912D]/25 text-[#f6c978]"
                >
                  Strategie
                </Button>
                <Button
                  size="sm"
                  onClick={() => void toggleVisibility()}
                  variant="outline"
                  disabled={savingVisibility}
                  className="border-white/[0.06] text-white/40"
                >
                  {savingVisibility ? (
                    <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {selectedClient.visibility === "admin" ? "Montrer" : "Cacher"}
                </Button>
              </div>
            </div>
          </section>

          {detailSection === "overview" ? (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Retainer",
                    value: money(selectedClient.retainer_monthly),
                    tone: "text-white",
                  },
                  {
                    label: "Budget mensuel",
                    value: money(selectedClient.monthly_budget),
                    tone: "text-[#f6c978]",
                  },
                  {
                    label: "Spend Meta",
                    value: money(selectedClient.meta_data?.spend),
                    tone: "text-green-300",
                  },
                  {
                    label: "ROAS / CPL",
                    value:
                      selectedClient.meta_data?.roas || selectedClient.meta_data?.cpl
                        ? `${selectedClient.meta_data?.roas ?? "--"}x / ${money(selectedClient.meta_data?.cpl)}`
                        : "--",
                    tone: "text-white",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="card-hover rounded-2xl border border-white/[0.08] bg-[#1a1a1f] p-4 transition-all duration-200 hover:border-white/[0.15]"
                  >
                    <div className={`text-xl font-bold ${item.tone}`}>{item.value}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="border-white/[0.06] bg-[#1a1a1f]">
                  <CardContent className="pt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-[#E8912D]" />
                      <div className="text-sm font-semibold text-white">Memoire strategique</div>
                      <Badge className="bg-white/[0.04] text-white/45">{strategies.length}</Badge>
                    </div>

                    {strategiesLoading ? (
                      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm text-white/35 transition-all duration-200 hover:border-white/[0.15]">
                        Chargement des strategies...
                      </div>
                    ) : strategies.length > 0 ? (
                      <div className="space-y-2.5">
                        {strategies.slice(0, 4).map((strategy, index) => (
                          <button
                            key={`${strategy.created_at || index}`}
                            type="button"
                            onClick={() => {
                              setStrategyView(strategy);
                              setView("strategy");
                            }}
                            className="card-hover w-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:border-white/[0.15]"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-white">
                                v{strategy.version || 1} - {shortDate(strategy.created_at)}
                              </div>
                              <Badge className="bg-[#E8912D]/10 text-[#f6c978]">Voir</Badge>
                            </div>
                            {strategy.strategy_summary ? (
                              <div className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">
                                {strategy.strategy_summary}
                              </div>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm text-white/35 transition-all duration-200 hover:border-white/[0.15]">
                        Aucune strategie archivee pour ce client.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card className="border-white/[0.06] bg-[#1a1a1f]">
                    <CardContent className="pt-5">
                      <div className="text-sm font-semibold text-white">Context coverage</div>
                      <p className="mt-1 text-xs leading-5 text-white/35">
                        Plus cette fiche est riche, moins le workflow a besoin de te reposer des questions.
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <div className="text-lg font-bold text-white">
                            {filledSourceFields}/{sourceFieldCount}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
                            Sources remplies
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <div className="text-lg font-bold text-[#f6c978]">
                            {filledMemoryFields}/{memoryFieldCount}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
                            Mémoire remplie
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <div className="text-lg font-bold text-green-300">
                            {connectedCount}/{connectorCards.length}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
                            Connecteurs actifs
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-white/[0.06] bg-[#1a1a1f]">
                    <CardContent className="pt-5">
                      <div className="mb-4 flex items-center gap-2">
                        <FileDown className="h-4 w-4 text-[#E8912D]" />
                        <div className="text-sm font-semibold text-white">Recent outputs</div>
                        <Badge className="bg-white/[0.04] text-white/45">{deliverableRuns.length}</Badge>
                      </div>
                      <ClientDeliverableRunList
                        docxLabel="DOCX"
                        downloadingRunKey={downloadingRunKey}
                        emptyLabel="Aucun livrable sauvegardé pour ce client."
                        formatDate={shortDate}
                        loading={runsLoading}
                        loadingLabel="Chargement des livrables..."
                        markdownLabel="Markdown"
                        onDownloadDocx={(run) => void downloadDeliverableRunDocx(run)}
                        onDownloadMarkdown={downloadDeliverableRunMarkdown}
                        onOpen={(run) => openDeliverableRun(run.id)}
                        openLabel="Ouvrir"
                        runs={deliverableRuns.slice(0, 4)}
                        runTypeLabel={runTypeLabel}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <Card className="border-white/[0.06] bg-[#1a1a1f]">
                  <CardContent className="pt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-[#E8912D]" />
                      <div className="text-sm font-semibold text-white">Connectors</div>
                    </div>
                    <p className="mb-4 text-xs leading-5 text-white/35">
                      On voit immédiatement quels connecteurs sont déjà branchés au client et où il
                      manque encore du contexte fort.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {connectorCards.map((connector) => (
                        <SourceStatusCard key={connector.label} {...connector} />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/[0.06] bg-[#1a1a1f]">
                  <CardContent className="pt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-300" />
                      <div className="text-sm font-semibold text-white">Signals</div>
                    </div>
                    {selectedFlags.length === 0 && selectedWins.length === 0 ? (
                      <div className="text-sm text-white/35">
                        Aucun signal majeur remonte ici pour le moment.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedFlags.map((flag, index) => (
                          <div
                            key={`flag-${index}`}
                            className="rounded-xl border border-red-500/15 bg-red-500/8 px-3 py-2 text-xs text-red-200"
                          >
                            {typeof flag === "string"
                              ? flag
                              : String((flag as Record<string, unknown>)?.msg ?? JSON.stringify(flag))}
                          </div>
                        ))}
                        {selectedWins.map((win, index) => (
                          <div
                            key={`win-${index}`}
                            className="rounded-xl border border-green-500/15 bg-green-500/8 px-3 py-2 text-xs text-green-200"
                          >
                            {typeof win === "string"
                              ? win
                              : String((win as Record<string, unknown>)?.msg ?? JSON.stringify(win))}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}

          {detailSection === "sources" ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-white/[0.06] bg-[#1a1a1f]">
                <CardContent className="pt-5">
                  <div className="mb-2 text-sm font-semibold text-white">Source inputs</div>
                  <p className="mb-5 text-sm text-white/35">
                    Le backend garde déjà les accès globaux quand ils existent. Ici, on mappe
                    surtout le bon client au bon compte, projet, canal, dossier ou URL.
                  </p>

                  <div className="mb-5 grid gap-3 md:grid-cols-3">
                    {[
                      {
                        body: "Site, profils sociaux, pages publiques.",
                        title: "1. URLs publiques",
                      },
                      {
                        body: "Meta, Google Ads, Asana, Slack, Drive.",
                        title: "2. IDs ou liens internes",
                      },
                      {
                        body: "Decks, notes, briefs, exports, captures.",
                        title: "3. Fichiers",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f6c978]">
                          {item.title}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-white/40">{item.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {contextBaseFields.map((field) => (
                      <div
                        key={field.key}
                        id={contextTargetId(field.key)}
                        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <label className="block text-xs text-white/45">{field.label}</label>
                          <Badge className="bg-white/[0.04] text-white/35">{field.accepts}</Badge>
                        </div>
                        <Input
                          type={field.type}
                          value={contextForm[field.key]}
                          onChange={(event) =>
                            setContextForm((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className="border-white/[0.08] bg-white/[0.04] text-sm"
                        />
                        <div className="mt-2 text-[11px] leading-5 text-white/35">
                          {field.helper}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4" id={contextTargetId("notes")}>
                    <label className="mb-1.5 block text-xs text-white/45">
                      Contexte rapide / notes
                    </label>
                    <textarea
                      value={contextForm.notes}
                      onChange={(event) =>
                        setContextForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      rows={7}
                      placeholder="Résumé court, notes récentes, sensitivités, contexte clé..."
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-[#E8912D]"
                    />
                  </div>

                  {(contextStatus || contextError) && (
                    <div
                      className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
                        contextError
                          ? "border-red-500/20 bg-red-500/10 text-red-200"
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                      }`}
                    >
                      {contextError ?? contextStatus}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      onClick={() => void saveClientContext()}
                      disabled={savingContext}
                      className="bg-[#E8912D] text-[#17140f] hover:bg-[#f0a94b]"
                    >
                      {savingContext ? (
                        <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Sauvegarder
                    </Button>
                    <Button
                      onClick={() => setContextForm(savedContextForm)}
                      variant="outline"
                      className="border-white/[0.06] text-white/55"
                    >
                      Reinitialiser
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="border-white/[0.06] bg-[#1a1a1f]">
                  <CardContent className="pt-5">
                    <div className="text-sm font-semibold text-white">URLs</div>
                    <p className="mt-2 text-sm leading-6 text-white/35">
                      Le plus rapide pour enrichir le contexte.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {referenceCards.map((reference) => (
                        <SourceStatusCard key={reference.label} {...reference} />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/[0.06] bg-[#1a1a1f]">
                  <CardContent className="pt-5">
                    <div className="text-sm font-semibold text-white">Fichiers</div>
                    <p className="mt-2 text-sm leading-6 text-white/35">
                      Upload les docs utiles. Ils remontent ensuite dans le contexte.
                    </p>

                    <div
                      id={contextTargetId("reference_files")}
                      className="mt-4 rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.02] p-4"
                    >
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-[#f6c978]">
                          {uploadingAssets ? (
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                          ) : (
                            <Upload className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {uploadingAssets ? "Upload..." : "Ajouter des fichiers"}
                          </div>
                          <div className="mt-1 text-xs leading-5 text-white/35">
                            PDF, DOCX, TXT, decks, briefs, captures. Max 50 MB.
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/[0.08] text-white/70"
                          onClick={openReferenceFilePicker}
                          disabled={uploadingAssets}
                        >
                          {uploadingAssets ? "Upload..." : "Choisir des fichiers"}
                        </Button>
                        <input
                          key={assetInputKey}
                          ref={assetInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.ppt,.pptx"
                          onChange={(event) => void uploadReferenceFiles(event)}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {(assetStatus || assetError) && (
                      <div
                        className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
                          assetError
                            ? "border-red-500/20 bg-red-500/10 text-red-200"
                            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                        }`}
                      >
                        {assetError ?? assetStatus}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">Fichiers</div>
                      <Badge className="bg-white/[0.04] text-white/45">{clientAssets.length}</Badge>
                    </div>

                    {assetsLoading ? (
                      <div className="mt-4 text-sm text-white/35">Chargement des fichiers...</div>
                    ) : clientAssets.length > 0 ? (
                      <div className="mt-4 space-y-2.5">
                        {clientAssets.map((asset) => (
                          <div
                            key={asset.path}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-[#f6c978]" />
                                  <div className="truncate text-sm font-semibold text-white">
                                    {asset.fileName}
                                  </div>
                                </div>
                                <div className="mt-2 text-xs leading-5 text-white/35">
                                  {[asset.contentType || "", fileSizeLabel(asset.sizeBytes), shortDate(asset.createdAt || undefined)]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {asset.signedUrl ? (
                                  <a
                                    href={asset.signedUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04] text-white/55 transition hover:text-white"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => void deleteReferenceFile(asset.path)}
                                  disabled={deletingAssetPath === asset.path}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-red-500/15 bg-red-500/8 text-red-200 transition hover:bg-red-500/12 disabled:opacity-60"
                                >
                                  {deletingAssetPath === asset.path ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white/35">
                        Aucun fichier de référence uploadé pour ce client.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-white/[0.06] bg-[#1a1a1f]">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-white">Prochains ajouts</div>
                      <Badge className="bg-white/[0.04] text-white/45">
                        {missingSourceCards.length}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/35">
                      Ce qu&apos;il faut ajouter ensuite.
                    </p>
                    <div className="mt-4 space-y-2.5">
                      {missingSourceCards.length > 0 ? (
                        missingSourceCards.slice(0, 6).map((item) => {
                          const Icon = item.icon;
                          return (
                            <div
                              key={item.label}
                              className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                            >
                              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04] text-white/35">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-white">{item.label}</span>
                                  <CircleAlert className="h-3.5 w-3.5 text-[#f6c978]" />
                                </div>
                                <div className="mt-1 text-xs leading-5 text-white/35">
                                  {item.description}
                                </div>
                                {item.onAction ? (
                                  <Button
                                    onClick={item.onAction}
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 border-[#E8912D]/20 text-[#f6c978] hover:bg-[#E8912D]/10"
                                  >
                                    {item.actionLabel || "Configurer"}
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                          <div className="flex items-center gap-2 font-medium">
                            <BadgeCheck className="h-4 w-4" />
                            Base contexte solide.
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {detailSection === "memory" ? (
            <div className="mt-6">
              <Card className="border-white/[0.06] bg-[#1a1a1f]">
                <CardContent className="pt-5">
                  <div className="mb-2 text-sm font-semibold text-white">Memoire client</div>
                  <p className="mb-5 text-sm text-white/35">
                    Cette memoire suit les prochains rapports, strategies et livrables.
                  </p>

                  <div className="space-y-6">
                    {memorySections.map((section) => (
                      <div
                        key={section.title}
                        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                      >
                        <div className="text-sm font-semibold text-white">{section.title}</div>
                        <p className="mt-1 text-xs leading-5 text-white/35">{section.description}</p>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          {section.fields.map((field) => (
                            <div
                              key={field.key}
                              className={field.rows && field.rows > 3 ? "md:col-span-2" : undefined}
                            >
                              <label className="mb-1.5 block text-xs text-white/45">
                                {field.label}
                              </label>
                              <textarea
                                value={contextForm[field.key]}
                                onChange={(event) =>
                                  setContextForm((current) => ({
                                    ...current,
                                    [field.key]: event.target.value,
                                  }))
                                }
                                rows={field.rows ?? 3}
                                placeholder={field.placeholder}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-[#E8912D]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {(contextStatus || contextError) && (
                    <div
                      className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
                        contextError
                          ? "border-red-500/20 bg-red-500/10 text-red-200"
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                      }`}
                    >
                      {contextError ?? contextStatus}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      onClick={() => void saveClientContext()}
                      disabled={savingContext}
                      className="bg-[#E8912D] text-[#17140f] hover:bg-[#f0a94b]"
                    >
                      {savingContext ? (
                        <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Sauvegarder la mémoire
                    </Button>
                    <Button
                      onClick={() => setContextForm(savedContextForm)}
                      variant="outline"
                      className="border-white/[0.06] text-white/55"
                    >
                      Reinitialiser
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {detailSection === "history" ? (
            <>
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <Card className="border-white/[0.06] bg-[#1a1a1f]">
                  <CardContent className="pt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-[#E8912D]" />
                      <div className="text-sm font-semibold text-white">Past strategies</div>
                      <Badge className="bg-white/[0.04] text-white/45">{strategies.length}</Badge>
                    </div>

                    {strategiesLoading ? (
                      <div className="text-sm text-white/35">Chargement des strategies...</div>
                    ) : strategies.length > 0 ? (
                      <div className="space-y-2.5">
                        {strategies.map((strategy, index) => (
                          <button
                            key={`${strategy.created_at || index}`}
                            type="button"
                            onClick={() => {
                              setStrategyView(strategy);
                              setView("strategy");
                            }}
                            className="card-hover w-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:border-white/[0.15]"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-white">
                                v{strategy.version || 1} - {shortDate(strategy.created_at)}
                              </div>
                              <Badge className="bg-[#E8912D]/10 text-[#f6c978]">Voir</Badge>
                            </div>
                            {strategy.strategy_summary ? (
                              <div className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">
                                {strategy.strategy_summary}
                              </div>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-white/35">Aucune strategie archivee pour ce client.</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-white/[0.06] bg-[#1a1a1f]">
                  <CardContent className="pt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <FileDown className="h-4 w-4 text-[#E8912D]" />
                      <div className="text-sm font-semibold text-white">Saved deliverables</div>
                      <Badge className="bg-white/[0.04] text-white/45">{deliverableRuns.length}</Badge>
                    </div>

                    <ClientDeliverableRunList
                      docxLabel="DOCX"
                      downloadingRunKey={downloadingRunKey}
                      emptyLabel="Aucun livrable sauvegardé pour ce client."
                      formatDate={shortDate}
                      loading={runsLoading}
                      loadingLabel="Chargement des livrables..."
                      markdownLabel="Markdown"
                      onDownloadDocx={(run) => void downloadDeliverableRunDocx(run)}
                      onDownloadMarkdown={downloadDeliverableRunMarkdown}
                      onOpen={(run) => openDeliverableRun(run.id)}
                      openLabel="Ouvrir"
                      runs={deliverableRuns}
                      runTypeLabel={runTypeLabel}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <Card className="border-white/[0.06] bg-[#1a1a1f]">
                  <CardContent className="pt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <NotebookPen className="h-4 w-4 text-[#E8912D]" />
                      <div className="text-sm font-semibold text-white">Notes</div>
                    </div>
                    {selectedNotes.length > 0 ? (
                      <div className="space-y-2.5">
                        {selectedNotes.slice(0, 6).map((note, index) => (
                          <div
                            key={`note-${index}`}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.15]"
                          >
                            <div className="text-[11px] uppercase tracking-[0.16em] text-white/28">
                              {shortDate(note.created_at)}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-white/58">
                              {extractNoteText(note)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-white/35">Aucune note disponible.</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-white/[0.06] bg-[#1a1a1f]">
                  <CardContent className="pt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[#E8912D]" />
                      <div className="text-sm font-semibold text-white">Activite recente</div>
                    </div>
                    {detailLoading ? (
                      <div className="text-sm text-white/35">Chargement de l&apos;activite...</div>
                    ) : selectedActivity.length > 0 ? (
                      <div className="space-y-2.5">
                        {selectedActivity.slice(0, 6).map((entry, index) => (
                          <div
                            key={`activity-${index}`}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.15]"
                          >
                            <div className="text-[11px] uppercase tracking-[0.16em] text-white/28">
                              {entry.type || "Activite"} - {shortDate(entry.created_at)}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-white/58">
                              {extractNoteText(entry)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-white/35">
                        Pas d&apos;activite recente disponible.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="overflow-x-hidden mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-10">
        <section className="rounded-[32px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.26)] md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E8912D]/20 bg-[#E8912D]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f6c978]">
                <FolderOpen className="h-3.5 w-3.5" />
                Dossiers clients
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white md:text-[40px]">
                Le contexte vit ici.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/45 md:text-[15px]">
                Connecteurs, URLs, mémoire, fichiers. Tout ce qui rend les outputs meilleurs.
              </p>
            </div>

            <div className="w-full max-w-xl space-y-3">
              <div className="relative">
                <Input
                  placeholder="Rechercher un client, une industrie ou un site..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-12 border-white/[0.08] bg-white/[0.04] text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {([
                  "all",
                  "active",
                  "paused",
                  "risk",
                  "missing_context",
                  "missing_connectors",
                ] as ClientListFilter[]).map((value) => (
                  <Button
                    key={value}
                    variant={filter === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(value)}
                    className={
                      filter === value
                        ? "bg-[#E8912D] text-[#17140f]"
                        : "border-white/[0.06] text-white/40"
                    }
                  >
                    {value === "all"
                      ? "Tous"
                      : value === "active"
                        ? "Actifs"
                        : value === "paused"
                          ? "Pauses"
                          : value === "risk"
                            ? "At Risk"
                            : value === "missing_context"
                              ? "Contexte incomplet"
                              : "Connecteurs manquants"}
                  </Button>
                ))}
              </div>
              <div className="text-xs text-white/32">
                {filteredClients.length} client{filteredClients.length > 1 ? "s" : ""} visible
                {search.trim() ? ` · recherche: ${search.trim()}` : ""}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              { label: "Clients actifs", value: stats.active.toString(), tone: "text-white" },
              { label: "Ad spend", value: money(stats.spend), tone: "text-green-300" },
              { label: "MRR", value: money(stats.mrr), tone: "text-[#f6c978]" },
              {
                label: "Contextes à compléter",
                value: listInsights.missingContext.toString(),
                tone: "text-[#f6c978]",
              },
              {
                label: "Connecteurs manquants",
                value: listInsights.missingConnectors.toString(),
                tone: "text-white",
              },
              {
                label: "Profils enrichis",
                value: listInsights.withReferenceContext.toString(),
                tone: "text-emerald-300",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/[0.06] bg-black/20 p-4"
              >
                <div className={`text-2xl font-semibold tracking-[-0.04em] ${item.tone}`}>
                  {item.value}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loadingClients ? (
            <div className="col-span-full rounded-2xl border border-white/[0.08] bg-[#1a1a1f] p-6 text-center text-sm text-white/35">
              Chargement des clients...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-white/[0.08] bg-[#1a1a1f] p-6 text-center text-sm text-white/35">
              Aucun client ne correspond aux filtres.
            </div>
          ) : (
            filteredClients.map((client) => {
              const score = clientReadinessScore(client);
              const tone = readinessTone(score);

              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => void openClient(client)}
                  className="group rounded-[28px] border border-white/[0.06] bg-[#15151a] p-5 text-left shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition hover:border-white/[0.14] hover:bg-[#19191f]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-white">{client.name}</div>
                      <div className="mt-1 text-sm text-white/34">
                        {client.industry || "Niche non definie"}
                      </div>
                    </div>
                    {openingClientId === client.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin text-[#E8912D]" />
                    ) : (
                      <Badge className={statusColor(client)}>{statusLabel(client)}</Badge>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-white/30">
                        Dossier readiness
                      </div>
                      <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
                        {score}%
                      </div>
                    </div>
                    <Badge className={tone.badge}>{tone.label}</Badge>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${score}%` }} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {client.website ? (
                      <Badge className="bg-emerald-500/10 text-emerald-300">Website</Badge>
                    ) : (
                      <Badge className="bg-white/[0.04] text-white/35">Website manquant</Badge>
                    )}
                    {hasConnectorMapping(client) ? (
                      <Badge className="bg-emerald-500/10 text-emerald-300">
                        {connectorCount(client)} connecteurs
                      </Badge>
                    ) : (
                      <Badge className="bg-white/[0.04] text-white/35">Connecteurs manquants</Badge>
                    )}
                    {client.notes ? (
                      <Badge className="bg-emerald-500/10 text-emerald-300">Notes chaudes</Badge>
                    ) : (
                      <Badge className="bg-white/[0.04] text-white/35">Notes manquantes</Badge>
                    )}
                  </div>

                  <div className="mt-4 text-sm leading-6 text-white/48">
                    {hasContextGap(client)
                      ? "Contexte encore incomplet. Ouvre le dossier pour enrichir les sources, la mémoire et les connecteurs."
                      : "Bonne base déjà en place pour générer des livrables plus solides et poser moins de questions."}
                  </div>

                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#f6c978] transition group-hover:text-white">
                    Ouvrir le dossier
                    <ExternalLink className="h-3.5 w-3.5" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
