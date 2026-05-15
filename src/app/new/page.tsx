"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  FileText,
  LayoutPanelTop,
  Check,
  ChartColumnBig,
  Eye,
  FileDown,
  Lightbulb,
  LoaderCircle,
  Mail,
  Megaphone,
  MessageSquare,
  Palette,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

import { DeliverableViewer } from "@/components/deliverable-viewer";
import { useLanguage } from "@/components/language-provider";
import { Nav } from "@/components/nav";
import { getLanguageLocale } from "@/lib/language";
import { buildPrintableHtml, mdToHtml } from "@/lib/render-deliverable";
import {
  buildWorkflowClientCoverage,
  buildWorkflowContextBlock,
  type WorkflowClient,
  type WorkflowRun,
} from "@/lib/workflow-contract";
import {
  getWorkflowTask,
  getWorkflowTasksByFamily,
  localizeWorkflowTask,
  localizeWorkflowTaskFamily,
  type WorkflowTaskFamily,
  type WorkflowTaskFamilyDefinition,
  type WorkflowTaskDefinition,
  type WorkflowTaskQuestion,
  workflowTaskFamilies,
  workflowTasks,
} from "@/lib/workflow-tasks";

const C = {
  bg: "#0a0a0f",
  card: "#12121a",
  cardHover: "rgba(232,145,45,0.3)",
  orange: "#E8912D",
  orangeLight: "#f6c978",
  text: "rgba(255,255,255,0.75)",
  textMuted: "rgba(255,255,255,0.45)",
  textDim: "rgba(255,255,255,0.25)",
  border: "rgba(255,255,255,0.06)",
} as const;

const font = "'Instrument Sans', system-ui, sans-serif";

const basePageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const pageTrans = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const };

type StepId = "client" | "task" | "gaps" | "output";

const STEPS: StepId[] = ["client", "task", "gaps", "output"];

type WorkflowClientWithCoverage = WorkflowClient & {
  coverage: ReturnType<typeof buildWorkflowClientCoverage>;
};

type QuestionsResponse = {
  client: WorkflowClient;
  contextSnapshot: string;
  coverage: ReturnType<typeof buildWorkflowClientCoverage>;
  defaultAnswers?: Record<string, string>;
  nextBestContextAdds: string[];
  task: WorkflowTaskDefinition;
  warnings: string[];
};

type GenerateResponse = {
  output: string;
  run?: WorkflowRun | null;
  saveWarning?: string | null;
};

const flowCopy = {
  en: {
    badge: "New Flow",
    back: "← Back",
    changeFamily: "Change family",
    clientEmpty: "No clients found.",
    clientFallbackIndustry: "Industry not set",
    clientLabel: "Client",
    clientLoading: "Loading clients...",
    clientMissingSelection: "No client selected",
    clientQuestion: "Which client?",
    clientStepIntro: "Pick the client.",
    contextAvailable: "Available context",
    contextLight: "Light context",
    contextRecovered: "Context already pulled",
    coverageSuffix: "context",
    deliverableLabel: "Deliverable",
    deliverableTypeLabel: "Exact type",
    deliverableFallback: "Deliverable",
    exportError: "Failed to export DOCX.",
    familyLabel: "Family",
    familyQuestion: "What kind of work is this?",
    familyStepIntro: "Pick the work type.",
    gapsQuestion: "What is still missing?",
    gapsStepIntro: "Only the missing info.",
    nextContextAdds: "Best next context adds",
    generateError: "Failed to generate output.",
    generate: "Generate deliverable",
    generating: "Generating...",
    loadingQuestions: "Loading questions...",
    loadClientsError: "Failed to load clients.",
    loadQuestionsError: "Failed to load workflow questions.",
    missingPrefix: "missing",
    newDeliverable: "New deliverable",
    noContextFallback: "Context unavailable",
    open: "Open",
    openClient: "Open client dossier",
    outputQuestion: "Your deliverable is ready.",
    outputStepIntro: "Preview, export, move on.",
    profileBoostLabel: "Profile boost",
    questionCapLabel: "Quick questions",
    readTimeLabel: "Read time",
    recap: "Recap",
    readinessGenerateNow: "Ready now",
    readinessGenerateNowDesc:
      "We already have enough context to move fast. We can generate right away with no extra answers.",
    readinessLightContext: "Lean context",
    readinessLightContextDesc:
      "We can still move now, but the client dossier is light. Add durable context later to make the next runs stronger.",
    readinessQuickAnswers: "Quick pass",
    readinessQuickAnswersDesc:
      "We only need a few sharp answers for this run. Everything else is already coming from the client profile.",
    reset: "Reset",
    runLabel: "Run",
    runNotSaved: "Not saved",
    runSaved: "Saved in Runs",
    savedWarning: "Saved output warning",
    searchClients: "Search clients...",
    seeRuns: "See Runs",
    stepGaps: "Info",
    stepOutput: "Output",
    stepPrefix: "Step",
    stepCoverage: "Coverage",
    taskQuestion: "Which deliverable do you want to generate?",
    taskStepIntro: "Pick the exact deliverable.",
    tweakAnswers: "← Adjust answers",
  },
  fr: {
    badge: "Nouveau flow",
    back: "← Retour",
    changeFamily: "Changer de famille",
    clientEmpty: "Aucun client trouvé.",
    clientFallbackIndustry: "Aucune industrie définie",
    clientLabel: "Client",
    clientLoading: "Chargement des clients...",
    clientMissingSelection: "Aucun client sélectionné",
    clientQuestion: "Quel client?",
    clientStepIntro: "Choisis le client.",
    contextAvailable: "Contexte disponible",
    contextLight: "Contexte léger",
    contextRecovered: "Contexte déjà récupéré",
    coverageSuffix: "de contexte",
    deliverableLabel: "Livrable",
    deliverableTypeLabel: "Type exact",
    deliverableFallback: "Livrable",
    exportError: "Impossible d'exporter le DOCX.",
    familyLabel: "Famille",
    familyQuestion: "Quel type de travail veux-tu faire?",
    familyStepIntro: "Choisis le type de travail.",
    gapsQuestion: "Quelles infos manquent encore?",
    gapsStepIntro: "Seulement ce qui manque.",
    nextContextAdds: "Meilleurs prochains ajouts de contexte",
    generateError: "Impossible de générer le livrable.",
    generate: "Générer le livrable",
    generating: "Génération...",
    loadingQuestions: "Chargement des questions...",
    loadClientsError: "Impossible de charger les clients.",
    loadQuestionsError: "Impossible de charger les questions du workflow.",
    missingPrefix: "manquant",
    newDeliverable: "Nouveau livrable",
    noContextFallback: "Contexte indisponible",
    open: "Ouvrir",
    openClient: "Ouvrir le dossier client",
    outputQuestion: "Ton livrable est prêt.",
    outputStepIntro: "Prévisualise, exporte, avance.",
    profileBoostLabel: "Boost profil",
    questionCapLabel: "Questions rapides",
    readTimeLabel: "Temps de lecture",
    recap: "Récap",
    readinessGenerateNow: "Prêt tout de suite",
    readinessGenerateNowDesc:
      "On a déjà assez de contexte pour avancer vite. On peut générer sans te demander d'infos de plus.",
    readinessLightContext: "Contexte léger",
    readinessLightContextDesc:
      "On peut avancer maintenant, mais le dossier client reste mince. Ajoute du contexte durable ensuite pour renforcer les prochaines runs.",
    readinessQuickAnswers: "Passage rapide",
    readinessQuickAnswersDesc:
      "On a seulement besoin de quelques réponses ciblées pour cette run. Le reste vient déjà du profil client.",
    reset: "Reset",
    runLabel: "Run",
    runNotSaved: "Non sauvegardé",
    runSaved: "Sauvegardé dans Runs",
    savedWarning: "Avertissement de sauvegarde",
    searchClients: "Rechercher un client...",
    seeRuns: "Voir Runs",
    stepGaps: "Infos",
    stepOutput: "Sortie",
    stepPrefix: "Étape",
    stepCoverage: "Couverture",
    taskQuestion: "Quel livrable veux-tu générer?",
    taskStepIntro: "Choisis le livrable exact.",
    tweakAnswers: "← Ajuster les réponses",
  },
} as const;

