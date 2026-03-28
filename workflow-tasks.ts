import type { ClientMemoryForm } from "@/lib/client-memory";
import type { CommandCenterLanguage } from "@/lib/language";
import { hasWorkflowManualContext, type WorkflowClient } from "@/lib/workflow-contract";

export type WorkflowTaskQuestionType = "text" | "textarea" | "select";
export type WorkflowTaskFamily =
  | "strategy"
  | "summary"
  | "reporting"
  | "creative"
  | "copywriting"
  | "email"
  | "content";

export type WorkflowTaskQuestion = {
  defaultValue?: string;
  help?: string;
  id: string;
  label: string;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  priority?: number;
  required?: boolean;
  rows?: number;
  type: WorkflowTaskQuestionType;
};

export type WorkflowTaskDefinition = {
  description: string;
  family: WorkflowTaskFamily;
  icon: string;
  id: string;
  label: string;
  outputLabel: string;
  promptFlavor: "strategy" | "summary" | "report" | "brief" | "copy" | "email" | "content";
  questionCap: number;
  questions: WorkflowTaskQuestion[];
  summary: string;
};

export type WorkflowTaskResolution = {
  defaultAnswers: Record<string, string>;
  profileContextNeeds: string[];
  task: WorkflowTaskDefinition;
  warnings: string[];
};

