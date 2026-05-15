"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Workflow,
} from "lucide-react";

import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/language-provider";
import { loadCurrentUserAccess } from "@/lib/current-user-access";
import { getLanguageLocale } from "@/lib/language";

type AutomationWorkflowRun = {
  finished: boolean;
  id: string;
  mode: string;
  startedAt?: string | null;
  status: string;
  stoppedAt?: string | null;
  workflowId: string;
};

type AutomationWorkflow = {
  active: boolean;
  apps: string[];
  createdAt?: string | null;
  health: string;
  id: string;
  isArchived: boolean;
  lastRun?: AutomationWorkflowRun | null;
  name: string;
  nodeCount: number;
  openUrl?: string | null;
  recentErrorCount: number;
  recentRunCount: number;
  recentRuns: AutomationWorkflowRun[];
  successRate: number;
  triggerLabels: string[];
  updatedAt?: string | null;
};

type AutomationsSnapshot = {
  editorBaseUrl?: string;
  error?: string;
  fetchedAt: string;
  reachable: boolean;
  recentRuns: AutomationWorkflowRun[];
  summary: {
    activeWorkflows: number;
    errorRuns: number;
    recentRuns: number;
    totalWorkflows: number;
  };
  workflows: AutomationWorkflow[];
};

type AutomationRequestStatus =
  | "pending"
  | "planned"
  | "in_progress"
  | "live"
  | "blocked"
  | "done";

type AutomationRequestRecord = {
  clientName: string;
  context: string;
  createdAt: string;
  createdBy: string;
  id: string;
  priority: "low" | "medium" | "high" | "urgent";
  requestedOutcome: string;
  status: AutomationRequestStatus;
  title: string;
  updatedAt: string;
  updatedBy: string;
};

type AutomationSignalRecord = {
  channel: string;
  createdAt: string;
  id: string;
  language: string;
  priority: "low" | "medium" | "high" | "urgent";
  requester: string;
  status: string;
  summary: string;
  title: string;
};

type RequestsResponse = {
  manualRequests: AutomationRequestRecord[];
  signalRequests: AutomationSignalRecord[];
  summary: {
    done: number;
    live: number;
    pending: number;
    signals: number;
  };
};

type RequestFormState = {
  clientName: string;
  context: string;
  priority: "low" | "medium" | "high" | "urgent";
  requestedOutcome: string;
  title: string;
};

const defaultForm: RequestFormState = {
  clientName: "",
  context: "",
  priority: "medium",
  requestedOutcome: "",
  title: "",
};

