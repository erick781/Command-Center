"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FolderKanban,
  LoaderCircle,
  MessageSquare,
  NotebookPen,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  meta_data?: ClientMeta;
  asana_project_id?: string;
  slack_channel_id?: string;
  google_drive_folder_id?: string;
  visibility?: string;
  notes?: string;
  client_notes?: ClientNote[] | null;
  client_activity?: ClientActivity[] | null;
};

type ViewMode = "list" | "detail" | "strategy";

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

function extractNoteText(entry: ClientNote | ClientActivity | undefined | null) {
  if (!entry) return "";
  if ("content" in entry && typeof entry.content === "string") return entry.content;
  if ("note" in entry && typeof entry.note === "string") return entry.note;
  if ("text" in entry && typeof entry.text === "string") return entry.text;
  if ("title" in entry && typeof entry.title === "string") return entry.title;
  return "";
}

export default function ClientsPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState({ active: 0, spend: 0, mrr: 0 });

  const [view, setView] = useState<ViewMode>("list");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [strategyView, setStrategyView] = useState<StrategyRecord | null>(null);

  const [loadingClients, setLoadingClients] = useState(true);
  const [openingClientId, setOpeningClientId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [strategiesLoading, setStrategiesLoading] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);

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
    void loadClients();
  }, []);

  async function openClient(client: Client) {
    setOpeningClientId(client.id);
    setView("detail");
    setStrategyView(null);
    setSelectedClient(client);
    setStrategies([]);
    setDetailLoading(true);
    setStrategiesLoading(true);

    const [detailResult, strategiesResult] = await Promise.allSettled([
      fetch(`${API_BASE}/api/client-hub/clients/${client.id}`).then((response) =>
        response.ok ? response.json() : client,
      ),
      fetch(`${API_BASE}/api/strategy/past/${encodeURIComponent(client.name)}`).then((response) =>
        response.ok ? response.json() : { strategies: [] },
      ),
    ]);

    if (detailResult.status === "fulfilled" && detailResult.value) {
      setSelectedClient(detailResult.value);
    } else {
      setSelectedClient(client);
    }
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
    setOpeningClientId(null);
  }

  async function toggleVisibility() {
    if (!selectedClient) return;

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

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (search && !client.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === "active" && client.status !== "active") return false;
      if (filter === "paused" && client.status !== "paused") return false;
      if (filter === "risk" && !String(client.health_score || "").toLowerCase().includes("red"))
        return false;
      return true;
    });
  }, [clients, filter, search]);

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
            onClick={() =>
              window.open(
                `${API_BASE}/api/strategy/export-docx/${encodeURIComponent(selectedClient?.name || "")}`,
                "_blank",
              )
            }
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
        <main className="overflow-x-hidden mx-auto max-w-5xl px-4 py-4 md:py-8 md:px-6 md:py-10">
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

          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{selectedClient.name}</h1>
                <Badge className={statusColor(selectedClient)}>{statusLabel(selectedClient)}</Badge>
              </div>
              <p className="mt-2 text-sm text-white/35">
                {selectedClient.industry || "Niche non definie"}
                {selectedClient.retainer_monthly
                  ? ` - ${money(selectedClient.retainer_monthly)}/mo`
                  : ""}
                {selectedClient.website ? ` - ${selectedClient.website}` : ""}
              </p>
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
              <Button size="sm" onClick={() => window.open("/workspace/" + selectedClient.id, "_self")} className="bg-[#E8912D] text-[#17140f] hover:bg-[#f0a94b]">Ouvrir</Button>
              <Button size="sm" onClick={() => void toggleVisibility()} variant="outline" disabled={savingVisibility} className="border-white/[0.06] text-white/40">
                {savingVisibility ? (
                  <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : null}
                {selectedClient.visibility === "admin" ? "Montrer" : "Cacher"}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                className="card-hover rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.08] bg-[#1a1a1f] p-4"
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
                  <div className="text-sm font-semibold text-white">Strategies</div>
                  <Badge className="bg-white/[0.04] text-white/45">{strategies.length}</Badge>
                </div>

                {strategiesLoading ? (
                  <div className="rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.06] bg-white/[0.02] p-5 text-sm text-white/35">
                    Chargement des strategies...
                  </div>
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
                        className="card-hover w-full rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.08] bg-white/[0.02] p-4 text-left"
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
                  <div className="rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.06] bg-white/[0.02] p-5 text-sm text-white/35">
                    Aucune strategie archivee pour ce client.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-white/[0.06] bg-[#1a1a1f]">
                <CardContent className="pt-5">
                  <div className="mb-4 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-[#E8912D]" />
                    <div className="text-sm font-semibold text-white">Integrations</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { name: "Asana", connected: !!selectedClient.asana_project_id },
                      { name: "Drive", connected: !!selectedClient.google_drive_folder_id },
                      { name: "Slack", connected: !!selectedClient.slack_channel_id },
                      { name: "Meta Ads", connected: !!selectedClient.meta_data?.spend },
                    ].map((integration) => (
                      <div
                        key={integration.name}
                        className="rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.06] bg-white/[0.02] p-3"
                      >
                        <div className="text-xs font-semibold text-white">{integration.name}</div>
                        <div
                          className={`mt-1 text-[11px] ${
                            integration.connected ? "text-green-300" : "text-white/25"
                          }`}
                        >
                          {integration.connected ? "Connecte" : "Non connecte"}
                        </div>
                      </div>
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
                    <div className="text-sm text-white/35">Aucun signal majeur remonte ici pour le moment.</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedFlags.map((flag, index) => (
                        <div
                          key={`flag-${index}`}
                          className="rounded-xl border border-red-500/15 bg-red-500/8 px-3 py-2 text-xs text-red-200"
                        >
                          {typeof flag === 'string' ? flag : String((flag as Record<string, unknown>)?.msg ?? JSON.stringify(flag))}
                        </div>
                      ))}
                      {selectedWins.map((win, index) => (
                        <div
                          key={`win-${index}`}
                          className="rounded-xl border border-green-500/15 bg-green-500/8 px-3 py-2 text-xs text-green-200"
                        >
                          {typeof win === 'string' ? win : String((win as Record<string, unknown>)?.msg ?? JSON.stringify(win))}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <Card className="border-white/[0.06] bg-[#1a1a1f]">
              <CardContent className="pt-5">
                <div className="mb-4 flex items-center gap-2">
                  <NotebookPen className="h-4 w-4 text-[#E8912D]" />
                  <div className="text-sm font-semibold text-white">Notes</div>
                </div>
                {selectedNotes.length > 0 || selectedClient.notes ? (
                  <div className="space-y-2.5">
                    {selectedClient.notes ? (
                      <div className="rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.06] bg-white/[0.02] p-4 text-sm leading-6 text-white/60">
                        {selectedClient.notes}
                      </div>
                    ) : null}
                    {selectedNotes.slice(0, 4).map((note, index) => (
                      <div
                        key={`note-${index}`}
                        className="rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.06] bg-white/[0.02] p-4"
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
                    {selectedActivity.slice(0, 5).map((entry, index) => (
                      <div
                        key={`activity-${index}`}
                        className="rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.06] bg-white/[0.02] p-4"
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
                  <div className="text-sm text-white/35">Pas d&apos;activite recente disponible.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="overflow-x-hidden mx-auto max-w-6xl px-4 py-4 md:py-8 md:px-6 md:py-10">
        <h1 className="text-2xl font-bold text-white">Client Hub</h1>
        <p className="mt-1 text-sm text-white/40">Tous vos clients, au meme endroit.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Clients actifs", value: stats.active.toString(), tone: "text-white" },
            { label: "Monthly Ad Spend", value: money(stats.spend), tone: "text-green-300" },
            {
              label: "Monthly Recurring Revenue",
              value: money(stats.mrr),
              tone: "text-[#f6c978]",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="card-hover rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.08] bg-[#1a1a1f] p-4 text-center"
            >
              <div className={`text-2xl font-bold ${item.tone}`}>{item.value}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-[220px] border-white/[0.08] bg-white/[0.04] text-sm"
          />
          {["all", "active", "paused", "risk"].map((value) => (
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
                    : "At Risk"}
            </Button>
          ))}
        </div>

        {search.trim() && (<div className="mt-6 grid gap-3 md:grid-cols-2">
          {loadingClients ? (
            <div className="col-span-full rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.08] bg-[#1a1a1f] p-6 text-center text-sm text-white/35">
              Chargement des clients...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="col-span-full rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.08] bg-[#1a1a1f] p-6 text-center text-sm text-white/35">
              Aucun client ne correspond aux filtres.
            </div>
          ) : (
            filteredClients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => void openClient(client)}
                className="card-hover rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.06] bg-[#1a1a1f] px-4 py-4 text-left"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{client.name}</div>
                    <div className="mt-1 text-xs text-white/32">
                      {client.industry || "Niche non definie"}
                    </div>
                  </div>
                  {openingClientId === client.id ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-[#E8912D]" />
                  ) : (
                    <Badge className={statusColor(client)}>{statusLabel(client)}</Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
        )}
        {!search.trim() && (
          <div className="mt-16 text-center">
            <p className="text-white/25 text-sm">{"Recherchez un client pour acc\u00e9der \u00e0 son workspace"}</p>
          </div>
        )}
      </main>
    </div>
  );
}