export const workflowTasks: WorkflowTaskDefinition[] = [
  {
    description: "Turns your meeting context into a strategy deliverable.",
    family: "strategy",
    icon: "🎯",
    id: "strategy_360",
    label: "Strategy 360",
    outputLabel: "Growth strategy",
    promptFlavor: "strategy",
    questionCap: 3,
    questions: [
      {
        id: "objective",
        label: "Main objective",
        placeholder: "What should this strategy accomplish over the next quarter?",
        priority: 1,
        required: true,
        rows: 3,
        type: "textarea",
      },
      {
        id: "offer",
        label: "Current offer or priority service",
        placeholder: "Offer, positioning, package, or flagship service to center the strategy on.",
        priority: 2,
        rows: 3,
        type: "textarea",
      },
      {
        id: "constraints",
        label: "Constraints or non-negotiables",
        placeholder: "Budget realities, timelines, client sensitivities, market constraints, approvals, etc.",
        priority: 3,
        rows: 3,
        type: "textarea",
      },
      {
        defaultValue: "90_days",
        id: "time_horizon",
        label: "Planning horizon",
        options: [
          { label: "30 days", value: "30_days" },
          { label: "90 days", value: "90_days" },
          { label: "180 days", value: "180_days" },
        ],
        priority: 4,
        required: true,
        type: "select",
      },
    ],
    summary: "Structured growth plan grounded in client context and meeting notes.",
  },
  {
    description: "Creates a concise briefing document you can drop into follow-up work.",
    family: "summary",
    icon: "🧾",
    id: "client_summary",
    label: "Client Summary",
    outputLabel: "Client summary",
    promptFlavor: "summary",
    questionCap: 2,
    questions: [
      {
        id: "meeting_notes",
        label: "Meeting notes",
        placeholder: "Paste the key points, decisions, objections, and action items from the meeting.",
        priority: 1,
        required: true,
        rows: 6,
        type: "textarea",
      },
      {
        id: "priority_focus",
        label: "Priority focus",
        placeholder: "What should the summary emphasize most?",
        priority: 2,
        rows: 3,
        type: "textarea",
      },
    ],
    summary: "Executive-style recap with priorities, risks, and next actions.",
  },
  {
    description: "Generates a report-style recommendations deliverable for the client.",
    family: "reporting",
    icon: "📊",
    id: "performance_report",
    label: "Performance Report",
    outputLabel: "Performance report",
    promptFlavor: "report",
    questionCap: 2,
    questions: [
      {
        defaultValue: "leadgen",
        id: "report_type",
        label: "Report type",
        options: [
          { label: "Lead Gen", value: "leadgen" },
          { label: "E-commerce", value: "ecommerce" },
          { label: "Coaching / High Ticket", value: "coach" },
          { label: "Multi-channel", value: "multicanal" },
          { label: "Social Organic", value: "social" },
          { label: "Video", value: "video" },
        ],
        priority: 2,
        required: true,
        type: "select",
      },
      {
        defaultValue: "30_days",
        id: "period",
        label: "Timeframe",
        options: [
          { label: "Last 30 days", value: "30_days" },
          { label: "Last 60 days", value: "60_days" },
          { label: "Last 90 days", value: "90_days" },
        ],
        priority: 3,
        required: true,
        type: "select",
      },
      {
        id: "focus",
        label: "Special focus",
        placeholder: "Call out the main concern, KPI, campaign, or meeting theme this report should focus on.",
        priority: 1,
        rows: 4,
        type: "textarea",
      },
    ],
    summary: "Recommendations-driven report tuned to the client and the meeting context.",
  },
  {
    description: "Turns context into a sharper brief for creative and media production.",
    family: "creative",
    icon: "🎨",
    id: "creative_brief",
    label: "Creative Brief",
    outputLabel: "Creative brief",
    promptFlavor: "brief",
    questionCap: 3,
    questions: [
      {
        id: "campaign_goal",
        label: "Campaign goal",
        placeholder: "What should the creative accomplish?",
        priority: 1,
        required: true,
        rows: 3,
        type: "textarea",
      },
      {
        id: "offer",
        label: "Offer / hook",
        placeholder: "What is the offer, promise, or conversion target?",
        priority: 2,
        required: true,
        rows: 3,
        type: "textarea",
      },
      {
        id: "audience",
        label: "Target audience",
        placeholder: "Who are we speaking to and what matters most to them?",
        priority: 3,
        rows: 3,
        type: "textarea",
      },
      {
        id: "channels",
        label: "Channels / placements",
        placeholder: "Meta, TikTok, YouTube, landing page, email, etc.",
        priority: 4,
        rows: 2,
        type: "textarea",
      },
    ],
    summary: "Creative direction, messaging, formats, and production guidance.",
  },
  {
    description: "Creates ad copy variants aligned to the meeting and client context.",
    family: "copywriting",
    icon: "✍️",
    id: "ad_copy",
    label: "Ad Copy",
    outputLabel: "Ad copy package",
    promptFlavor: "copy",
    questionCap: 3,
    questions: [
      {
        id: "platform",
        label: "Platform",
        options: [
          { label: "Meta", value: "meta" },
          { label: "Google", value: "google" },
          { label: "TikTok", value: "tiktok" },
          { label: "LinkedIn", value: "linkedin" },
        ],
        priority: 1,
        required: true,
        type: "select",
      },
      {
        id: "goal",
        label: "Primary conversion goal",
        placeholder: "Lead, booking, purchase, application, download, etc.",
        priority: 2,
        required: true,
        rows: 2,
        type: "textarea",
      },
      {
        id: "offer",
        label: "Offer / CTA",
        placeholder: "What exactly are we asking people to do?",
        priority: 3,
        rows: 2,
        type: "textarea",
      },
      {
        id: "tone",
        label: "Tone or angle",
        placeholder: "Direct response, founder-led, educational, premium, urgent, etc.",
        priority: 4,
        rows: 2,
        type: "textarea",
      },
    ],
    summary: "Headline, body, hook, and CTA variations for the chosen channel.",
  },
  {
    description: "Builds an email sequence from the client context and the meeting outcome.",
    family: "email",
    icon: "📧",
    id: "email_sequence",
    label: "Email Sequence",
    outputLabel: "Email sequence",
    promptFlavor: "email",
    questionCap: 2,
    questions: [
      {
        defaultValue: "nurture",
        id: "sequence_type",
        label: "Sequence type",
        options: [
          { label: "Welcome", value: "welcome" },
          { label: "Nurture", value: "nurture" },
          { label: "Promo", value: "promo" },
          { label: "Reactivation", value: "reactivation" },
        ],
        priority: 3,
        required: true,
        type: "select",
      },
      {
        id: "goal",
        label: "Goal",
        placeholder: "What result should this sequence drive?",
        priority: 1,
        required: true,
        rows: 3,
        type: "textarea",
      },
      {
        id: "offer",
        label: "Offer or narrative thread",
        placeholder: "What should the sequence revolve around?",
        priority: 2,
        rows: 3,
        type: "textarea",
      },
      {
        defaultValue: "5",
        id: "email_count",
        label: "Email count",
        options: [
          { label: "3 emails", value: "3" },
          { label: "5 emails", value: "5" },
          { label: "7 emails", value: "7" },
        ],
        priority: 4,
        required: true,
        type: "select",
      },
    ],
    summary: "Sequenced subject lines, angles, and email body outlines.",
  },
  {
    description: "Turns context into a practical list of content ideas and hooks.",
    family: "content",
    icon: "💡",
    id: "content_ideas",
    label: "Content Ideas",
    outputLabel: "Content idea set",
    promptFlavor: "content",
    questionCap: 2,
    questions: [
      {
        id: "platforms",
        label: "Platforms",
        placeholder: "Where will this content live?",
        priority: 1,
        required: true,
        rows: 2,
        type: "textarea",
      },
      {
        id: "focus",
        label: "What should the content support?",
        placeholder: "Lead gen, objection handling, authority, launch support, retention, etc.",
        priority: 2,
        required: true,
        rows: 3,
        type: "textarea",
      },
      {
        id: "seasonal_notes",
        label: "Timing or seasonal notes",
        placeholder: "Any launch windows, promos, deadlines, or calendar context to account for?",
        priority: 3,
        rows: 2,
        type: "textarea",
      },
    ],
    summary: "Hooks, angles, and post ideas that map to the meeting priorities.",
  },
];