const copy = {
  en: {
    accessDenied: "Visible to admins only.",
    activate: "Activate",
    actions: "Actions",
    active: "Active",
    activeWorkflows: "Active workflows",
    addSignal: "Use as request draft",
    apps: "Apps",
    controlError: "Unable to update workflow state.",
    controlSaved: "Workflow updated.",
    create: "Create request",
    createError: "Unable to create automation request.",
    createHelp: "New automation or change request.",
    createTitle: "Automation requests",
    demandSignals: "Signals from Slack and internal ops",
    emptyRequests: "No internal automation requests yet.",
    emptySignals: "No incoming automation signals right now.",
    emptyWorkflows: "No automations found in n8n.",
    editor: "Open n8n",
    fetchedAt: "Last sync",
    formClient: "Client",
    formContext: "Extra context",
    formContextPlaceholder: "What matters, what should trigger it, constraints, approvals, links, connectors...",
    formOutcome: "Requested outcome",
    formOutcomePlaceholder: "Example: Create an Asana task from every meeting recap email and attach the brief.",
    formPriority: "Priority",
    formTitle: "Request title",
    formTitlePlaceholder: "Example: Meeting recap to Asana brief automation",
    heading: "Automations",
    healthError: "Error",
    healthInactive: "Inactive",
    healthLive: "Live",
    healthWarning: "Warning",
    incoming: "Incoming requests",
    internalQueue: "Internal queue",
    lastRun: "Last run",
    liveStatus: "Mark live",
    loadError: "Unable to load automations.",
    loading: "Loading automations...",
    noRun: "No runs yet",
    openWorkflow: "Open workflow",
    openInN8nToRun: "Manual runs still happen from n8n for this workflow type.",
    pause: "Pause",
    pendingStatus: "Backlog",
    plannedStatus: "Planned",
    recentRuns: "Recent runs",
    refresh: "Refresh",
    requestCount: "Open requests",
    requestsSaved: "Request created.",
    runCount: "Recent runs",
    runError: "Error",
    runSuccess: "Success",
    runUnknown: "Running",
    save: "Save",
    saveError: "Unable to update request.",
    saved: "Saved.",
    signals: "Signals",
    subtitle: "See what runs and what is next.",
    summary: "Summary",
    titleBadge: "Automations",
    totalWorkflows: "Total workflows",
    trigger: "Trigger",
  },
  fr: {
    accessDenied: "Visible pour les admins seulement.",
    activate: "Activer",
    actions: "Actions",
    active: "Actif",
    activeWorkflows: "Workflows actifs",
    addSignal: "Utiliser comme brouillon",
    apps: "Apps",
    controlError: "Impossible de mettre à jour l'état du workflow.",
    controlSaved: "Workflow mis à jour.",
    create: "Créer la demande",
    createError: "Impossible de créer la demande d'automatisation.",
    createHelp: "Nouvelle automation ou changement.",
    createTitle: "Demandes d'automatisation",
    demandSignals: "Signaux venant de Slack et des ops internes",
    emptyRequests: "Aucune demande d'automatisation interne pour le moment.",
    emptySignals: "Aucun signal entrant pour le moment.",
    emptyWorkflows: "Aucune automation trouvée dans n8n.",
    editor: "Ouvrir n8n",
    fetchedAt: "Dernière synchro",
    formClient: "Client",
    formContext: "Contexte supplémentaire",
    formContextPlaceholder: "Ce qui compte, ce qui déclenche, contraintes, approbations, liens, connecteurs...",
    formOutcome: "Résultat demandé",
    formOutcomePlaceholder: "Exemple: créer une tâche Asana à partir de chaque meeting recap email avec le brief attaché.",
    formPriority: "Priorité",
    formTitle: "Titre de la demande",
    formTitlePlaceholder: "Exemple: Automation meeting recap vers brief Asana",
    heading: "Automations",
    healthError: "Erreur",
    healthInactive: "Inactif",
    healthLive: "Live",
    healthWarning: "À surveiller",
    incoming: "Demandes entrantes",
    internalQueue: "Queue interne",
    lastRun: "Dernier run",
    liveStatus: "Marquer live",
    loadError: "Impossible de charger les automations.",
    loading: "Chargement des automations...",
    noRun: "Aucun run encore",
    openWorkflow: "Ouvrir le workflow",
    openInN8nToRun: "Les runs manuels passent encore par n8n pour ce type de workflow.",
    pause: "Pause",
    pendingStatus: "Backlog",
    plannedStatus: "Planifié",
    recentRuns: "Runs récents",
    refresh: "Rafraîchir",
    requestCount: "Demandes ouvertes",
    requestsSaved: "Demande créée.",
    runCount: "Runs récents",
    runError: "Erreur",
    runSuccess: "Succès",
    runUnknown: "En cours",
    save: "Sauvegarder",
    saveError: "Impossible de mettre à jour la demande.",
    saved: "Sauvegardé.",
    signals: "Signaux",
    subtitle: "Voir ce qui roule et ce qu'on build.",
    summary: "Résumé",
    titleBadge: "Automations",
    totalWorkflows: "Total workflows",
    trigger: "Trigger",
  },
} as const;