function createPrintable(
  title: string,
  markdown: string,
  clientName: string,
  locale: string,
  language: "fr" | "en",
  deliverableType?: string,
) {
  const date = new Date().toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const html = buildPrintableHtml(markdown, title, clientName, date, deliverableType, language);
  const nextWindow = window.open("", "_blank");

  if (nextWindow) {
    nextWindow.document.write(html);
    nextWindow.document.close();
  }
}

function estimateReadingTime(content?: string | null) {
  if (!content) return "—";
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 180))} min`;
}

function defaultAnswersFor(task?: WorkflowTaskDefinition | null) {
  return Object.fromEntries(
    (task?.questions ?? []).map((question) => [
      question.id,
      question.type === "select" ? question.options?.[0]?.value ?? "" : "",
    ]),
  ) as Record<string, string>;
}

function formatQuestionCap(task: WorkflowTaskDefinition, language: "fr" | "en") {
  const count = task.questionCap ?? task.questions.length;

  if (language === "fr") {
    return `${count} question${count > 1 ? "s" : ""} max`;
  }

  return `${count} question${count > 1 ? "s" : ""} max`;
}

const taskIcons: Record<WorkflowTaskDefinition["icon"], LucideIcon> = {
  target: Target,
  fileText: FileText,
  chart: ChartColumnBig,
  palette: Palette,
  megaphone: Megaphone,
  messageSquare: MessageSquare,
  mail: Mail,
  layout: LayoutPanelTop,
  lightbulb: Lightbulb,
};

function buildReadinessState(
  bundle: QuestionsResponse,
  language: "fr" | "en",
  copy: (typeof flowCopy)[keyof typeof flowCopy],
) {
  const questionCount = bundle.task.questions.length;
  const profileBoostCount = bundle.nextBestContextAdds.length;
  const coverage = bundle.coverage.score;

  if (questionCount === 0 && coverage >= 60) {
    return {
      accent: "#86efac",
      background: "rgba(16,185,129,0.10)",
      border: "1px solid rgba(16,185,129,0.18)",
      label: copy.readinessGenerateNow,
      description: copy.readinessGenerateNowDesc,
      meta:
        language === "fr"
          ? "0 question avant génération"
          : "0 questions before generation",
    };
  }

  if (questionCount <= 2) {
    return {
      accent: "#fde68a",
      background: "rgba(245,158,11,0.10)",
      border: "1px solid rgba(245,158,11,0.18)",
      label: copy.readinessQuickAnswers,
      description: copy.readinessQuickAnswersDesc,
      meta:
        language === "fr"
          ? `${questionCount} réponse${questionCount > 1 ? "s" : ""} rapide${questionCount > 1 ? "s" : ""}`
          : `${questionCount} quick answer${questionCount > 1 ? "s" : ""}`,
    };
  }

  return {
    accent: C.text,
    background: "rgba(255,255,255,0.03)",
    border: `1px solid ${C.border}`,
    label: copy.readinessLightContext,
    description: copy.readinessLightContextDesc,
    meta:
      language === "fr"
        ? `${profileBoostCount} amélioration${profileBoostCount > 1 ? "s" : ""} de profil suggérée${profileBoostCount > 1 ? "s" : ""}`
        : `${profileBoostCount} profile improvement${profileBoostCount > 1 ? "s" : ""} suggested`,
  };
}

function ProgressBar(props: {
  current: number;
  labels: Record<StepId, string>;
  steps: StepId[];
}) {
  const { current, labels, steps } = props;
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;

  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          height: 3,
          borderRadius: 2,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            height: "100%",
            borderRadius: 2,
            background: `linear-gradient(90deg, ${C.orange}, ${C.orangeLight})`,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;

          return (
            <div
              key={step}
              aria-current={active ? "step" : undefined}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
            >
              <div
                style={{
                  width: active ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: done ? C.orange : active ? C.orange : "rgba(255,255,255,0.08)",
                  transition: "all 0.3s ease",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  color: active ? C.orangeLight : done ? C.textMuted : C.textDim,
                  fontFamily: font,
                }}
              >
                {labels[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContextChip(props: {
  client: WorkflowClientWithCoverage | null;
  task: WorkflowTaskDefinition | null;
}) {
  const { client, task } = props;
  const TaskIcon = task ? taskIcons[task.icon] : null;

  if (!client && !task) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {client ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 20,
            background: "rgba(232,145,45,0.08)",
            border: "1px solid rgba(232,145,45,0.2)",
            fontSize: 12,
            fontWeight: 600,
            color: C.orangeLight,
            fontFamily: font,
          }}
        >
          <div
            style={{ width: 6, height: 6, borderRadius: 3, background: C.orange }}
          />
          {client.name}
          {client.industry ? ` · ${client.industry}` : ""}
        </div>
      ) : null}
      {task ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${C.border}`,
            fontSize: 12,
            fontWeight: 600,
            color: C.text,
            fontFamily: font,
          }}
        >
          {TaskIcon ? <TaskIcon size={14} /> : null}
          {task.label}
        </div>
      ) : null}
    </div>
  );
}