type WorkflowTaskResolutionInput = {
  assetsCount: number;
  client: WorkflowClient;
  language: CommandCenterLanguage;
  memory?: Partial<ClientMemoryForm> | null;
};

type WorkflowTaskSignals = {
  hasAdsConnector: boolean;
  hasAssets: boolean;
  hasAudience: boolean;
  hasConstraints: boolean;
  hasCreativeHistory: boolean;
  hasFunnelContext: boolean;
  hasManualContext: boolean;
  hasOffer: boolean;
  hasOperationalConnector: boolean;
  hasPerformanceSnapshot: boolean;
  hasSeasonality: boolean;
  hasSocialPresence: boolean;
  hasStrategyMemory: boolean;
  hasTone: boolean;
  hasWebsite: boolean;
};

function t(language: CommandCenterLanguage, fr: string, en: string) {
  return language === "fr" ? fr : en;
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function unique(values: Array<string | null | undefined>) {
  return values.filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
}

function inferReportType(client: WorkflowClient) {
  const industry = normalizeText(client.industry);
  const meta = client.meta_data;

  if (typeof meta?.purchases === "number" && meta.purchases > 0) return "ecommerce";
  if (typeof meta?.conv_value === "number" && meta.conv_value > 0) return "ecommerce";
  if (industry.includes("ecom") || industry.includes("shop") || industry.includes("retail")) {
    return "ecommerce";
  }
  if (industry.includes("coach") || industry.includes("consult") || industry.includes("high ticket")) {
    return "coach";
  }
  if (industry.includes("video") || industry.includes("youtube")) return "video";
  if (industry.includes("social")) return "social";

  return "leadgen";
}

function inferAdPlatform(client: WorkflowClient) {
  const hasMeta = hasText(client.meta_account_id);
  const hasGoogle = hasText(client.google_ads_customer_id);

  if (hasMeta && !hasGoogle) return "meta";
  if (hasGoogle && !hasMeta) return "google";
  if (hasText(client.tiktok_url) && !hasMeta && !hasGoogle) return "tiktok";
  if (hasText(client.linkedin_url) && !hasMeta && !hasGoogle) return "linkedin";

  return "";
}

function inferContentPlatforms(client: WorkflowClient) {
  const platforms = [
    hasText(client.instagram_url) || hasText(client.facebook_url) || hasText(client.meta_account_id)
      ? "Meta / Instagram"
      : null,
    hasText(client.tiktok_url) ? "TikTok" : null,
    hasText(client.youtube_url) ? "YouTube" : null,
    hasText(client.linkedin_url) ? "LinkedIn" : null,
    hasText(client.website) ? "Website / Blog" : null,
  ];

  return unique(platforms).slice(0, 3).join(", ");
}

function buildTaskSignals(client: WorkflowClient, memory?: Partial<ClientMemoryForm> | null, assetsCount = 0): WorkflowTaskSignals {
  return {
    hasAdsConnector: hasText(client.meta_account_id) || hasText(client.google_ads_customer_id),
    hasAssets: assetsCount > 0,
    hasAudience:
      hasText(memory?.idealCustomerProfile) ||
      hasText(memory?.painPoints) ||
      hasText(memory?.objections),
    hasConstraints: hasText(memory?.knownConstraints) || hasText(client.notes),
    hasCreativeHistory:
      hasText(memory?.pastWinningAngles) ||
      hasText(memory?.bestCreativeFormats) ||
      hasText(memory?.pastLosingAngles),
    hasFunnelContext:
      hasText(memory?.salesProcess) ||
      hasText(memory?.followUpProcess) ||
      hasText(memory?.crmUsed),
    hasManualContext: hasWorkflowManualContext(client),
    hasOffer:
      hasText(memory?.mainOffer) ||
      hasText(memory?.flagshipOffer) ||
      hasText(memory?.differentiators),
    hasOperationalConnector:
      hasText(client.asana_project_id) ||
      hasText(client.google_drive_folder_id) ||
      hasText(client.slack_channel_id),
    hasPerformanceSnapshot:
      typeof client.meta_data?.spend === "number" ||
      typeof client.meta_data?.leads === "number" ||
      typeof client.meta_data?.purchases === "number" ||
      typeof client.meta_data?.roas === "number",
    hasSeasonality: hasText(memory?.seasonalityNotes),
    hasSocialPresence:
      hasText(client.facebook_url) ||
      hasText(client.instagram_url) ||
      hasText(client.tiktok_url) ||
      hasText(client.youtube_url) ||
      hasText(client.linkedin_url),
    hasStrategyMemory:
      hasText(memory?.previousStrategyNotes) ||
      hasText(memory?.internalContextNotes) ||
      hasText(memory?.pastWinningAngles),
    hasTone: hasText(memory?.toneOfVoice) || hasText(memory?.brandGuidelines),
    hasWebsite: hasText(client.website),
  };
}

function buildTaskQuestionIds(taskId: string, signals: WorkflowTaskSignals, client: WorkflowClient) {
  switch (taskId) {
    case "strategy_360":
      return [
        !signals.hasManualContext && !signals.hasStrategyMemory ? "objective" : null,
        !signals.hasOffer ? "offer" : null,
        !signals.hasConstraints ? "constraints" : null,
      ];
    case "client_summary":
      return [
        !signals.hasManualContext && !signals.hasAssets ? "meeting_notes" : null,
        !signals.hasManualContext && !signals.hasStrategyMemory ? "priority_focus" : null,
      ];
    case "performance_report":
      return [
        !signals.hasManualContext ? "focus" : null,
        !signals.hasPerformanceSnapshot && !signals.hasAdsConnector ? "report_type" : null,
      ];
    case "creative_brief":
      return [
        "campaign_goal",
        !signals.hasOffer ? "offer" : null,
        !signals.hasAudience ? "audience" : null,
        !signals.hasAdsConnector && !signals.hasSocialPresence ? "channels" : null,
      ];
    case "ad_copy":
      return [
        !inferAdPlatform(client) ? "platform" : null,
        !signals.hasManualContext ? "goal" : null,
        !signals.hasOffer ? "offer" : null,
        !signals.hasTone ? "tone" : null,
      ];
    case "email_sequence":
      return [
        !signals.hasManualContext ? "goal" : null,
        !signals.hasOffer ? "offer" : null,
        !signals.hasFunnelContext ? "sequence_type" : null,
      ];
    case "content_ideas":
      return [
        !inferContentPlatforms(client) ? "platforms" : null,
        !signals.hasManualContext ? "focus" : null,
        !signals.hasSeasonality ? "seasonal_notes" : null,
      ];
    default:
      return [];
  }
}

function buildTaskProfileNeeds(taskId: string, signals: WorkflowTaskSignals, language: CommandCenterLanguage) {
  const shared = [
    !signals.hasWebsite
      ? t(language, "Ajoute le site web dans le dossier client pour enrichir le contexte de base.", "Add the client website in the dossier to enrich the baseline context.")
      : null,
    !signals.hasManualContext
      ? t(language, "Sauvegarde des notes rapides ou un recap de meeting dans le profil client.", "Save quick notes or a meeting recap in the client profile.")
      : null,
    !signals.hasOffer
      ? t(language, "Complète l’offre principale ou l’offre phare dans la mémoire client.", "Fill in the main offer or flagship offer in client memory.")
      : null,
    !signals.hasAudience
      ? t(language, "Ajoute l’ICP, les objections ou les pain points pour mieux cadrer les messages.", "Add ICP, objections, or pain points to sharpen the messaging.")
      : null,
    !signals.hasTone && (taskId === "ad_copy" || taskId === "email_sequence" || taskId === "content_ideas")
      ? t(language, "Ajoute le tone of voice ou les brand guidelines pour stabiliser les livrables rédactionnels.", "Add tone of voice or brand guidelines to stabilize writing deliverables.")
      : null,
    !signals.hasPerformanceSnapshot && taskId === "performance_report"
      ? t(language, "Mappe Meta Ads ou Google Ads pour obtenir de vrais signaux de performance.", "Map Meta Ads or Google Ads to pull real performance signals.")
      : null,
    !signals.hasAssets && (taskId === "client_summary" || taskId === "strategy_360")
      ? t(language, "Upload des notes d’appel, decks ou briefs pour enrichir les prochaines runs.", "Upload call notes, decks, or briefs to strengthen future runs.")
      : null,
    !signals.hasCreativeHistory && (taskId === "creative_brief" || taskId === "ad_copy" || taskId === "content_ideas")
      ? t(language, "Ajoute les angles gagnants ou formats créatifs performants dans la mémoire client.", "Add winning angles or proven creative formats in client memory.")
      : null,
  ];

  return unique(shared).slice(0, 4);
}

function buildTaskWarnings(taskId: string, signals: WorkflowTaskSignals, language: CommandCenterLanguage, questionCount: number) {
  const warnings = [
    questionCount === 0
      ? t(language, "Le profil client est assez riche: on peut générer sans autre question.", "The client profile is rich enough to generate without more questions.")
      : null,
    !signals.hasManualContext && !signals.hasAssets
      ? t(language, "Le résultat risque d’être plus générique tant qu’aucune note récente n’est liée au client.", "The result may stay more generic until recent notes are tied to the client.")
      : null,
    taskId === "performance_report" && !signals.hasPerformanceSnapshot
      ? t(language, "Aucun snapshot performance solide n’est détecté: le rapport sera plus interprétatif que d’habitude.", "No strong performance snapshot is detected, so the report will be more interpretive than usual.")
      : null,
    (taskId === "ad_copy" || taskId === "email_sequence") && !signals.hasOffer
      ? t(language, "Sans offre claire dans le profil client, la rédaction sera moins précise.", "Without a clear offer in the client profile, the copy will be less precise.")
      : null,
  ];

  return unique(warnings).slice(0, 3);
}

export function resolveWorkflowTask(
  task: WorkflowTaskDefinition,
  input: WorkflowTaskResolutionInput,
): WorkflowTaskResolution {
  const localizedTask = localizeWorkflowTask(task, input.language);
  const signals = buildTaskSignals(input.client, input.memory, input.assetsCount);
  const explicitQuestionIds = buildTaskQuestionIds(task.id, signals, input.client);
  const questionIds = new Set(unique(explicitQuestionIds));
  const defaultAnswers = localizedTask.questions.reduce<Record<string, string>>((accumulator, question) => {
    if (question.defaultValue) {
      accumulator[question.id] = question.defaultValue;
    }

    return accumulator;
  }, {});

  if (task.id === "performance_report") {
    defaultAnswers.report_type = inferReportType(input.client);
  }

  if (task.id === "ad_copy") {
    const inferredPlatform = inferAdPlatform(input.client);
    if (inferredPlatform) {
      defaultAnswers.platform = inferredPlatform;
    }
  }

  if (task.id === "content_ideas") {
    const inferredPlatforms = inferContentPlatforms(input.client);
    if (inferredPlatforms) {
      defaultAnswers.platforms = inferredPlatforms;
    }
  }

  const filteredQuestions = localizedTask.questions
    .filter((question) => questionIds.has(question.id))
    .sort((left, right) => (left.priority ?? 99) - (right.priority ?? 99))
    .slice(0, localizedTask.questionCap);

  const warnings = buildTaskWarnings(task.id, signals, input.language, filteredQuestions.length);
  const profileContextNeeds = buildTaskProfileNeeds(task.id, signals, input.language);

  return {
    defaultAnswers,
    profileContextNeeds,
    task: {
      ...localizedTask,
      questions: filteredQuestions,
    },
    warnings,
  };
}

export function getWorkflowTask(taskId?: string | null) {
  return workflowTasks.find((task) => task.id === taskId) ?? null;
}

type WorkflowTaskTranslation = {
  description?: string;
  label?: string;
  outputLabel?: string;
  questions?: Record<
    string,
    Partial<Omit<WorkflowTaskQuestion, "id" | "type">> & {
      options?: Array<{ label: string; value: string }>;
    }
  >;
  summary?: string;
};

const frWorkflowTaskTranslations: Record<string, WorkflowTaskTranslation> = {
  strategy_360: {
    description: "Transforme le contexte du meeting en livrable stratégique.",
    label: "Stratégie 360",
    outputLabel: "Stratégie de croissance",
    summary: "Plan de croissance structuré à partir du contexte client et des notes de meeting.",
    questions: {
      objective: {
        label: "Objectif principal",
        placeholder: "Que doit accomplir cette stratégie au cours du prochain trimestre ?",
      },
      offer: {
        label: "Offre actuelle ou service prioritaire",
        placeholder:
          "Offre, positionnement, package ou service phare à placer au centre de la stratégie.",
      },
      constraints: {
        label: "Contraintes ou non-négociables",
        placeholder:
          "Budget, délais, sensibilités client, contraintes marché, validations, etc.",
      },
      time_horizon: {
        label: "Horizon de planification",
        options: [
          { label: "30 jours", value: "30_days" },
          { label: "90 jours", value: "90_days" },
          { label: "180 jours", value: "180_days" },
        ],
      },
    },
  },
  client_summary: {
    description: "Crée un briefing concis à réutiliser après le meeting.",
    label: "Résumé client",
    outputLabel: "Résumé client",
    summary: "Récap exécutif avec priorités, risques et prochaines étapes.",
    questions: {
      meeting_notes: {
        label: "Notes du meeting",
        placeholder:
          "Colle ici les points clés, décisions, objections et actions à retenir du meeting.",
      },
      priority_focus: {
        label: "Angle prioritaire",
        placeholder: "Que doit-on mettre en avant dans ce résumé ?",
      },
    },
  },
  performance_report: {
    description: "Génère un livrable de recommandations orienté performance.",
    label: "Rapport de performance",
    outputLabel: "Rapport de performance",
    summary: "Rapport de recommandations ajusté au client et au meeting.",
    questions: {
      report_type: {
        label: "Type de rapport",
        options: [
          { label: "Lead Gen", value: "leadgen" },
          { label: "E-commerce", value: "ecommerce" },
          { label: "Coaching / High Ticket", value: "coach" },
          { label: "Multi-canal", value: "multicanal" },
          { label: "Social organique", value: "social" },
          { label: "Vidéo", value: "video" },
        ],
      },
      period: {
        label: "Période",
        options: [
          { label: "30 derniers jours", value: "30_days" },
          { label: "60 derniers jours", value: "60_days" },
          { label: "90 derniers jours", value: "90_days" },
        ],
      },
      focus: {
        label: "Focus particulier",
        placeholder:
          "Précise le KPI, la campagne, l’enjeu ou le thème du meeting sur lequel le rapport doit insister.",
      },
    },
  },
  creative_brief: {
    description: "Transforme le contexte en brief plus net pour la créa et le média.",
    label: "Brief créatif",
    outputLabel: "Brief créatif",
    summary: "Direction créative, messages, formats et guidance de production.",
    questions: {
      campaign_goal: {
        label: "Objectif de campagne",
        placeholder: "Que doit accomplir cette création ?",
      },
      offer: {
        label: "Offre / hook",
        placeholder: "Quelle est l’offre, la promesse ou la cible de conversion ?",
      },
      audience: {
        label: "Audience cible",
        placeholder: "À qui parle-t-on et qu’est-ce qui compte le plus pour eux ?",
      },
      channels: {
        label: "Canaux / placements",
        placeholder: "Meta, TikTok, YouTube, landing page, email, etc.",
      },
    },
  },
  ad_copy: {
    description: "Crée des variantes de copy alignées au meeting et au contexte client.",
    label: "Copy pub",
    outputLabel: "Pack de copy pub",
    summary: "Hooks, body copy et CTA pour le canal choisi.",
    questions: {
      platform: {
        label: "Plateforme",
        options: [
          { label: "Meta", value: "meta" },
          { label: "Google", value: "google" },
          { label: "TikTok", value: "tiktok" },
          { label: "LinkedIn", value: "linkedin" },
        ],
      },
      goal: {
        label: "Objectif de conversion principal",
        placeholder: "Lead, booking, achat, application, téléchargement, etc.",
      },
      offer: {
        label: "Offre / CTA",
        placeholder: "Qu’est-ce qu’on demande précisément aux gens de faire ?",
      },
      tone: {
        label: "Ton ou angle",
        placeholder: "Direct response, founder-led, éducatif, premium, urgent, etc.",
      },
    },
  },
  email_sequence: {
    description: "Construit une séquence email à partir du contexte client et du meeting.",
    label: "Séquence email",
    outputLabel: "Séquence email",
    summary: "Sujets, angles et structure des emails.",
    questions: {
      sequence_type: {
        label: "Type de séquence",
        options: [
          { label: "Bienvenue", value: "welcome" },
          { label: "Nurture", value: "nurture" },
          { label: "Promo", value: "promo" },
          { label: "Réactivation", value: "reactivation" },
        ],
      },
      goal: {
        label: "Objectif",
        placeholder: "Quel résultat cette séquence doit-elle générer ?",
      },
      offer: {
        label: "Offre ou fil narratif",
        placeholder: "Autour de quoi la séquence doit-elle tourner ?",
      },
      email_count: {
        label: "Nombre d’emails",
        options: [
          { label: "3 emails", value: "3" },
          { label: "5 emails", value: "5" },
          { label: "7 emails", value: "7" },
        ],
      },
    },
  },
  content_ideas: {
    description: "Transforme le contexte en liste concrète d’idées et de hooks.",
    label: "Idées de contenu",
    outputLabel: "Set d’idées de contenu",
    summary: "Hooks, angles et idées de posts liés aux priorités du meeting.",
    questions: {
      platforms: {
        label: "Plateformes",
        placeholder: "Où ce contenu va-t-il vivre ?",
      },
      focus: {
        label: "Que doit soutenir ce contenu ?",
        placeholder:
          "Lead gen, gestion des objections, autorité, lancement, rétention, etc.",
      },
      seasonal_notes: {
        label: "Notes de timing ou saisonnalité",
        placeholder:
          "Y a-t-il un lancement, une promo, une deadline ou un contexte calendrier à prendre en compte ?",
      },
    },
  },
};

export function localizeWorkflowTask(
  task: WorkflowTaskDefinition,
  language: CommandCenterLanguage,
): WorkflowTaskDefinition {
  if (language !== "fr") {
    return task;
  }

  const translation = frWorkflowTaskTranslations[task.id];

  if (!translation) {
    return task;
  }

  return {
    ...task,
    description: translation.description ?? task.description,
    label: translation.label ?? task.label,
    outputLabel: translation.outputLabel ?? task.outputLabel,
    questions: task.questions.map((question) => {
      const translatedQuestion = translation.questions?.[question.id];

      return {
        ...question,
        ...translatedQuestion,
        options: translatedQuestion?.options ?? question.options,
      };
    }),
    summary: translation.summary ?? task.summary,
  };
}