function formatDate(locale: string, value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusTone(status: string) {
  if (status === "success" || status === "done" || status === "live") {
    return "border-emerald-500/30 bg-emerald-500/12 text-emerald-200";
  }

  if (status === "error" || status === "blocked") {
    return "border-red-500/30 bg-red-500/12 text-red-200";
  }

  if (status === "warning" || status === "planned" || status === "in_progress") {
    return "border-amber-500/30 bg-amber-500/12 text-amber-200";
  }

  return "border-white/10 bg-white/[0.03] text-white/65";
}

function healthLabel(language: "fr" | "en", health: string) {
  const labels = copy[language];

  if (health === "error") return labels.healthError;
  if (health === "warning") return labels.healthWarning;
  if (health === "inactive" || health === "idle") return labels.healthInactive;
  return labels.healthLive;
}

function requestStatusLabel(language: "fr" | "en", status: AutomationRequestStatus) {
  const labels = copy[language];

  if (status === "planned") return labels.plannedStatus;
  if (status === "live") return labels.liveStatus;
  if (status === "done") return labels.runSuccess;
  if (status === "blocked") return labels.healthError;
  if (status === "in_progress") return labels.runUnknown;
  return labels.pendingStatus;
}

export default function AutomationsPage() {
  const { language } = useLanguage();
  const locale = getLanguageLocale(language);
  const labels = copy[language];
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<AutomationsSnapshot | null>(null);
  const [requests, setRequests] = useState<RequestsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RequestFormState>(defaultForm);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [savingRequest, setSavingRequest] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [workflowActionId, setWorkflowActionId] = useState<string | null>(null);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AutomationRequestStatus>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [automationsResponse, requestsResponse] = await Promise.all([
        fetch("/api/ops/automations", { cache: "no-store", credentials: "include" }),
        fetch("/api/ops/automation-requests", { cache: "no-store", credentials: "include" }),
      ]);

      const automationsJson = (await automationsResponse.json().catch(() => null)) as
        | (AutomationsSnapshot & { error?: string })
        | null;
      const requestsJson = (await requestsResponse.json().catch(() => null)) as
        | (RequestsResponse & { error?: string })
        | null;

      if (!automationsResponse.ok) {
        throw new Error(automationsJson?.error || labels.loadError);
      }

      if (!requestsResponse.ok) {
        throw new Error(requestsJson?.error || labels.loadError);
      }

      setSnapshot(automationsJson as AutomationsSnapshot);
      setRequests(requestsJson as RequestsResponse);
      setDraftStatuses(
        Object.fromEntries(
          ((requestsJson as RequestsResponse).manualRequests ?? []).map((request) => [
            request.id,
            request.status,
          ]),
        ),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : labels.loadError);
    } finally {
      setLoading(false);
    }
  }, [labels.loadError]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const access = await loadCurrentUserAccess();
      if (!active) {
        return;
      }

      setIsAdmin(access.isAdmin);

      if (!access.isAdmin) {
        setLoading(false);
        return;
      }

      await loadData();
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [loadData]);

  const summaryCards = useMemo(() => {
    if (!snapshot || !requests) {
      return [];
    }

    return [
      { label: labels.activeWorkflows, value: snapshot.summary.activeWorkflows.toString() },
      { label: labels.totalWorkflows, value: snapshot.summary.totalWorkflows.toString() },
      { label: labels.runCount, value: snapshot.summary.recentRuns.toString() },
      { label: labels.requestCount, value: requests.summary.pending.toString() },
    ];
  }, [labels.activeWorkflows, labels.requestCount, labels.runCount, labels.totalWorkflows, requests, snapshot]);

  const submitRequest = async () => {
    setSavingRequest(true);
    setFormMessage(null);

    try {
      const response = await fetch("/api/ops/automation-requests", {
        body: JSON.stringify(form),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const json = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(json?.error || labels.createError);
      }

      setForm(defaultForm);
      setFormMessage(labels.requestsSaved);
      await loadData();
    } catch (nextError) {
      setFormMessage(nextError instanceof Error ? nextError.message : labels.createError);
    } finally {
      setSavingRequest(false);
    }
  };

  const saveStatus = async (id: string) => {
    const nextStatus = draftStatuses[id];
    if (!nextStatus) {
      return;
    }

    setUpdatingId(id);
    setFormMessage(null);

    try {
      const response = await fetch("/api/ops/automation-requests", {
        body: JSON.stringify({ id, status: nextStatus }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const json = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(json?.error || labels.saveError);
      }

      setFormMessage(labels.saved);
      await loadData();
    } catch (nextError) {
      setFormMessage(nextError instanceof Error ? nextError.message : labels.saveError);
    } finally {
      setUpdatingId(null);
    }
  };

  const fillFromSignal = (signal: AutomationSignalRecord) => {
    setForm({
      clientName: "",
      context: `${signal.summary}\n\nChannel: ${signal.channel}\nRequester: ${signal.requester}`,
      priority: signal.priority,
      requestedOutcome: signal.summary,
      title: signal.title,
    });
  };

  const controlWorkflow = async (workflowId: string, action: "activate" | "deactivate") => {
    setWorkflowActionId(workflowId);
    setFormMessage(null);

    try {
      const response = await fetch("/api/ops/automations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, action }),
      });
      const json = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(json?.error || labels.controlError);
      }

      setFormMessage(labels.controlSaved);
      await loadData();
    } catch (nextError) {
      setFormMessage(nextError instanceof Error ? nextError.message : labels.controlError);
    } finally {
      setWorkflowActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)] p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E8912D]/20 bg-[#E8912D]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
                <Sparkles size={14} />
                {labels.titleBadge}
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                {labels.heading}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50 md:text-[15px]">
                {labels.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {snapshot?.editorBaseUrl ? (
                <Link href={snapshot.editorBaseUrl} target="_blank">
                  <Button variant="outline" className="border-white/[0.08] text-white/70">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {labels.editor}
                  </Button>
                </Link>
              ) : null}
              <Button
                variant="outline"
                className="border-white/[0.08] text-white/70"
                onClick={() => void loadData()}
                disabled={loading}
              >
                {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {labels.refresh}
              </Button>
            </div>
          </div>

          {isAdmin === false ? (
            <div className="mt-6 rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 text-sm text-white/55">
              {labels.accessDenied}
            </div>
          ) : loading ? (
            <div className="mt-6 text-sm text-white/50">{labels.loading}</div>
          ) : error ? (
            <div className="mt-6 rounded-3xl border border-red-500/25 bg-red-500/10 p-5 text-sm text-red-200">
              {error}
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-4">
                {summaryCards.map((item) => (
                  <Card key={item.label} className="border-white/[0.06] bg-[#15151a]">
                    <CardContent className="pt-5">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                        {item.label}
                      </div>
                      <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-indigo-300">
                        {item.value}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/38">
                <span>{labels.fetchedAt}: {snapshot ? formatDate(locale, snapshot.fetchedAt) : "—"}</span>
                {snapshot?.reachable ? (
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    n8n live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-300">
                    <TriangleAlert className="h-3.5 w-3.5" />
                    n8n offline
                  </span>
                )}
              </div>
            </>
          )}
        </section>

        {isAdmin ? (
          <section className="mt-8 grid gap-8">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <Card className="border-white/[0.06] bg-[#15151a]">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 text-white">
                    <Bot className="h-4 w-4 text-indigo-400" />
                    <h2 className="text-lg font-semibold">{labels.activeWorkflows}</h2>
                  </div>

                  <div className="mt-5 space-y-4">
                    {snapshot?.workflows?.length ? (
                      snapshot.workflows.map((workflow) => (
                        <div
                          key={workflow.id}
                          className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-base font-semibold text-white">{workflow.name}</div>
                                <Badge className={statusTone(workflow.health)}>
                                  {healthLabel(language, workflow.health)}
                                </Badge>
                                {workflow.active ? (
                                  <Badge className="border-emerald-500/20 bg-emerald-500/12 text-emerald-200">
                                    {labels.active}
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {workflow.triggerLabels.map((trigger) => (
                                  <Badge key={trigger} className="border-white/10 bg-white/[0.04] text-white/60">
                                    {labels.trigger}: {trigger}
                                  </Badge>
                                ))}
                                {workflow.apps.map((app) => (
                                  <Badge key={app} className="border-white/10 bg-white/[0.04] text-white/60">
                                    {app}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                className="border-white/[0.08] text-white/70"
                                disabled={workflowActionId === workflow.id}
                                onClick={() =>
                                  void controlWorkflow(
                                    workflow.id,
                                    workflow.active ? "deactivate" : "activate",
                                  )
                                }
                              >
                                {workflowActionId === workflow.id ? (
                                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {workflow.active ? labels.pause : labels.activate}
                              </Button>
                              {workflow.openUrl ? (
                                <Link href={workflow.openUrl} target="_blank">
                                  <Button variant="outline" className="border-white/[0.08] text-white/70">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    {labels.openWorkflow}
                                  </Button>
                                </Link>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-4">
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                                {labels.lastRun}
                              </div>
                              <div className="mt-2 text-sm text-white/75">
                                {workflow.lastRun ? formatDate(locale, workflow.lastRun.startedAt) : labels.noRun}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                                {labels.runCount}
                              </div>
                              <div className="mt-2 text-sm text-white/75">{workflow.recentRunCount}</div>
                            </div>
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                                Success
                              </div>
                              <div className="mt-2 text-sm text-white/75">{workflow.successRate}%</div>
                            </div>
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                                Nodes
                              </div>
                              <div className="mt-2 text-sm text-white/75">{workflow.nodeCount}</div>
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-white/38">{labels.openInN8nToRun}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-white/45">{labels.emptyWorkflows}</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/[0.06] bg-[#15151a]">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 text-white">
                    <Activity className="h-4 w-4 text-indigo-400" />
                    <h2 className="text-lg font-semibold">{labels.recentRuns}</h2>
                  </div>

                  <div className="mt-5 space-y-3">
                    {snapshot?.recentRuns?.length ? (
                      snapshot.recentRuns.map((run) => {
                        const workflowName =
                          snapshot.workflows.find((workflow) => workflow.id === run.workflowId)?.name ||
                          run.workflowId;

                        return (
                          <div
                            key={run.id}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-white">{workflowName}</div>
                                <div className="mt-1 text-xs text-white/40">
                                  {formatDate(locale, run.startedAt)}
                                </div>
                              </div>
                              <Badge className={statusTone(run.status)}>
                                {run.status === "success"
                                  ? labels.runSuccess
                                  : run.status === "error"
                                    ? labels.runError
                                    : labels.runUnknown}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-white/45">{labels.noRun}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="border-white/[0.06] bg-[#15151a]">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 text-white">
                    <Workflow className="h-4 w-4 text-indigo-400" />
                    <h2 className="text-lg font-semibold">{labels.createTitle}</h2>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/45">{labels.createHelp}</p>

                  <div className="mt-5 grid gap-4">
                    <Input
                      placeholder={labels.formTitlePlaceholder}
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    />
                    <Input
                      placeholder={labels.formClient}
                      value={form.clientName}
                      onChange={(event) => setForm((current) => ({ ...current, clientName: event.target.value }))}
                    />
                    <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                      <Textarea
                        placeholder={labels.formOutcomePlaceholder}
                        value={form.requestedOutcome}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, requestedOutcome: event.target.value }))
                        }
                        className="min-h-[120px]"
                      />
                      <select
                        value={form.priority}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            priority: event.target.value as RequestFormState["priority"],
                          }))
                        }
                        className="h-11 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <Textarea
                      placeholder={labels.formContextPlaceholder}
                      value={form.context}
                      onChange={(event) => setForm((current) => ({ ...current, context: event.target.value }))}
                      className="min-h-[150px]"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => void submitRequest()}
                      disabled={savingRequest}
                      className="bg-[#E8912D] text-[#18130a] hover:bg-[#f0a446]"
                    >
                      {savingRequest ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {labels.create}
                    </Button>
                    {formMessage ? <div className="text-sm text-white/50">{formMessage}</div> : null}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6">
                <Card className="border-white/[0.06] bg-[#15151a]">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-2 text-white">
                      <Workflow className="h-4 w-4 text-indigo-400" />
                      <h2 className="text-lg font-semibold">{labels.internalQueue}</h2>
                    </div>
                    <div className="mt-5 space-y-3">
                      {requests?.manualRequests?.length ? (
                        requests.manualRequests.map((request) => (
                          <div
                            key={request.id}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-white">{request.title}</div>
                                <div className="mt-1 text-xs text-white/38">
                                  {request.clientName || "—"} · {formatDate(locale, request.createdAt)}
                                </div>
                                <p className="mt-3 text-sm leading-6 text-white/55">
                                  {request.requestedOutcome}
                                </p>
                              </div>
                              <Badge className={statusTone(request.status)}>
                                {requestStatusLabel(language, request.status)}
                              </Badge>
                            </div>

                            {request.context ? (
                              <div className="mt-3 rounded-2xl border border-white/[0.05] bg-black/10 p-3 text-xs leading-6 text-white/40">
                                {request.context}
                              </div>
                            ) : null}

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <select
                                value={draftStatuses[request.id] ?? request.status}
                                onChange={(event) =>
                                  setDraftStatuses((current) => ({
                                    ...current,
                                    [request.id]: event.target.value as AutomationRequestStatus,
                                  }))
                                }
                                className="h-10 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none"
                              >
                                <option value="pending">{labels.pendingStatus}</option>
                                <option value="planned">{labels.plannedStatus}</option>
                                <option value="in_progress">{labels.runUnknown}</option>
                                <option value="live">{labels.healthLive}</option>
                                <option value="blocked">{labels.healthError}</option>
                                <option value="done">{labels.runSuccess}</option>
                              </select>
                              <Button
                                variant="outline"
                                className="border-white/[0.08] text-white/70"
                                onClick={() => void saveStatus(request.id)}
                                disabled={updatingId === request.id}
                              >
                                {updatingId === request.id ? (
                                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {labels.save}
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-white/45">{labels.emptyRequests}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/[0.06] bg-[#15151a]">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-2 text-white">
                      <TriangleAlert className="h-4 w-4 text-indigo-400" />
                      <h2 className="text-lg font-semibold">{labels.demandSignals}</h2>
                    </div>
                    <div className="mt-5 space-y-3">
                      {requests?.signalRequests?.length ? (
                        requests.signalRequests.map((signal) => (
                          <div
                            key={signal.id}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-white">{signal.title}</div>
                                <div className="mt-1 text-xs text-white/38">
                                  {signal.requester || "—"} · {signal.channel || "—"} · {formatDate(locale, signal.createdAt)}
                                </div>
                              </div>
                              <Badge className={statusTone(signal.priority)}>{signal.priority}</Badge>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-white/55">{signal.summary}</p>
                            <div className="mt-4">
                              <Button
                                variant="outline"
                                className="border-white/[0.08] text-white/70"
                                onClick={() => fillFromSignal(signal)}
                              >
                                {labels.addSignal}
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-white/45">{labels.emptySignals}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