function QuestionTitle(props: { text: string; highlight: string }) {
  const { text, highlight } = props;
  const parts = text.split(new RegExp(`(${highlight})`, "i"));

  return (
    <h1
      style={{
        fontSize: 28,
        fontWeight: 800,
        color: "#fff",
        fontFamily: font,
        lineHeight: 1.3,
        marginBottom: 8,
        letterSpacing: "-0.02em",
      }}
    >
      {parts.map((part, index) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={index} style={{ color: C.orange }}>
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </h1>
  );
}

function Surface(props: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 24,
        border: `1px solid ${C.border}`,
        background:
          "linear-gradient(180deg, rgba(18,18,26,0.98) 0%, rgba(12,12,18,0.98) 100%)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
        padding: 28,
      }}
    >
      {props.children}
    </div>
  );
}

function QuickActionButton(props: {
  href: string;
  label: string;
}) {
  const { href, label } = props;

  return (
    <button
      type="button"
      onClick={() => window.open(href, "_self")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${C.border}`,
        color: C.text,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: font,
      }}
    >
      {label}
    </button>
  );
}

function ClientCard(props: {
  client: WorkflowClientWithCoverage;
  coverageSuffix: string;
  industryFallback: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { client, coverageSuffix, industryFallback, isSelected, onClick } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        width: "100%",
        padding: "16px 18px",
        borderRadius: 16,
        cursor: "pointer",
        background: isSelected ? "rgba(232,145,45,0.08)" : C.card,
        border: `1.5px solid ${isSelected ? "rgba(232,145,45,0.45)" : "transparent"}`,
        transition: "all 0.18s ease",
        textAlign: "left",
        fontFamily: font,
      }}
      onMouseEnter={(event) => {
        if (!isSelected) event.currentTarget.style.borderColor = C.cardHover;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = isSelected
          ? "rgba(232,145,45,0.45)"
          : "transparent";
      }}
    >
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{client.name}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            {client.industry || industryFallback}
          </div>
        </div>
        <div
          style={{
            padding: "5px 10px",
            borderRadius: 999,
            border: `1px solid ${
              client.coverage.score >= 70
                ? "rgba(16,185,129,0.25)"
                : client.coverage.score >= 40
                  ? "rgba(245,158,11,0.22)"
                  : "rgba(255,255,255,0.08)"
            }`,
            background:
              client.coverage.score >= 70
                ? "rgba(16,185,129,0.10)"
                : client.coverage.score >= 40
                  ? "rgba(245,158,11,0.10)"
                  : "rgba(255,255,255,0.04)",
            color:
              client.coverage.score >= 70
                ? "#86efac"
                : client.coverage.score >= 40
                  ? "#fde68a"
                  : C.textMuted,
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {client.coverage.score}% {coverageSuffix}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {client.coverage.available.slice(0, 4).map((item) => (
          <span
            key={item}
            style={{
              padding: "4px 9px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${C.border}`,
              color: C.textMuted,
              fontSize: 11,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </button>
  );
}

function TaskFamilyCard(props: {
  family: WorkflowTaskFamilyDefinition;
  isSelected: boolean;
  onClick: () => void;
  taskCount: number;
}) {
  const { family, isSelected, onClick, taskCount } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 12,
        width: "100%",
        padding: "18px 20px",
        borderRadius: 18,
        cursor: "pointer",
        background: isSelected ? "rgba(232,145,45,0.08)" : C.card,
        border: `1.5px solid ${isSelected ? "rgba(232,145,45,0.45)" : "transparent"}`,
        transition: "all 0.2s ease",
        textAlign: "left",
        fontFamily: font,
      }}
      onMouseEnter={(event) => {
        if (!isSelected) event.currentTarget.style.borderColor = C.cardHover;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = isSelected
          ? "rgba(232,145,45,0.45)"
          : "transparent";
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${C.border}`,
          color: isSelected ? C.orangeLight : C.textMuted,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {taskCount} type{taskCount > 1 ? "s" : ""}
      </div>

      <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{family.label}</div>
      <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>{family.description}</div>
    </button>
  );
}

function TaskCard(props: {
  language: "fr" | "en";
  task: WorkflowTaskDefinition;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { language, task, isSelected, onClick } = props;
  const TaskIcon = taskIcons[task.icon];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        width: "100%",
        padding: "18px 20px",
        borderRadius: 16,
        cursor: "pointer",
        background: isSelected ? "rgba(232,145,45,0.08)" : C.card,
        border: `1.5px solid ${isSelected ? "rgba(232,145,45,0.5)" : "transparent"}`,
        transition: "all 0.2s ease",
        textAlign: "left",
        fontFamily: font,
      }}
      onMouseEnter={(event) => {
        if (!isSelected) event.currentTarget.style.borderColor = C.cardHover;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = isSelected
          ? "rgba(232,145,45,0.5)"
          : "transparent";
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isSelected ? "rgba(232,145,45,0.15)" : "rgba(255,255,255,0.04)",
        }}
      >
        <TaskIcon size={20} color={isSelected ? C.orangeLight : "rgba(255,255,255,0.72)"} />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 9px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${C.border}`,
            color: isSelected ? C.orangeLight : C.textMuted,
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          {formatQuestionCap(task, language)}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: isSelected ? "#fff" : "rgba(255,255,255,0.82)",
          }}
        >
          {task.label}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, lineHeight: 1.5 }}>
          {task.summary}
        </div>
      </div>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          flexShrink: 0,
          border: `2px solid ${isSelected ? C.orange : "rgba(255,255,255,0.12)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isSelected ? C.orange : "transparent",
        }}
      >
        {isSelected ? <Check size={12} color="#fff" /> : null}
      </div>
    </button>
  );
}

function SummaryRow(props: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: C.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontFamily: font,
        }}
      >
        {props.label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#fff",
          fontFamily: font,
          textAlign: "right",
        }}
      >
        {props.value || "—"}
      </span>
    </div>
  );
}

function QuestionField(props: {
  onChange: (value: string) => void;
  question: WorkflowTaskQuestion;
  value: string;
}) {
  const { onChange, question, value } = props;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#fff",
          fontFamily: font,
        }}
      >
        {question.label}
        {question.required ? <span style={{ marginLeft: 6, color: C.orange }}>*</span> : null}
      </label>
      {question.help ? (
        <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>{question.help}</p>
      ) : null}
      {question.type === "textarea" ? (
        <textarea
          rows={question.rows ?? 4}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={question.placeholder}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 16,
            resize: "vertical",
            background: C.card,
            border: `1.5px solid ${C.border}`,
            color: "#fff",
            fontSize: 14,
            fontFamily: font,
            lineHeight: 1.6,
            outline: "none",
            transition: "border-color 0.2s ease",
          }}
          onFocus={(event) => {
            event.currentTarget.style.borderColor = "rgba(232,145,45,0.4)";
          }}
          onBlur={(event) => {
            event.currentTarget.style.borderColor = C.border;
          }}
        />
      ) : question.type === "select" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {question.options?.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontFamily: font,
                  fontSize: 13,
                  fontWeight: 700,
                  background: isSelected ? "rgba(232,145,45,0.12)" : C.card,
                  border: `1.5px solid ${
                    isSelected ? "rgba(232,145,45,0.5)" : "transparent"
                  }`,
                  color: isSelected ? C.orangeLight : C.text,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(event) => {
                  if (!isSelected) event.currentTarget.style.borderColor = C.cardHover;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = isSelected
                    ? "rgba(232,145,45,0.5)"
                    : "transparent";
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={question.placeholder}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 14,
            background: C.card,
            border: `1.5px solid ${C.border}`,
            color: "#fff",
            fontSize: 14,
            fontFamily: font,
            outline: "none",
            transition: "border-color 0.2s ease",
          }}
          onFocus={(event) => {
            event.currentTarget.style.borderColor = "rgba(232,145,45,0.4)";
          }}
          onBlur={(event) => {
            event.currentTarget.style.borderColor = C.border;
          }}
        />
      )}
    </div>
  );
}

export default function NewWorkflowPage() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<WorkflowClientWithCoverage[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [step, setStep] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<WorkflowTaskFamily | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [questionBundle, setQuestionBundle] = useState<QuestionsResponse | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const reducedMotion = useReducedMotion();
  const pageVariants = reducedMotion
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : basePageVariants;
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [prefillApplied, setPrefillApplied] = useState(false);

  const locale = getLanguageLocale(language);
  const copy = flowCopy[language];
  const queryClientId = searchParams.get("clientId");
  const queryClientName = searchParams.get("clientName")?.trim().toLowerCase() || "";
  const queryTaskId = searchParams.get("taskId");
  const stepLabels = useMemo(
    () => ({
      client: copy.clientLabel,
      gaps: copy.stepGaps,
      output: copy.stepOutput,
      task: copy.deliverableLabel,
    }),
    [copy],
  );
  const localizedWorkflowTasks = useMemo(
    () => workflowTasks.map((task) => localizeWorkflowTask(task, language)),
    [language],
  );
  const localizedTaskFamilies = useMemo(
    () => workflowTaskFamilies.map((family) => localizeWorkflowTaskFamily(family, language)),
    [language],
  );
  const currentStepId = STEPS[step] ?? "client";
  const selectedTask = useMemo(() => {
    const task = getWorkflowTask(selectedTaskId);
    return task ? localizeWorkflowTask(task, language) : null;
  }, [language, selectedTaskId]);
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );
  const visibleTaskFamilies = useMemo(
    () =>
      localizedTaskFamilies.filter((family) =>
        localizedWorkflowTasks.some((task) => task.family === family.id),
      ),
    [localizedTaskFamilies, localizedWorkflowTasks],
  );
  const selectedFamily = useMemo(
    () => visibleTaskFamilies.find((family) => family.id === selectedTask?.family) ?? null,
    [selectedTask?.family, visibleTaskFamilies],
  );
  const visibleTasks = useMemo(() => {
    if (!selectedFamilyId) return [];
    return localizedWorkflowTasks.filter((task) => task.family === selectedFamilyId);
  }, [localizedWorkflowTasks, selectedFamilyId]);

  useEffect(() => {
    let active = true;

    const loadClients = async () => {
      setClientsLoading(true);
      setClientsError(null);

      try {
        const response = await fetch("/api/workflow/clients", { credentials: "include" });
        const data = (await response.json().catch(() => null)) as
          | { clients?: WorkflowClientWithCoverage[]; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(data?.error || copy.loadClientsError);
        }

        if (!active) return;
        setClients(Array.isArray(data?.clients) ? data.clients : []);
      } catch (error) {
        if (!active) return;
        setClientsError(error instanceof Error ? error.message : copy.loadClientsError);
      } finally {
        if (active) setClientsLoading(false);
      }
    };

    void loadClients();

    return () => {
      active = false;
    };
  }, [copy.loadClientsError]);

  useEffect(() => {
    if (prefillApplied || clientsLoading) {
      return;
    }

    const taskExists = queryTaskId ? Boolean(getWorkflowTask(queryTaskId)) : false;
    const matchedClient =
      clients.find((client) => client.id === queryClientId) ??
      (queryClientName
        ? clients.find((client) => client.name.trim().toLowerCase() === queryClientName)
        : null);

    if (matchedClient) {
      setSelectedClientId(matchedClient.id);
    }

    if (taskExists && queryTaskId) {
      setSelectedTaskId(queryTaskId);
      const nextTask = getWorkflowTask(queryTaskId);
      if (nextTask) {
        setSelectedFamilyId(nextTask.family);
      }
    }

    if (matchedClient && taskExists) {
      setStep(2);
    } else if (matchedClient) {
      setStep(1);
    }

    setPrefillApplied(true);
  }, [clients, clientsLoading, prefillApplied, queryClientId, queryClientName, queryTaskId]);

  useEffect(() => {
    if (!selectedTaskId) {
      return;
    }

    const task = getWorkflowTask(selectedTaskId);
    if (task) {
      setSelectedFamilyId(task.family);
    }
  }, [selectedTaskId]);

  useEffect(() => {
    if (!selectedClientId || !selectedTaskId) {
      setQuestionBundle(null);
      setQuestionsError(null);
      setAnswers(defaultAnswersFor(selectedTask));
      return;
    }

    let active = true;

    const loadQuestions = async () => {
      setQuestionsLoading(true);
      setQuestionsError(null);

      try {
        const params = new URLSearchParams({
          clientId: selectedClientId,
          lang: language,
          taskId: selectedTaskId,
        });
        const response = await fetch(`/api/workflow/questions?${params.toString()}`, {
          credentials: "include",
        });
        const data = (await response.json().catch(() => null)) as
          | QuestionsResponse
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : copy.loadQuestionsError,
          );
        }

        if (!active) return;
        setQuestionBundle(data as QuestionsResponse);
        setAnswers({
          ...defaultAnswersFor((data as QuestionsResponse).task),
          ...(((data as QuestionsResponse).defaultAnswers ?? {}) as Record<string, string>),
        });
      } catch (error) {
        if (!active) return;
        setQuestionsError(error instanceof Error ? error.message : copy.loadQuestionsError);
      } finally {
        if (active) setQuestionsLoading(false);
      }
    };

    void loadQuestions();

    return () => {
      active = false;
    };
  }, [copy.loadQuestionsError, language, selectedClientId, selectedTaskId, selectedTask]);

  const filteredClients = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    const base = needle
      ? clients.filter((client) =>
          [client.name, client.industry, client.website, client.notes]
            .filter((value): value is string => typeof value === "string")
            .some((value) => value.toLowerCase().includes(needle)),
        )
      : clients;

    return base.slice(0, needle ? 12 : 8);
  }, [clients, deferredSearch]);

  const canGenerate = Boolean(
    selectedClientId &&
      selectedTaskId &&
      questionBundle &&
      questionBundle.task.questions.every((question) => {
        if (!question.required) return true;
        return (answers[question.id] ?? "").trim().length > 0;
      }),
  );

  function back() {
    if (currentStepId === "output") {
      setStep(2);
      return;
    }

    setStep((current) => Math.max(current - 1, 0));
  }

  function resetFlow() {
    startTransition(() => {
      setStep(0);
      setSearch("");
      setSelectedClientId(null);
      setSelectedFamilyId(null);
      setSelectedTaskId(null);
      setQuestionBundle(null);
      setQuestionsError(null);
      setAnswers({});
      setOutput("");
      setRun(null);
      setSaveWarning(null);
      setGenerationError(null);
    });
  }

  async function handleGenerate() {
    if (!selectedClientId || !selectedTaskId) return;

    setGenerating(true);
    setGenerationError(null);
    setSaveWarning(null);
    setOutput("");
    setRun(null);

    try {
      const response = await fetch("/api/workflow/generate", {
        body: JSON.stringify({
          answers,
          clientId: selectedClientId,
          language,
          taskId: selectedTaskId,
        }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const data = (await response.json().catch(() => null)) as
        | (GenerateResponse & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(data?.error || copy.generateError);
      }

      setOutput(data?.output ?? "");
      setRun(data?.run ?? null);
      setSaveWarning(data?.saveWarning ?? null);
      setStep(3);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : copy.generateError);
    } finally {
      setGenerating(false);
    }
  }

  async function downloadDocx() {
    if (!output || !selectedClient || !selectedTask) return;

    const response = await fetch("/api/deliverable/export-docx", {
      body: JSON.stringify({
        client_name: selectedClient.name,
        content: output,
        industry: selectedClient.industry || "",
        language,
        type: selectedTask.id,
      }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(copy.exportError);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTask.id}_${selectedClient.name.replace(/\s+/g, "_")}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <Nav />
      <main
        style={{
          maxWidth: currentStepId === "output" ? 980 : 700,
          margin: "0 auto",
          padding: "40px 20px 80px",
        }}
      >
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <ContextChip client={selectedClient} task={selectedTask} />
          {(step > 0 || output) && (
            <span style={{ fontSize: 11, color: C.textDim, fontFamily: font }}>
              {copy.stepPrefix} {Math.min(step + 1, STEPS.length)} / {STEPS.length}
            </span>
          )}
        </div>

        {(step > 0 || output) && !output ? (
          <ProgressBar current={step} labels={stepLabels} steps={STEPS} />
        ) : null}

        <AnimatePresence mode="wait">
          {currentStepId === "client" && !output ? (
            <motion.div
              key="client"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTrans}
            >
              <Surface>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(232,145,45,0.08)",
                    border: "1px solid rgba(232,145,45,0.18)",
                    color: C.orangeLight,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  <Sparkles size={14} />
                  {copy.badge}
                </div>

                <QuestionTitle text={copy.clientQuestion} highlight="client" />
                <p
                  style={{
                    fontSize: 14,
                    color: C.textMuted,
                    marginBottom: 24,
                    lineHeight: 1.7,
                  }}
                >
                  {copy.clientStepIntro}
                </p>

                <div style={{ position: "relative", marginBottom: 18 }}>
                  <Search
                    size={16}
                    color={C.textMuted}
                    style={{ position: "absolute", left: 16, top: 14 }}
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={copy.searchClients}
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "12px 16px 12px 44px",
                      borderRadius: 14,
                      background: C.card,
                      border: `1.5px solid ${C.border}`,
                      color: "#fff",
                      fontSize: 15,
                      fontFamily: font,
                      outline: "none",
                    }}
                    onFocus={(event) => {
                      event.currentTarget.style.borderColor = "rgba(232,145,45,0.4)";
                    }}
                    onBlur={(event) => {
                      event.currentTarget.style.borderColor = C.border;
                    }}
                  />
                </div>

                {clientsLoading ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      padding: "28px 0",
                      color: C.textMuted,
                      fontSize: 13,
                    }}
                  >
                    <LoaderCircle size={16} className="animate-spin" />
                    {copy.clientLoading}
                  </div>
                ) : clientsError ? (
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#fca5a5",
                      fontSize: 13,
                    }}
                  >
                    {clientsError}
                  </div>
                ) : filteredClients.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredClients.map((client) => (
                      <ClientCard
                        key={client.id}
                        client={client}
                        coverageSuffix={copy.coverageSuffix}
                        industryFallback={copy.clientFallbackIndustry}
                        isSelected={client.id === selectedClientId}
                        onClick={() => {
                          startTransition(() => {
                            setSearch(client.name);
                            setSelectedClientId(client.id);
                            setSelectedFamilyId(null);
                            setSelectedTaskId(null);
                            setQuestionBundle(null);
                            setAnswers({});
                            setOutput("");
                            setRun(null);
                            setSaveWarning(null);
                            setGenerationError(null);
                            setStep(1);
                          });
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: "center", padding: "20px 0", color: C.textDim, fontSize: 13 }}>
                    {copy.clientEmpty}
                  </p>
                )}
              </Surface>
            </motion.div>
          ) : null}

          {currentStepId === "task" && !output ? (
            <motion.div
              key="task"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTrans}
            >
              <Surface>
                <QuestionTitle
                  text={selectedFamilyId ? copy.taskQuestion : copy.familyQuestion}
                  highlight={
                    selectedFamilyId
                      ? language === "fr"
                        ? "livrable"
                        : "deliverable"
                      : language === "fr"
                        ? "travail"
                        : "work"
                  }
                />
                <p
                  style={{
                    fontSize: 14,
                    color: C.textMuted,
                    marginBottom: 24,
                    lineHeight: 1.7,
                  }}
                >
                  {selectedFamilyId ? copy.taskStepIntro : copy.familyStepIntro}
                </p>

                <div
                  style={{
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${C.border}`,
                    padding: "16px 18px",
                    marginBottom: 20,
                  }}
                >
                  <SummaryRow
                    label={copy.clientLabel}
                    value={selectedClient?.name || copy.clientMissingSelection}
                  />
                  <SummaryRow
                    label={copy.stepCoverage}
                    value={
                      selectedClient
                        ? `${selectedClient.coverage.score}% ${copy.coverageSuffix}`
                        : "—"
                    }
                  />
                  <SummaryRow
                    label={copy.familyLabel}
                    value={
                      selectedFamilyId
                        ? localizedTaskFamilies.find((family) => family.id === selectedFamilyId)?.label || "—"
                        : language === "fr"
                          ? "À choisir"
                          : "To choose"
                    }
                  />
                </div>

                {!selectedFamilyId ? (
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    {visibleTaskFamilies.map((family) => (
                      <TaskFamilyCard
                        key={family.id}
                        family={family}
                        isSelected={family.id === selectedFamilyId}
                        taskCount={getWorkflowTasksByFamily(family.id).length}
                        onClick={() => {
                          startTransition(() => {
                            setSelectedFamilyId(family.id);
                            setSelectedTaskId(null);
                          });
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: C.orangeLight,
                            marginBottom: 6,
                          }}
                        >
                          {copy.familyLabel}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                          {localizedTaskFamilies.find((family) => family.id === selectedFamilyId)?.label}
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                          {localizedTaskFamilies.find((family) => family.id === selectedFamilyId)?.description}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFamilyId(null);
                          setSelectedTaskId(null);
                        }}
                        style={{
                          fontSize: 13,
                          color: C.textMuted,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: font,
                          fontWeight: 600,
                        }}
                      >
                        {copy.changeFamily}
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {visibleTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          language={language}
                          task={task}
                          isSelected={task.id === selectedTaskId}
                          onClick={() => {
                            startTransition(() => {
                              setSelectedTaskId(task.id);
                              setOutput("");
                              setRun(null);
                              setSaveWarning(null);
                              setGenerationError(null);
                              setStep(2);
                            });
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}

                <div style={{ marginTop: 24 }}>
                  <button
                    type="button"
                    onClick={back}
                    style={{
                      fontSize: 13,
                      color: C.textMuted,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: font,
                      fontWeight: 500,
                    }}
                  >
                    {copy.back}
                  </button>
                </div>
              </Surface>
            </motion.div>
          ) : null}

          {currentStepId === "gaps" && !output ? (
            <motion.div
              key="gaps"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTrans}
            >
              <Surface>
                <QuestionTitle
                  text={copy.gapsQuestion}
                  highlight={language === "fr" ? "infos" : "missing"}
                />
                <p
                  style={{
                    fontSize: 14,
                    color: C.textMuted,
                    marginBottom: 24,
                    lineHeight: 1.7,
                  }}
                >
                  {copy.gapsStepIntro}
                </p>

                <div
                  style={{
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${C.border}`,
                    padding: "16px 18px",
                    marginBottom: 20,
                  }}
                >
                  <SummaryRow label={copy.clientLabel} value={selectedClient?.name || "—"} />
                  <SummaryRow
                    label={copy.familyLabel}
                    value={
                      selectedFamilyId
                        ? localizedTaskFamilies.find((family) => family.id === selectedFamilyId)?.label || "—"
                        : "—"
                    }
                  />
                  <SummaryRow label={copy.deliverableTypeLabel} value={selectedTask?.label || "—"} />
                  <SummaryRow
                    label={copy.contextAvailable}
                    value={
                      selectedClient?.coverage.available.length
                        ? selectedClient.coverage.available.join(", ")
                        : copy.contextLight
                    }
                  />
                </div>

                {questionsLoading ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      padding: "28px 0",
                      color: C.textMuted,
                      fontSize: 13,
                    }}
                  >
                    <LoaderCircle size={16} className="animate-spin" />
                    {copy.loadingQuestions}
                  </div>
                ) : questionsError ? (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#fca5a5",
                      fontSize: 13,
                    }}
                  >
                    {questionsError}
                  </div>
                ) : questionBundle ? (
                  <>
                    {(() => {
                      const readiness = buildReadinessState(questionBundle, language, copy);

                      return (
                        <div
                          style={{
                            marginBottom: 18,
                            padding: "16px 18px",
                            borderRadius: 16,
                            background: readiness.background,
                            border: readiness.border,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 10,
                              flexWrap: "wrap",
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: readiness.accent,
                                letterSpacing: "0.02em",
                              }}
                            >
                              {readiness.label}
                            </div>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 10px",
                                borderRadius: 999,
                                background: "rgba(255,255,255,0.05)",
                                border: `1px solid ${C.border}`,
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {copy.questionCapLabel}: {formatQuestionCap(questionBundle.task, language)}
                            </div>
                          </div>
                          <div
                            style={{
                              color: C.text,
                              fontSize: 13,
                              lineHeight: 1.7,
                              marginBottom: 10,
                            }}
                          >
                            {readiness.description}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                padding: "5px 10px",
                                borderRadius: 999,
                                background: "rgba(255,255,255,0.05)",
                                border: `1px solid ${C.border}`,
                                color: C.text,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {readiness.meta}
                            </span>
                            {questionBundle.nextBestContextAdds.length > 0 ? (
                              <span
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: 999,
                                  background: "rgba(255,255,255,0.05)",
                                  border: `1px solid ${C.border}`,
                                  color: C.text,
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                {copy.profileBoostLabel}: {questionBundle.nextBestContextAdds.length}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })()}

                    {questionBundle.warnings.length > 0 ? (
                      <div
                        style={{
                          marginBottom: 18,
                          padding: "14px 16px",
                          borderRadius: 14,
                          background: "rgba(245,158,11,0.08)",
                          border: "1px solid rgba(245,158,11,0.18)",
                          color: "#fde68a",
                          fontSize: 13,
                          lineHeight: 1.7,
                        }}
                      >
                        {questionBundle.warnings.map((warning) => (
                          <div key={warning}>{warning}</div>
                        ))}
                      </div>
                    ) : null}

                    {questionBundle.nextBestContextAdds.length > 0 ? (
                      <div
                        style={{
                          marginBottom: 18,
                          padding: "14px 16px",
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.03)",
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: C.orangeLight,
                            marginBottom: 10,
                          }}
                        >
                          {copy.nextContextAdds}
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {questionBundle.nextBestContextAdds.map((item) => (
                            <div
                              key={item}
                              style={{
                                color: C.text,
                                fontSize: 13,
                                lineHeight: 1.7,
                                padding: "10px 12px",
                                borderRadius: 12,
                                background: "rgba(255,255,255,0.025)",
                                border: `1px solid ${C.border}`,
                              }}
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                        {selectedClient ? (
                          <div style={{ marginTop: 12 }}>
                            <QuickActionButton
                              href={`/clients?clientId=${encodeURIComponent(selectedClient.id)}`}
                              label={copy.openClient}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                      {questionBundle.task.questions.map((question) => (
                        <QuestionField
                          key={question.id}
                          question={question}
                          value={answers[question.id] ?? ""}
                          onChange={(value) =>
                            setAnswers((current) => ({
                              ...current,
                              [question.id]: value,
                            }))
                          }
                        />
                      ))}
                    </div>

                    <details
                      style={{
                        marginTop: 22,
                        borderRadius: 16,
                        border: `1px solid ${C.border}`,
                        background: "rgba(255,255,255,0.02)",
                        overflow: "hidden",
                      }}
                    >
                      <summary
                        style={{
                          cursor: "pointer",
                          listStyle: "none",
                          padding: "14px 16px",
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: C.orangeLight,
                        }}
                      >
                        {copy.contextRecovered}
                      </summary>
                      <div style={{ padding: "0 16px 16px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                          {selectedClient?.coverage.available.map((item) => (
                            <span
                              key={item}
                              style={{
                                padding: "4px 9px",
                                borderRadius: 999,
                                background: "rgba(16,185,129,0.08)",
                                border: "1px solid rgba(16,185,129,0.16)",
                                color: "#86efac",
                                fontSize: 11,
                              }}
                            >
                              {item}
                            </span>
                          ))}
                          {selectedClient?.coverage.missing.slice(0, 4).map((item) => (
                            <span
                              key={item}
                              style={{
                                padding: "4px 9px",
                                borderRadius: 999,
                                background: "rgba(255,255,255,0.04)",
                                border: `1px solid ${C.border}`,
                                color: C.textMuted,
                                fontSize: 11,
                              }}
                            >
                              {copy.missingPrefix}: {item}
                            </span>
                          ))}
                        </div>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            borderRadius: 14,
                            border: `1px solid ${C.border}`,
                            background: "#101015",
                            padding: 14,
                            fontSize: 12,
                            lineHeight: 1.7,
                            color: "rgba(255,255,255,0.52)",
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          }}
                        >
                          {questionBundle.contextSnapshot ||
                            (selectedClient
                              ? buildWorkflowContextBlock(selectedClient)
                              : copy.noContextFallback)}
                        </pre>
                      </div>
                    </details>
                  </>
                ) : null}

                {generationError ? (
                  <div
                    style={{
                      marginTop: 18,
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#fca5a5",
                      fontSize: 13,
                    }}
                  >
                    {generationError}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 24,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={back}
                    style={{
                      fontSize: 13,
                      color: C.textMuted,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: font,
                      fontWeight: 500,
                    }}
                  >
                    {copy.back}
                  </button>

                  <div role="status" aria-live="polite" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={resetFlow}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "11px 16px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${C.border}`,
                        color: C.text,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: font,
                      }}
                    >
                      <RotateCcw size={14} />
                      {copy.reset}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleGenerate()}
                      disabled={!canGenerate || generating}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "11px 18px",
                        borderRadius: 12,
                        background:
                          canGenerate && !generating
                            ? `linear-gradient(135deg, ${C.orange}, #d4800f)`
                            : "rgba(255,255,255,0.06)",
                        border: "none",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: canGenerate && !generating ? "pointer" : "not-allowed",
                        fontFamily: font,
                        opacity: canGenerate && !generating ? 1 : 0.5,
                      }}
                    >
                      {generating ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <ArrowRight size={14} />
                      )}
                      {generating ? copy.generating : copy.generate}
                    </button>
                  </div>
                </div>
              </Surface>
            </motion.div>
          ) : null}

          {currentStepId === "output" && output ? (
            <motion.div
              key="output"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTrans}
            >
              <Surface>
                <QuestionTitle
                  text={copy.outputQuestion}
                  highlight={language === "fr" ? "livrable" : "deliverable"}
                />
                <p
                  style={{
                    fontSize: 14,
                    color: C.textMuted,
                    marginBottom: 24,
                    lineHeight: 1.7,
                  }}
                >
                  {copy.outputStepIntro}
                </p>

                {saveWarning ? (
                  <div
                    style={{
                      marginBottom: 18,
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.18)",
                      color: "#fde68a",
                      fontSize: 13,
                    }}
                  >
                    {copy.savedWarning}: {saveWarning}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "grid",
                    gap: 20,
                    alignItems: "start",
                    gridTemplateColumns: "minmax(0, 1fr)",
                  }}
                >
                  <DeliverableViewer
                    actions={
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedClient || !selectedTask) return;
                            createPrintable(
                              `${selectedTask.label} — ${selectedClient.name}`,
                              output,
                              selectedClient.name,
                              locale,
                              language,
                              selectedTask.id,
                            );
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 14px",
                            borderRadius: 12,
                            background: "rgba(255,255,255,0.04)",
                            border: `1px solid ${C.border}`,
                            color: C.text,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: font,
                          }}
                        >
                          <Eye size={14} />
                          {copy.open}
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadDocx()}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 14px",
                            borderRadius: 12,
                            background: "rgba(255,255,255,0.04)",
                            border: `1px solid ${C.border}`,
                            color: C.text,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: font,
                          }}
                        >
                          <FileDown size={14} />
                          DOCX
                        </button>
                        {selectedClient ? (
                          <QuickActionButton
                            href={`/clients?clientId=${encodeURIComponent(selectedClient.id)}`}
                            label={copy.openClient}
                          />
                        ) : null}
                        <QuickActionButton href="/runs" label={copy.seeRuns} />
                      </>
                    }
                    contentHtml={mdToHtml(output, "light")}
                    eyebrow={selectedTask?.label || copy.deliverableFallback}
                    meta={[
                      {
                        label: copy.runLabel,
                        value: run?.created_at
                          ? new Date(run.created_at).toLocaleDateString(locale)
                          : copy.runNotSaved,
                      },
                      {
                        label: copy.readTimeLabel,
                        value: estimateReadingTime(output),
                      },
                    ]}
                    subtitle={selectedFamily?.label || copy.familyLabel}
                    title={selectedClient?.name || copy.clientMissingSelection}
                    viewportMaxHeight={860}
                  />

                  <div
                    style={{
                      borderRadius: 18,
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${C.border}`,
                      padding: 18,
                    }}
                  >
                    <div style={{ fontSize: 12, color: C.orangeLight, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {copy.recap}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <SummaryRow label={copy.clientLabel} value={selectedClient?.name || "—"} />
                      <SummaryRow
                        label={copy.familyLabel}
                        value={
                          selectedFamilyId
                            ? localizedTaskFamilies.find((family) => family.id === selectedFamilyId)?.label || "—"
                            : "—"
                        }
                      />
                      <SummaryRow
                        label={copy.deliverableTypeLabel}
                        value={selectedTask?.label || "—"}
                      />
                      <SummaryRow
                        label={copy.runLabel}
                        value={run?.id ? copy.runSaved : copy.runNotSaved}
                      />
                    </div>
                    <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {selectedClient?.coverage.available.map((item) => (
                        <span
                          key={item}
                          style={{
                            padding: "4px 9px",
                            borderRadius: 999,
                            background: "rgba(16,185,129,0.08)",
                            border: "1px solid rgba(16,185,129,0.16)",
                            color: "#86efac",
                            fontSize: 11,
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={back}
                      style={{
                        fontSize: 13,
                        color: C.textMuted,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: font,
                        fontWeight: 500,
                      }}
                    >
                      {copy.tweakAnswers}
                    </button>
                    <button
                      type="button"
                      onClick={resetFlow}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "11px 16px",
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${C.orange}, #d4800f)`,
                        border: "none",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: font,
                      }}
                    >
                      <RotateCcw size={14} />
                      {copy.newDeliverable}
                    </button>
                  </div>
                </div>
              </Surface>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
