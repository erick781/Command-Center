"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";

import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type FilterKey =
  | "all"
  | "risk"
  | "wins"
  | "active"
  | "paused"
  | "hidden"
  | "high_spend"
  | "low_spend";

type SortKey = "risk" | "spend" | "leads" | "roas" | "name";

interface TrackerMeta {
  spend?: number;
  leads?: number;
  cpl?: number;
  roas?: number;
  revenue?: number;
  campaigns?: unknown[];
  flags?: string[];
  wins?: string[];
}

interface Client {
  id: string;
  name: string;
  status: string;
  health_score: string;
  retainer_monthly: number;
  industry?: string;
  website?: string;
  meta_data?: TrackerMeta;
  asana_project_id?: string;
  slack_channel_id?: string;
  google_drive_folder_id?: string;
  visibility?: string;
  notes?: string;
}

interface TrackerStats {
  total_clients?: number;
  total_spend?: number;
  total_leads?: number;
  avg_cpl?: number;
  at_risk?: number;
  total_revenue?: number;
  purchases?: number;
  roas?: number;
  active_clients?: number;
  paused_clients?: number;
}

interface InsightItem {
  client: Client;
  label: string;
  detail: string;
  severity: "critical" | "high" | "medium" | "green";
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatCurrency(value?: number, fallback = "—") {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return money.format(value);
}

function formatDecimal(value?: number, digits = 1, fallback = "—") {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value.toFixed(digits);
}

function formatNumber(value?: number, fallback = "—") {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value.toLocaleString();
}

function flagText(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object" && "msg" in item) return String((item as Record<string, unknown>).msg);
  return String(item);
}

function normalize(value?: string) {
  return (value || "").toLowerCase();
}

function healthTier(client: Client) {
  if (normalize(client.visibility) === "admin") return "hidden";
  const score = normalize(client.health_score);
  if (score.includes("red")) return "critical";
  if (score.includes("orange") || score.includes("amber")) return "high";
  if (score.includes("yellow")) return "medium";
  if (score.includes("green")) return "green";
  return client.meta_data?.flags?.length ? "high" : "medium";
}

function statusLabel(status?: string) {
  const value = normalize(status);
  if (value === "active") return "Active";
  if (value === "paused") return "Paused";
  if (value === "churned") return "Churned";
  if (value === "trial") return "Trial";
  return status || "Unknown";
}

function healthLabel(client: Client) {
  const tier = healthTier(client);
  if (tier === "critical") return "Critical";
  if (tier === "high") return "Watch";
  if (tier === "medium") return "Monitor";
  if (tier === "hidden") return "Hidden";
  return "Healthy";
}

function healthClass(client: Client) {
  const tier = healthTier(client);
  if (tier === "critical") return "bg-red-500/15 text-red-300 ring-red-500/20";
  if (tier === "high") return "bg-orange-500/15 text-orange-300 ring-orange-500/20";
  if (tier === "medium") return "bg-yellow-500/15 text-yellow-300 ring-yellow-500/20";
  if (tier === "hidden") return "bg-white/5 text-white/35 ring-white/10";
  return "bg-green-500/15 text-green-300 ring-green-500/20";
}

function statusClass(status?: string) {
  const value = normalize(status);
  if (value === "paused") return "bg-orange-500/15 text-orange-300 ring-orange-500/20";
  if (value === "churned") return "bg-red-500/15 text-red-300 ring-red-500/20";
  if (value === "trial") return "bg-blue-500/15 text-blue-300 ring-blue-500/20";
  return "bg-green-500/15 text-green-300 ring-green-500/20";
}

function scoreWeight(client: Client) {
  const tier = healthTier(client);
  if (tier === "critical") return 4;
  if (tier === "high") return 3;
  if (tier === "medium") return 2;
  if (tier === "green") return 1;
  return 0;
}

function buildCsv(rows: Client[]) {
  const headers = [
    "name",
    "status",
    "health_score",
    "visibility",
    "industry",
    "spend",
    "leads",
    "cpl",
    "roas",
    "revenue",
    "flags",
    "wins",
  ];
  const escape = (value: unknown) => {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  return [
    headers.join(","),
    ...rows.map((client) =>
      [
        client.name,
        client.status,
        client.health_score,
        client.visibility || "",
        client.industry || "",
        client.meta_data?.spend ?? "",
        client.meta_data?.leads ?? "",
        client.meta_data?.cpl ?? "",
        client.meta_data?.roas ?? "",
        client.meta_data?.revenue ?? "",
        (client.meta_data?.flags || []).map(flagText).join(" | "),
        (client.meta_data?.wins || []).map(flagText).join(" | "),
      ]
        .map(escape)
        .join(","),
    ),
  ].join("\n");
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function TrackerPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortBy, setSortBy] = useState<SortKey>("risk");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

  const loadTracker = useCallback(async () => {
    setLoading(true);
    try {
      const [statsResponse, clientsResponse] = await Promise.all([
        fetch(`${API}/api/client-hub/stats`).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(`${API}/api/client-hub/clients?show_hidden=true`).then((r) =>
          r.ok ? r.json() : [],
        ),
      ]);

      setStats(statsResponse || null);
      setClients(Array.isArray(clientsResponse) ? clientsResponse : []);
      setLastUpdated(new Date().toISOString());
    } catch {
      setStats(null);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [API]);

  useEffect(() => {
    void loadTracker();
  }, [loadTracker]);

  const allSpend = clients.reduce(
    (sum, client) => sum + (client.meta_data?.spend || 0),
    0,
  );
  const allLeads = clients.reduce(
    (sum, client) => sum + (client.meta_data?.leads || 0),
    0,
  );
  const allRevenue = clients.reduce(
    (sum, client) => sum + (client.meta_data?.revenue || 0),
    0,
  );
  const allFlags = clients.reduce(
    (sum, client) =>
      sum +
      (client.meta_data?.flags?.length || 0) +
      (healthTier(client) === "critical" ? 1 : 0),
    0,
  );
  const allWins = clients.reduce((sum, client) => {
    const wins = client.meta_data?.wins?.length || 0;
    const performanceWins =
      (client.meta_data?.roas || 0) >= 3 ? 1 : 0;
    return sum + wins + performanceWins;
  }, 0);

  const activeCount = clients.filter(
    (client) => normalize(client.status) === "active",
  ).length;
  const pausedCount = clients.filter(
    (client) => normalize(client.status) === "paused",
  ).length;
  const hiddenCount = clients.filter(
    (client) => normalize(client.visibility) === "admin",
  ).length;
  const riskCount = clients.filter((client) =>
    ["critical", "high"].includes(healthTier(client)),
  ).length;

  const visibleClients = clients
    .filter((client) => {
      const query = search.trim().toLowerCase();
      if (query) {
        const haystack = [
          client.name,
          client.industry,
          client.website,
          client.notes,
          client.health_score,
          client.status,
          client.visibility,
          ...(client.meta_data?.flags || []).map(flagText),
          ...(client.meta_data?.wins || []).map(flagText),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      if (filter === "risk") {
        return ["critical", "high"].includes(healthTier(client));
      }
      if (filter === "wins") {
        return (
          (client.meta_data?.wins?.length || 0) > 0 ||
          (client.meta_data?.roas || 0) >= 3 ||
          healthTier(client) === "green"
        );
      }
      if (filter === "active") return normalize(client.status) === "active";
      if (filter === "paused") return normalize(client.status) === "paused";
      if (filter === "hidden") return normalize(client.visibility) === "admin";
      if (filter === "high_spend") return (client.meta_data?.spend || 0) >= 1000;
      if (filter === "low_spend") return (client.meta_data?.spend || 0) < 1000;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "spend") {
        return (b.meta_data?.spend || 0) - (a.meta_data?.spend || 0);
      }
      if (sortBy === "leads") {
        return (b.meta_data?.leads || 0) - (a.meta_data?.leads || 0);
      }
      if (sortBy === "roas") {
        return (b.meta_data?.roas || 0) - (a.meta_data?.roas || 0);
      }

      const riskDelta = scoreWeight(b) - scoreWeight(a);
      if (riskDelta !== 0) return riskDelta;
      return (b.meta_data?.flags?.length || 0) - (a.meta_data?.flags?.length || 0);
    });

  const selectedClient = clients.find((client) => client.id === selectedId) || null;

  const flagItems = visibleClients.flatMap<InsightItem>((client) => {
    const items: InsightItem[] = [];
    const flags = client.meta_data?.flags || [];

    if (healthTier(client) === "critical") {
      items.push({
        client,
        label: "Health score red",
        detail: "Client should be reviewed immediately.",
        severity: "critical",
      });
    } else if (healthTier(client) === "high") {
      items.push({
        client,
        label: "Health score unstable",
        detail: "Account needs a close watch this cycle.",
        severity: "high",
      });
    }

    flags.forEach((flag) => {
      items.push({
        client,
        label: flagText(flag),
        detail: client.industry || "Portfolio flag",
        severity: healthTier(client) === "critical" ? "critical" : "high",
      });
    });

    return items;
  });

  const winItems = visibleClients.flatMap<InsightItem>((client) => {
    const wins = client.meta_data?.wins || [];
    const items: InsightItem[] = wins.map((win) => ({
      client,
      label: flagText(win),
      detail: client.industry || "Recorded win",
      severity: "green",
    }));

    if ((client.meta_data?.roas || 0) >= 3) {
      items.unshift({
        client,
        label: `${formatDecimal(client.meta_data?.roas, 1)}x ROAS`,
        detail: "Strong return on ad spend",
        severity: "green",
      });
    }

    return items;
  });

  const exportCurrentCsv = () => {
    downloadFile(
      `tracker-current-${new Date().toISOString().slice(0, 10)}.csv`,
      buildCsv(visibleClients),
      "text/csv;charset=utf-8",
    );
  };

  const exportSnapshotJson = () => {
    downloadFile(
      `tracker-snapshot-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          filters: { search, filter, sortBy },
          stats,
          clients: visibleClients,
        },
        null,
        2,
      ),
      "application/json;charset=utf-8",
    );
  };

  const refresh = () => {
    void loadTracker();
  };

  const summaryCards = [
    {
      label: "Accounts",
      value: stats?.total_clients ?? clients.length,
      accent: "text-white",
    },
    {
      label: "Active",
      value: stats?.active_clients ?? activeCount,
      accent: "text-green-300",
    },
    {
      label: "Spend",
      value: formatCurrency(stats?.total_spend ?? allSpend),
      accent: "text-green-300",
    },
    {
      label: "Leads",
      value: formatNumber(stats?.total_leads ?? allLeads),
      accent: "text-[#f4c87d]",
    },
    {
      label: "Revenue",
      value: formatCurrency(stats?.total_revenue ?? allRevenue),
      accent: "text-emerald-300",
    },
    {
      label: "Signals",
      value: formatNumber(allFlags),
      accent: "text-red-300",
    },
  ];

  const filterChips: Array<{
    key: FilterKey;
    label: string;
    count: number;
  }> = [
    { key: "all", label: "All", count: clients.length },
    { key: "risk", label: "Risk", count: riskCount },
    { key: "wins", label: "Wins", count: allWins },
    { key: "active", label: "Active", count: activeCount },
    { key: "paused", label: "Paused", count: pausedCount },
    { key: "hidden", label: "Hidden", count: hiddenCount },
    {
      key: "high_spend",
      label: "High spend",
      count: clients.filter((client) => (client.meta_data?.spend || 0) >= 1000)
        .length,
    },
    {
      key: "low_spend",
      label: "Low spend",
      count: clients.filter((client) => (client.meta_data?.spend || 0) < 1000)
        .length,
    },
  ];

  const integrations = selectedClient
    ? [
        {
          label: "Asana",
          connected: Boolean(selectedClient.asana_project_id),
        },
        {
          label: "Slack",
          connected: Boolean(selectedClient.slack_channel_id),
        },
        {
          label: "Drive",
          connected: Boolean(selectedClient.google_drive_folder_id),
        },
        {
          label: "Meta Ads",
          connected: Boolean(selectedClient.meta_data?.spend),
        },
      ]
    : [];

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-green-300">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              Live operations
            </div>
            <h1 className="text-3xl font-bold tracking-[-0.04em] text-white md:text-4xl">
              Ads Intelligence Master Tracker
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
              A cleaner command-center view for portfolio health, red flags,
              wins, and account-level details without leaving the page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button
              onClick={refresh}
              variant="outline"
              className="border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              Refresh
            </Button>
            <Button
              onClick={exportCurrentCsv}
              variant="outline"
              className="border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              Export CSV
            </Button>
            <Button
              onClick={exportSnapshotJson}
              className="bg-[#E8912D] text-[#17140f] hover:bg-[#f2ab4e]"
            >
              Export JSON
            </Button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {summaryCards.map((item) => (
            <Card
              key={item.label}
              className="border-white/10 bg-[#17171b] shadow-[0_14px_40px_rgba(0,0,0,0.22)]"
            >
              <CardContent className="pt-5">
                <div className={cn("text-2xl font-bold tracking-[-0.04em]", item.accent)}>
                  {item.value}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-white/30">
                  {item.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#151519]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search client, industry, notes, flags..."
                className="h-10 border-white/10 bg-white/[0.03] text-sm text-white placeholder:text-white/30"
              />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortKey)}
                className="h-10 min-w-[150px] rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none transition focus:border-[#E8912D]"
              >
                <option value="risk">Sort by risk</option>
                <option value="spend">Sort by spend</option>
                <option value="leads">Sort by leads</option>
                <option value="roas">Sort by ROAS</option>
                <option value="name">Sort by name</option>
              </select>
            </div>

            <div className="text-xs text-white/35">
              {loading ? "Syncing tracker..." : `Updated ${lastUpdated ? new Date(lastUpdated).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "just now"}`}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterChips.map((chip) => {
              const active = filter === chip.key;
              return (
                <Button
                  key={chip.key}
                  onClick={() => setFilter(chip.key)}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full border-white/10 text-xs",
                    active
                      ? "bg-[#E8912D] text-[#17140f] hover:bg-[#f2ab4e]"
                      : "bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  {chip.label} <span className="ml-1 text-[10px] opacity-70">{chip.count}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
          <section className="space-y-4">
            <Card className="border-white/10 bg-[#17171b] shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-lg text-white">Portfolio table</CardTitle>
                <CardDescription className="text-white/40">
                  Searchable client rows with health, performance, and visibility
                  state in one place.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-white/[0.02]">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-white/35">
                        Client
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-white/35">
                        Status
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-white/35">
                        Health
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-white/35">
                        Spend
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-white/35">
                        Leads
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-white/35">
                        CPL
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-white/35">
                        ROAS
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-white/35">
                        Signals
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleClients.length === 0 ? (
                      <TableRow className="border-white/10">
                        <TableCell colSpan={8} className="px-4 py-10 text-center">
                          <div className="text-sm text-white/40">
                            No clients match the current filter.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleClients.map((client) => {
                        const expanded = selectedId === client.id;
                        const flags = client.meta_data?.flags || [];
                        const wins = client.meta_data?.wins || [];
                        const signals = flags.length + wins.length;

                        return (
                          <Fragment key={client.id}>
                            <TableRow
                              onClick={() =>
                                setSelectedId(expanded ? null : client.id)
                              }
                              className={cn(
                                "cursor-pointer border-white/10 transition hover:bg-white/[0.03]",
                                expanded && "bg-white/[0.04]",
                              )}
                            >
                              <TableCell className="px-4 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-white">
                                    {client.name}
                                  </span>
                                  <span className="text-xs text-white/35">
                                    {client.industry || "No industry"}{" "}
                                    {client.website ? `- ${client.website}` : ""}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                <Badge
                                  className={cn(
                                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                    statusClass(client.status),
                                  )}
                                >
                                  {statusLabel(client.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                <Badge
                                  className={cn(
                                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                    healthClass(client),
                                  )}
                                >
                                  {healthLabel(client)}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm text-white/80">
                                {formatCurrency(client.meta_data?.spend)}
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm text-white/80">
                                {formatNumber(client.meta_data?.leads)}
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm text-white/80">
                                {formatCurrency(client.meta_data?.cpl)}
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm text-white/80">
                                {formatDecimal(client.meta_data?.roas, 1)}
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <Badge className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                                    {signals} signals
                                  </Badge>
                                  {normalize(client.visibility) === "admin" && (
                                    <Badge className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                                      Hidden
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>

                            {expanded && (
                              <TableRow className="border-white/10 bg-white/[0.02]">
                                <TableCell colSpan={8} className="px-4 py-4">
                                  <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                                    <div className="rounded-2xl border border-white/10 bg-[#141418] p-4">
                                      <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                          <div className="text-xs uppercase tracking-[0.24em] text-white/30">
                                            Snapshot
                                          </div>
                                          <div className="mt-1 text-sm font-semibold text-white">
                                            {client.name}
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          <Link
                                            href="/clients"
                                            className="inline-flex h-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[0.8rem] font-medium text-white/70 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                                          >
                                            Open client hub
                                          </Link>
                                          <Link
                                            href={`/strategie?client=${encodeURIComponent(
                                              client.name,
                                            )}`}
                                            className="inline-flex h-7 items-center justify-center rounded-lg bg-[#E8912D] px-2.5 text-[0.8rem] font-medium text-[#17140f] transition hover:bg-[#f2ab4e]"
                                          >
                                            Strategy
                                          </Link>
                                        </div>
                                      </div>

                                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                        {[
                                          {
                                            label: "Revenue",
                                            value: formatCurrency(
                                              client.meta_data?.revenue,
                                            ),
                                          },
                                          {
                                            label: "Campaigns",
                                            value: formatNumber(
                                              client.meta_data?.campaigns?.length,
                                            ),
                                          },
                                          {
                                            label: "Retainer",
                                            value: formatCurrency(
                                              client.retainer_monthly,
                                            ),
                                          },
                                          {
                                            label: "Visibility",
                                            value:
                                              normalize(client.visibility) ===
                                              "admin"
                                                ? "Hidden"
                                                : "Public",
                                          },
                                        ].map((item) => (
                                          <div
                                            key={item.label}
                                            className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                                          >
                                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                                              {item.label}
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                              {item.value}
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {client.notes && (
                                        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/65">
                                          {client.notes}
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-3">
                                      <div className="rounded-2xl border border-white/10 bg-[#141418] p-4">
                                        <div className="mb-3 text-xs uppercase tracking-[0.24em] text-white/30">
                                          Integrations
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          {integrations.map((item) => (
                                            <div
                                              key={item.label}
                                              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                                            >
                                              <div className="text-sm font-semibold text-white">
                                                {item.label}
                                              </div>
                                              <div
                                                className={cn(
                                                  "mt-1 text-[10px] uppercase tracking-[0.2em]",
                                                  item.connected
                                                    ? "text-green-300"
                                                    : "text-white/25",
                                                )}
                                              >
                                                {item.connected ? "Connected" : "Offline"}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="rounded-2xl border border-white/10 bg-[#141418] p-4">
                                        <div className="mb-3 text-xs uppercase tracking-[0.24em] text-red-300">
                                          Flags
                                        </div>
                                        <div className="space-y-2">
                                          {flags.length > 0 ? (
                                            flags.map((flag) => (
                                              <div
                                                key={flagText(flag)}
                                                className="rounded-xl border border-red-500/15 bg-red-500/8 px-3 py-2 text-sm text-red-100"
                                              >
                                                {flagText(flag)}
                                              </div>
                                            ))
                                          ) : (
                                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/40">
                                              No active flags.
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="rounded-2xl border border-white/10 bg-[#141418] p-4">
                                        <div className="mb-3 text-xs uppercase tracking-[0.24em] text-emerald-300">
                                          Wins
                                        </div>
                                        <div className="space-y-2">
                                          {wins.length > 0 || (client.meta_data?.roas || 0) >= 3 ? (
                                            <>
                                              {(client.meta_data?.roas || 0) >= 3 && (
                                                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/8 px-3 py-2 text-sm text-emerald-100">
                                                  Strong ROAS at{" "}
                                                  {formatDecimal(client.meta_data?.roas, 1)}x
                                                </div>
                                              )}
                                              {wins.map((win) => (
                                                <div
                                                  key={flagText(win)}
                                                  className="rounded-xl border border-emerald-500/15 bg-emerald-500/8 px-3 py-2 text-sm text-emerald-100"
                                                >
                                                  {flagText(win)}
                                                </div>
                                              ))}
                                            </>
                                          ) : (
                                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/40">
                                              No wins recorded yet.
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4">
            <Card className="border-white/10 bg-[#17171b] shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-lg text-white">Red flags</CardTitle>
                <CardDescription className="text-white/40">
                  Aggregated risks from the current portfolio slice.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {flagItems.length > 0 ? (
                  flagItems.slice(0, 10).map((item, index) => (
                    <div
                      key={`${item.client.id}-${item.label}-${index}`}
                      className="rounded-2xl border border-red-500/15 bg-red-500/8 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {item.client.name}
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            {item.detail}
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                            item.severity === "critical"
                              ? "border-red-500/20 bg-red-500/15 text-red-300"
                              : "border-orange-500/20 bg-orange-500/15 text-orange-300",
                          )}
                        >
                          {item.severity}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-red-100">{item.label}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
                    No active red flags in this view.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#17171b] shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-lg text-white">Wins</CardTitle>
                <CardDescription className="text-white/40">
                  Positive signals and high-performing accounts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {winItems.length > 0 ? (
                  winItems.slice(0, 10).map((item, index) => (
                    <div
                      key={`${item.client.id}-${item.label}-${index}`}
                      className="rounded-2xl border border-emerald-500/15 bg-emerald-500/8 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {item.client.name}
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            {item.detail}
                          </div>
                        </div>
                        <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                          win
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-emerald-100">
                        {item.label}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
                    No wins recorded in this view.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#17171b] shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-lg text-white">Export snapshot</CardTitle>
                <CardDescription className="text-white/40">
                  Download the current filtered view for reporting or follow-up.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={exportCurrentCsv}
                    variant="outline"
                    className="border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                  >
                    CSV
                  </Button>
                  <Button
                    onClick={exportSnapshotJson}
                    variant="outline"
                    className="border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                  >
                    JSON
                  </Button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
                  {visibleClients.length} visible account
                  {visibleClients.length === 1 ? "" : "s"} in the current view.
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
