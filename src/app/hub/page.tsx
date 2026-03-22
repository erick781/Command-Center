"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Lightbulb,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Search,
  Package,
  Users,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AgentStatus = "live" | "soon" | "planned";

interface AgentLink {
  label: string;
  href: string;
}

interface AgentCard {
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  accent: string;
  surface: string;
  status: AgentStatus;
  statusLabel: string;
  links?: AgentLink[];
}

interface Idea {
  id: string;
  title: string;
  description: string;
  submitted_by: string;
  submitted_email?: string | null;
  category: string;
  priority: string;
  votes: number;
  status: string;
  created_at: string;
  voted_by?: string[] | null;
}

interface RefreshState {
  status: "idle" | "running" | "done" | "error";
  timestamp: string | null;
  message: string;
}

interface BrainstormContext {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
}

interface BrainstormMessage {
  role: "user" | "assistant";
  content: string;
}

interface HubClient {
  id: string;
  name: string;
  status: string;
  health_score: string;
  industry?: string;
}

interface RecentDeliverable {
  id: string;
  client_id: string;
  type: string;
  title: string;
  created_at: string;
  client_name?: string;
}

const agents: AgentCard[] = [
  {
    name: "Ads Intelligence",
    subtitle: "Meta Ads - 140 comptes - 2x/jour",
    description:
      "Collecte automatique des donnees Meta Ads. Spend, leads, CPL, ROAS et red flags centralises.",
    icon: "AI",
    accent: "#16a34a",
    surface: "rgba(22,163,74,0.14)",
    status: "live",
    statusLabel: "Live - Pipeline 2x/jour",
    links: [
      { label: "Rapports", href: "/rapports" },
      { label: "Tracker", href: "/tracker" },
    ],
  },
  {
    name: "Rapport Agent",
    subtitle: "Rapports - Recommandations IA - PDF",
    description:
      "Genere les rapports clients, remonte les KPIs et ajoute des recommandations strategiques.",
    icon: "RP",
    accent: "#16a34a",
    surface: "rgba(22,163,74,0.14)",
    status: "live",
    statusLabel: "Live - Recommandations IA",
    links: [{ label: "Generer", href: "/rapports" }],
  },
  {
    name: "Master Tracker",
    subtitle: "Sante clients - Red flags - Filtres",
    description:
      "Vue globale des comptes, health scores, flags groupes, wins et drill-down rapide.",
    icon: "MT",
    accent: "#16a34a",
    surface: "rgba(22,163,74,0.14)",
    status: "live",
    statusLabel: "Live - Health scores + filtres",
    links: [{ label: "Ouvrir", href: "/tracker" }],
  },
  {
    name: "Strategy Agent",
    subtitle: "Pivots - Tendances - Benchmarks",
    description:
      "Transforme les observations du tracker et des rapports en plans d'action plus solides.",
    icon: "SA",
    accent: "#74b9ff",
    surface: "rgba(116,185,255,0.14)",
    status: "live",
    statusLabel: "Live - Generation strategique",
    links: [{ label: "Strategie", href: "/strategie" }],
  },
  {
    name: "Communication Agent",
    subtitle: "Gmail - Slack - iMessage",
    description:
      "Classifie les messages, route les suivis et prepare des briefings operationnels.",
    icon: "CC",
    accent: "#fdcb6e",
    surface: "rgba(253,203,110,0.13)",
    status: "soon",
    statusLabel: "Coming soon - Code pret",
  },
  {
    name: "Productivity Agent",
    subtitle: "Asana - Slack - Deadlines",
    description:
      "Regroupe les taches, les deadlines et les blocages dans un tableau de bord unique.",
    icon: "PA",
    accent: "#fdcb6e",
    surface: "rgba(253,203,110,0.13)",
    status: "soon",
    statusLabel: "Coming soon",
  },
];

const quickActions = [
  { label: "Rapports", href: "/rapports", external: false, note: "Generer et ouvrir" },
  { label: "Master Tracker", href: "/tracker", external: false, note: "Health scores" },
  { label: "Report API", href: "/api/reports/clients", external: true, note: "Flux clients" },
  { label: "Raw Data", href: "/data/ai-data.json", external: true, note: "JSON brut" },
];

const categoryOptions = [
  { value: "", label: "Toutes categories" },
  { value: "ads", label: "Publicite" },
  { value: "communication", label: "Communication" },
  { value: "productivity", label: "Productivite" },
  { value: "reporting", label: "Rapports" },
  { value: "strategy", label: "Strategie" },
  { value: "other", label: "Autre" },
];

const defaultBrainstormMessage =
  "Je peux t'aider a analyser une idee d'agent, estimer l'effort, identifier les dependances et prioriser le ROI. Lance-moi un sujet ou clique sur une idee pour l'analyser.";

function normalizeCategory(value: string | null | undefined) {
  switch ((value ?? "").toLowerCase()) {
    case "rapports":
      return "reporting";
    case "strategie":
      return "strategy";
    case "productivite":
      return "productivity";
    case "autre":
      return "other";
    default:
      return (value ?? "other").toLowerCase();
  }
}

function normalizePriority(value: string | null | undefined) {
  switch ((value ?? "").toLowerCase()) {
    case "critique":
      return "critical";
    case "nice-to-have":
      return "nice-to-have";
    default:
      return (value ?? "important").toLowerCase();
  }
}

function normalizeStatus(value: string | null | undefined) {
  switch ((value ?? "").toLowerCase()) {
    case "nouveau":
      return "new";
    case "en-revision":
      return "reviewing";
    case "planifie":
      return "planned";
    default:
      return (value ?? "new").toLowerCase();
  }
}

function categoryLabel(value: string) {
  switch (normalizeCategory(value)) {
    case "ads":
      return "Publicite";
    case "communication":
      return "Communication";
    case "productivity":
      return "Productivite";
    case "reporting":
      return "Rapports";
    case "strategy":
      return "Strategie";
    default:
      return "Autre";
  }
}

function priorityLabel(value: string) {
  switch (normalizePriority(value)) {
    case "critical":
      return "Critique";
    case "important":
      return "Important";
    default:
      return "Nice-to-have";
  }
}

function statusLabel(value: string) {
  switch (normalizeStatus(value)) {
    case "reviewing":
      return "En revision";
    case "planned":
      return "Planifie";
    case "building":
      return "En construction";
    case "live":
      return "Live";
    case "rejected":
      return "Rejete";
    default:
      return "Nouveau";
  }
}

function categoryBadgeClasses(value: string) {
  switch (normalizeCategory(value)) {
    case "ads":
      return "bg-[#E8912D]/15 text-[#f6c978] border-[#E8912D]/20";
    case "communication":
      return "bg-sky-400/12 text-sky-300 border-sky-400/20";
    case "productivity":
      return "bg-emerald-400/12 text-emerald-300 border-emerald-400/20";
    case "reporting":
      return "bg-amber-300/12 text-amber-200 border-amber-300/20";
    case "strategy":
      return "bg-orange-400/12 text-orange-300 border-orange-400/20";
    default:
      return "bg-white/6 text-white/55 border-white/8";
  }
}

function priorityBadgeClasses(value: string) {
  switch (normalizePriority(value)) {
    case "critical":
      return "bg-red-500/12 text-red-300 border-red-500/20";
    case "important":
      return "bg-[#E8912D]/15 text-[#f6c978] border-[#E8912D]/20";
    default:
      return "bg-white/6 text-white/55 border-white/8";
  }
}

function statusBadgeClasses(value: string) {
  switch (normalizeStatus(value)) {
    case "reviewing":
      return "bg-[#E8912D]/15 text-[#f6c978] border-[#E8912D]/20";
    case "planned":
      return "bg-sky-400/12 text-sky-300 border-sky-400/20";
    case "building":
      return "bg-orange-400/12 text-orange-300 border-orange-400/20";
    case "live":
      return "bg-emerald-400/12 text-emerald-300 border-emerald-400/20";
    case "rejected":
      return "bg-white/6 text-white/45 border-white/8";
    default:
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  }
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recent";

  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "maintenant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

function timestampLabel(value: string | null) {
  if (!value) return "Aucune info";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return {
    url,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
  };
}

export default function HubPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [submittingIdea, setSubmittingIdea] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortMode, setSortMode] = useState("votes");

  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("other");
  const [ideaPriority, setIdeaPriority] = useState("nice-to-have");

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState("Equipe");
  const [userRole, setUserRole] = useState<string | null>(null);

  const [activeAccounts, setActiveAccounts] = useState(43);
  const [adAccounts, setAdAccounts] = useState(138);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [refreshState, setRefreshState] = useState<RefreshState>({
    status: "idle",
    timestamp: null,
    message: "Pret a lancer un refresh",
  });

  const [brainstormOpen, setBrainstormOpen] = useState(false);
  const [brainstormBusy, setBrainstormBusy] = useState(false);
  const [brainstormInput, setBrainstormInput] = useState("");
  const [brainstormContext, setBrainstormContext] = useState<BrainstormContext | null>(null);
  const [brainstormMessages, setBrainstormMessages] = useState<BrainstormMessage[]>([
    {
      role: "assistant",
      content: defaultBrainstormMessage,
    },
  ]);

  const router = useRouter();

  // ── Client quick-selector state ──
  const [hubClients, setHubClients] = useState<HubClient[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  // ── Recent deliverables state ──
  const [recentDeliverables, setRecentDeliverables] = useState<RecentDeliverable[]>([]);

  const filteredClients = hubClients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()),
  );

  const liveAgents = agents.filter((agent) => agent.status === "live").length;
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  const filteredIdeas = [...ideas]
    .filter((idea) => {
      if (!categoryFilter) return true;
      return normalizeCategory(idea.category) === categoryFilter;
    })
    .sort((left, right) => {
      if (sortMode === "newest") {
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      }

      if (sortMode === "status") {
        return normalizeStatus(left.status).localeCompare(normalizeStatus(right.status));
      }

      return (right.votes ?? 0) - (left.votes ?? 0);
    });

  useEffect(() => {
    void hydrateHubData();
    void loadIdeas();
    void loadCurrentUser();
    void loadHubClients();
    void loadRecentDeliverables();
  }, []);

  async function loadHubClients() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
    try {
      const res = await fetch(`${apiBase}/api/client-hub/clients`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const clients = Array.isArray(data?.clients) ? data.clients : Array.isArray(data) ? data : [];
      setHubClients(clients);
    } catch {
      // silent
    }
  }

  async function loadRecentDeliverables() {
    const config = getSupabaseConfig();
    if (!config) return;
    try {
      const res = await fetch(
        `${config.url}/rest/v1/client_deliverables?select=id,client_id,type,title,created_at&order=created_at.desc&limit=5`,
        { headers: config.headers },
      );
      const data = await res.json().catch(() => null);
      if (!Array.isArray(data)) return;
      // Enrich with client names
      const enriched = data.map((d: RecentDeliverable) => {
        const client = hubClients.find((c) => c.id === d.client_id);
        return { ...d, client_name: client?.name ?? d.client_id?.slice(0, 8) };
      });
      setRecentDeliverables(enriched);
    } catch {
      // silent
    }
  }

  // Re-enrich deliverables when clients load
  useEffect(() => {
    if (hubClients.length > 0 && recentDeliverables.length > 0) {
      setRecentDeliverables((prev) =>
        prev.map((d) => {
          const client = hubClients.find((c) => c.id === d.client_id);
          return { ...d, client_name: client?.name ?? d.client_name };
        }),
      );
    }
  }, [hubClients]);

  async function hydrateHubData() {
    try {
      const [clientsResponse, statusResponse] = await Promise.all([
        fetch("/api/reports/clients", { credentials: "include" }),
        fetch("/api/status", { credentials: "include" }),
      ]);

      if (clientsResponse.ok) {
        const data = await clientsResponse.json();
        const clients = Array.isArray(data?.clients) ? data.clients : [];

        if (clients.length > 0) {
          setAdAccounts(clients.length);
          setActiveAccounts(
            clients.filter((client: { status?: string }) => client.status === "active").length ||
              clients.length,
          );
        }
      }

      if (statusResponse.ok) {
        const data = await statusResponse.json();
        setRefreshState({
          status:
            data?.status === "running" || data?.status === "done" || data?.status === "error"
              ? data.status
              : "idle",
          timestamp: data?.timestamp ?? null,
          message:
            data?.status === "done"
              ? "Dernier refresh termine"
              : data?.status === "error"
                ? "Le pipeline de refresh demande de l'attention"
                : "Pipeline connecte",
        });
      }
    } catch {
      setRefreshState((current) => ({
        ...current,
        message: "Impossible de verifier le pipeline pour l'instant",
      }));
    }
  }

  async function loadCurrentUser() {
    const config = getSupabaseConfig();
    if (!config) return;

    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? null;

      setUserEmail(email);
      setUserName(
        (data.user?.user_metadata?.full_name as string | undefined) ??
          (data.user?.user_metadata?.name as string | undefined) ??
          data.user?.email?.split("@")[0] ??
          "Equipe",
      );

      if (!email) return;

      const roleResponse = await fetch(
        `${config.url}/rest/v1/user_roles?select=role&email=eq.${encodeURIComponent(email)}`,
        { headers: config.headers },
      );
      const roleData = await roleResponse.json().catch(() => null);
      if (Array.isArray(roleData) && roleData[0]?.role) {
        setUserRole(roleData[0].role);
      }
    } catch {
      // noop
    }
  }

  async function loadIdeas() {
    const config = getSupabaseConfig();
    if (!config) {
      setIdeas([]);
      setIdeasLoading(false);
      return;
    }

    setIdeasLoading(true);
    try {
      const response = await fetch(
        `${config.url}/rest/v1/agent_ideas?select=*&order=votes.desc,created_at.desc&limit=50`,
        { headers: config.headers },
      );
      const data = await response.json().catch(() => null);
      if (Array.isArray(data)) {
        setIdeas(data);
      } else {
        setIdeas([]);
      }
    } finally {
      setIdeasLoading(false);
    }
  }

  async function submitIdea() {
    const config = getSupabaseConfig();
    if (!config || !ideaTitle.trim() || !ideaDescription.trim()) return;

    setSubmittingIdea(true);
    try {
      await fetch(`${config.url}/rest/v1/agent_ideas`, {
        method: "POST",
        headers: {
          ...config.headers,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          title: ideaTitle.trim(),
          description: ideaDescription.trim(),
          submitted_by: userName || "Anonyme",
          submitted_email: userEmail ?? "",
          category: ideaCategory,
          priority: ideaPriority,
          votes: 0,
          status: "new",
          voted_by: [],
        }),
      });

      setShowIdeaModal(false);
      setIdeaTitle("");
      setIdeaDescription("");
      setIdeaCategory("other");
      setIdeaPriority("nice-to-have");
      await loadIdeas();
    } finally {
      setSubmittingIdea(false);
    }
  }

  async function voteIdea(idea: Idea) {
    const config = getSupabaseConfig();
    if (!config || !userEmail) return;

    const alreadyVoted = Array.isArray(idea.voted_by) && idea.voted_by.includes(userEmail);
    const currentVoters = Array.isArray(idea.voted_by) ? [...idea.voted_by] : [];
    const nextVoters = alreadyVoted
      ? currentVoters.filter((email) => email !== userEmail)
      : [...currentVoters, userEmail];

    const nextVotes = alreadyVoted
      ? Math.max(0, (idea.votes ?? 0) - 1)
      : (idea.votes ?? 0) + 1;

    await fetch(`${config.url}/rest/v1/agent_ideas?id=eq.${encodeURIComponent(idea.id)}`, {
      method: "PATCH",
      headers: {
        ...config.headers,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        votes: nextVotes,
        voted_by: nextVoters,
      }),
    });

    await loadIdeas();
  }

  async function updateIdeaStatus(ideaId: string, nextStatus: string) {
    const config = getSupabaseConfig();
    if (!config || !isAdmin) return;

    await fetch(`${config.url}/rest/v1/agent_ideas?id=eq.${encodeURIComponent(ideaId)}`, {
      method: "PATCH",
      headers: {
        ...config.headers,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: nextStatus,
      }),
    });

    await loadIdeas();
  }

  function beginRefreshPolling() {
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch("/api/status", { credentials: "include" });
        if (!response.ok) return;

        const data = await response.json();
        const nextStatus: RefreshState["status"] =
          data?.status === "running" || data?.status === "done" || data?.status === "error"
            ? data.status
            : "idle";

        setRefreshState({
          status: nextStatus,
          timestamp: data?.timestamp ?? null,
          message:
            nextStatus === "done"
              ? "Refresh termine avec succes"
              : nextStatus === "error"
                ? "Le refresh a echoue"
                : "Refresh en cours",
        });

        if (nextStatus === "done" || nextStatus === "error") {
          window.clearInterval(interval);
          setRefreshBusy(false);
          if (nextStatus === "done") {
            void hydrateHubData();
          }
        }
      } catch {
        // noop while polling
      }
    }, 2000);

    window.setTimeout(() => {
      window.clearInterval(interval);
      setRefreshBusy(false);
    }, 300000);
  }

  async function handleRefresh() {
    setRefreshBusy(true);
    setRefreshState({
      status: "running",
      timestamp: refreshState.timestamp,
      message: "Refresh lance...",
    });

    try {
      const response = await fetch("/api/refresh", { method: "POST", credentials: "include" });
      const data = await response.json().catch(() => null);

      if (!response.ok && response.status !== 429) {
        setRefreshBusy(false);
        setRefreshState({
          status: "error",
          timestamp: refreshState.timestamp,
          message: "Impossible de lancer le refresh",
        });
        return;
      }

      setRefreshState({
        status: "running",
        timestamp: data?.timestamp ?? refreshState.timestamp,
        message:
          response.status === 429 ? "Refresh deja en cours" : "Refresh pipeline demarre",
      });
      beginRefreshPolling();
    } catch {
      setRefreshBusy(false);
      setRefreshState({
        status: "error",
        timestamp: refreshState.timestamp,
        message: "Le refresh n'est pas disponible",
      });
    }
  }

  function openBrainstorm(context?: BrainstormContext) {
    setBrainstormOpen(true);
    setBrainstormContext(context ?? null);
  }

  async function sendBrainstormMessage(message = brainstormInput, context?: BrainstormContext) {
    const nextMessage = message.trim();
    if (!nextMessage) return;

    const nextContext = context ?? brainstormContext;
    const history = [...brainstormMessages, { role: "user" as const, content: nextMessage }];

    setBrainstormBusy(true);
    setBrainstormInput("");
    setBrainstormMessages(history);
    if (context) {
      setBrainstormContext(context);
      setBrainstormOpen(true);
    }

    try {
      const response = await fetch("/api/brainstorm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: nextMessage,
          history: history.map(({ role, content }) => ({ role, content })),
          ...(nextContext ? { idea_context: nextContext } : {}),
        }),
      });

      const data = await response.json().catch(() => null);
      const reply =
        data?.response ??
        data?.message ??
        data?.text ??
        "Le service de brainstorm ne renvoie pas de contenu pour le moment.";

      setBrainstormMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: reply,
        },
      ]);
    } catch {
      setBrainstormMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Je n'arrive pas a joindre le brainstorm pour le moment. On peut continuer des que le service repond.",
        },
      ]);
    } finally {
      setBrainstormBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-[1180px] px-4 py-4 md:py-8 sm:px-6 lg:px-4 md:px-8 lg:py-10">
        <section className="overflow-hidden rounded-[30px] border border-white/[0.04] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
            {/* Brainstorm Chat - Main Feature */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-5 w-5 text-[#E8912D]" />
                <span className="text-sm font-semibold text-white">Brainstorm avec Claude</span>
                <span className="text-xs text-white/35">&mdash; Pose une question, lance une idee, ou demande une analyse</span>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <MessageSquare className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={brainstormInput}
                    onChange={(e) => setBrainstormInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && brainstormInput.trim() && !brainstormBusy) {
                        openBrainstorm();
                        setTimeout(() => void sendBrainstormMessage(), 100);
                      }
                    }}
                    placeholder="Ex: Quel agent devrait-on construire ensuite? Analyse le ROI de..."
                    className="h-14 w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] pl-12 pr-4 text-sm text-white outline-none placeholder:text-white/25 transition-all duration-300 hover:border-white/[0.12] focus:border-[#E8912D]/50 focus:ring-1 focus:ring-[#E8912D]/25 focus:bg-white/[0.04]"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (brainstormInput.trim()) {
                      openBrainstorm();
                      setTimeout(() => void sendBrainstormMessage(), 100);
                    } else {
                      openBrainstorm();
                    }
                  }}
                  disabled={brainstormBusy}
                  className="h-14 min-w-[130px] rounded-2xl bg-[#E8912D] px-6 text-sm font-semibold text-[#17140f] shadow-[0_18px_40px_rgba(232,145,45,0.22)] hover:bg-[#f0a94b] transition-all duration-200"
                >
                  {brainstormBusy ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="mr-2 h-4 w-4" />
                  )}
                  Brainstorm
                </Button>
              </div>
            </div>

        </section>

        {/* ── Client Quick-Selector ── */}
        <section className="mt-8 rounded-[26px] border border-white/[0.04] bg-[#17171b]/90 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-[#E8912D]" />
            <h2 className="text-lg font-bold text-white">Clients</h2>
            <Badge className="border border-[#E8912D]/20 bg-[#E8912D]/10 text-[10px] uppercase tracking-[0.18em] text-[#f6c978]">
              {hubClients.length} clients
            </Badge>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => { setClientSearch(e.target.value); setClientDropdownOpen(true); }}
              onFocus={() => setClientDropdownOpen(true)}
              onBlur={() => setTimeout(() => setClientDropdownOpen(false), 200)}
              placeholder="Accéder au workspace d'un client..."
              className="h-12 w-full rounded-2xl border border-white/[0.04] hover:border-white/[0.10] transition-all duration-300 bg-white/[0.03] pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#E8912D]/50 focus:ring-1 focus:ring-[#E8912D]/25"
            />
            {clientDropdownOpen && clientSearch.length > 0 && filteredClients.length > 0 && (
              <div className="absolute left-0 right-0 top-[52px] z-50 max-h-[260px] overflow-y-auto rounded-2xl border border-white/[0.04] hover:border-white/[0.10] transition-all duration-300 bg-[#1a1a1f] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                {filteredClients.slice(0, 8).map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      router.push(`/workspace/${client.id}`);
                      setClientSearch("");
                      setClientDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#E8912D]/10"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E8912D]/12 text-xs font-bold text-[#f6c978]">
                      {client.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{client.name}</div>
                      <div className="text-xs text-white/35">{client.industry || client.status}</div>
                    </div>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${client.health_score === "green" ? "bg-emerald-400" : client.health_score === "yellow" ? "bg-amber-300" : client.health_score === "red" ? "bg-red-400" : "bg-white/20"}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Derniers livrables ── */}
        {recentDeliverables.length > 0 && (
          <section className="mt-6 rounded-[26px] border border-white/[0.04] bg-[#17171b]/90 p-5">
            <div className="mb-4 flex items-center gap-3">
              <Package className="h-5 w-5 text-[#E8912D]" />
              <h2 className="text-lg font-bold text-white">Derniers livrables</h2>
            </div>
            <div className="space-y-2">
              {recentDeliverables.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => router.push(`/workspace/${d.client_id}`)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-white/[0.04] hover:border-white/[0.10] transition-all duration-300 bg-white/[0.02] px-4 py-3 text-left transition hover:bg-[#E8912D]/8"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-white">{d.client_name}</span>
                      <Badge className="shrink-0 border border-[#E8912D]/20 bg-[#E8912D]/10 text-[10px] uppercase tracking-[0.14em] text-[#f6c978]">
                        {d.type?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {d.title && <div className="mt-1 truncate text-xs text-white/40">{d.title}</div>}
                  </div>
                  <div className="shrink-0 text-xs text-white/30">
                    {new Date(d.created_at).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">AI Employees</h2>
            <Badge className="border border-emerald-500/20 bg-emerald-500/10 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
              {liveAgents} Live
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className="card-hover group relative overflow-hidden rounded-[26px] border border-white/[0.04] bg-[#17171b]/90 p-5"
              >
                <div
                  className="absolute inset-x-0 top-0 h-[3px] opacity-85"
                  style={{ background: `linear-gradient(90deg, ${agent.accent}, transparent)` }}
                />

                <div className="mb-4 flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black tracking-[0.12em]"
                    style={{ background: agent.surface, color: agent.accent }}
                  >
                    {agent.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[17px] font-bold tracking-[-0.02em] text-white">
                      {agent.name}
                    </div>
                    <div className="mt-1 text-[12px] text-white/42">{agent.subtitle}</div>
                  </div>
                </div>

                <p className="min-h-[72px] text-sm leading-6 text-white/55">{agent.description}</p>

                {agent.links ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {agent.links.map((link) => (
                      <Link
                        key={`${agent.name}-${link.href}`}
                        href={link.href}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#E8912D]/20 bg-[#E8912D]/10 px-3 py-2 text-xs font-semibold text-[#f6c978] no-underline transition hover:bg-[#E8912D]/16 hover:text-white"
                      >
                        {link.label}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-between">
                  <div
                    className={`inline-flex items-center gap-2 text-xs font-medium ${
                      agent.status === "live"
                        ? "text-emerald-300"
                        : agent.status === "soon"
                          ? "text-amber-200"
                          : "text-white/40"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        agent.status === "live"
                          ? "bg-emerald-400"
                          : agent.status === "soon"
                            ? "bg-amber-300"
                            : "bg-white/20"
                      }`}
                    />
                    {agent.statusLabel}
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/36 transition group-hover:bg-white/[0.07] group-hover:text-white/70">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
          <div className="rounded-[26px] border border-white/[0.04] bg-[#17171b]/90 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Quick Actions</h2>
                <p className="mt-1 text-sm text-white/45">
                  Raccourcis V1 pour les zones les plus consultees.
                </p>
              </div>
              <Badge className="border border-white/[0.04] bg-white/[0.03] text-white/45">
                4 raccourcis
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {quickActions.map((action) =>
                action.external ? (
                  <a
                    key={action.label}
                    href={action.href}
                    target="_blank"
                    rel="noreferrer"
                    className="card-hover rounded-2xl border border-white/[0.04] hover:border-white/[0.12] transition-all duration-300 bg-white/[0.02] p-4 no-underline"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{action.label}</div>
                        <div className="mt-1 text-xs text-white/38">{action.note}</div>
                      </div>
                      <ArrowUpRight className="mt-0.5 h-4 w-4 text-white/35" />
                    </div>
                  </a>
                ) : (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="card-hover rounded-2xl border border-white/[0.04] hover:border-white/[0.12] transition-all duration-300 bg-white/[0.02] p-4 no-underline"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{action.label}</div>
                        <div className="mt-1 text-xs text-white/38">{action.note}</div>
                      </div>
                      <ArrowUpRight className="mt-0.5 h-4 w-4 text-white/35" />
                    </div>
                  </Link>
                ),
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/[0.04] bg-[#17171b]/90 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Refresh Pipeline</h2>
                <p className="mt-1 text-sm text-white/45">
                  Etat du pipeline derriere la command center.
                </p>
              </div>
              {refreshState.status === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              ) : refreshState.status === "error" ? (
                <AlertTriangle className="h-5 w-5 text-amber-200" />
              ) : (
                <RefreshCw
                  className={`h-5 w-5 text-white/45 ${refreshBusy ? "animate-spin" : ""}`}
                />
              )}
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/[0.04] hover:border-white/[0.10] transition-all duration-300 bg-white/[0.02] p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/32">Statut</div>
                <div className="mt-2 text-sm font-semibold text-white">{refreshState.message}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.04] hover:border-white/[0.10] transition-all duration-300 bg-white/[0.02] p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/32">
                  Derniere info
                </div>
                <div className="mt-2 text-sm text-white/62">
                  {timestampLabel(refreshState.timestamp)}
                </div>
              </div>
            </div>

            <Button
              onClick={() => void handleRefresh()}
              disabled={refreshBusy}
              className="mt-5 h-11 w-full rounded-2xl bg-[#E8912D] text-sm font-semibold text-[#17140f] hover:bg-[#f0a94b]"
            >
              {refreshBusy ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Rafraichir les donnees
            </Button>
          </div>
        </section>

        <section className="mt-10 rounded-[26px] border border-white/[0.04] bg-[#17171b]/90 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Idees d&apos;agents</h2>
                <Badge className="border border-white/[0.04] bg-white/[0.03] text-white/45">
                  {ideas.length} idees
                </Badge>
              </div>
              <p className="mt-1 text-sm text-white/45">
                Tri, vote, statuts et brainstorm comme sur la V1.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-11 rounded-2xl border border-white/[0.04] hover:border-white/[0.10] transition-all duration-300 bg-white/[0.03] px-4 text-sm text-white outline-none focus:border-[#E8912D]"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
                className="h-11 rounded-2xl border border-white/[0.04] hover:border-white/[0.10] transition-all duration-300 bg-white/[0.03] px-4 text-sm text-white outline-none focus:border-[#E8912D]"
              >
                <option value="votes">Plus votees</option>
                <option value="newest">Recentes</option>
                <option value="status">Par statut</option>
              </select>

              

              <Button
                onClick={() => setShowIdeaModal(true)}
                className="h-11 rounded-2xl bg-[#E8912D] px-4 text-sm font-semibold text-[#17140f] hover:bg-[#f0a94b]"
              >
                <Lightbulb className="mr-2 h-4 w-4" />
                Proposer une idee
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ideasLoading ? (
              <div className="col-span-full rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/35">
                Chargement des idees...
              </div>
            ) : filteredIdeas.length === 0 ? (
              <div className="col-span-full rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/35">
                Aucune idee ne correspond aux filtres en cours.
              </div>
            ) : (
              filteredIdeas.map((idea) => {
                const voted =
                  Boolean(userEmail) &&
                  Array.isArray(idea.voted_by) &&
                  idea.voted_by.includes(userEmail as string);

                return (
                  <div
                    key={idea.id}
                    className="card-hover rounded-[24px] border border-white/[0.04] hover:border-white/[0.12] bg-white/[0.02] p-5 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[16px] font-bold tracking-[-0.02em] text-white">
                          {idea.title}
                        </h3>
                        <p className="mt-3 line-clamp-4 text-sm leading-6 text-white/55">
                          {idea.description}
                        </p>
                      </div>
                      <Badge
                        className={`border text-[10px] uppercase tracking-[0.18em] ${statusBadgeClasses(idea.status)}`}
                      >
                        {statusLabel(idea.status)}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge className={`border ${categoryBadgeClasses(idea.category)}`}>
                        {categoryLabel(idea.category)}
                      </Badge>
                      <Badge className={`border ${priorityBadgeClasses(idea.priority)}`}>
                        {priorityLabel(idea.priority)}
                      </Badge>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div className="text-xs text-white/32">
                        {idea.submitted_by || "Anonyme"} - {relativeTime(idea.created_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void sendBrainstormMessage(
                              "Analyse cette idee en detail: faisabilite technique, effort, dependances et ROI potentiel.",
                              {
                                title: idea.title,
                                description: idea.description,
                                category: idea.category,
                                priority: idea.priority,
                              },
                            )
                          }
                          className="rounded-xl border-orange-400/20 bg-orange-400/10 text-orange-300 hover:bg-orange-400/16 hover:text-white"
                        >
                          Analyser
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void voteIdea(idea)}
                          disabled={!userEmail}
                          className={`rounded-xl border-white/[0.04] bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white ${
                            voted ? "border-[#E8912D]/25 bg-[#E8912D]/10 text-[#f6c978]" : ""
                          }`}
                        >
                          ^ {idea.votes ?? 0}
                        </Button>
                      </div>
                    </div>

                    {isAdmin ? (
                      <div className="mt-4 border-t border-white/[0.04] pt-4">
                        <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-white/30">
                          Statut admin
                        </label>
                        <select
                          value={normalizeStatus(idea.status)}
                          onChange={(event) => void updateIdeaStatus(idea.id, event.target.value)}
                          className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-[#E8912D]"
                        >
                          <option value="new">Nouveau</option>
                          <option value="reviewing">En revision</option>
                          <option value="planned">Planifie</option>
                          <option value="building">En construction</option>
                          <option value="live">Live</option>
                          <option value="rejected">Rejete</option>
                        </select>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {showIdeaModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-white/[0.04] bg-[#131316] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold tracking-[-0.03em] text-white">
                  Proposer un agent
                </h3>
                <p className="mt-2 text-sm text-white/42">
                  Reprend le flow modal de la V1, avec analyse rapide et soumission directe.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIdeaModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] text-white/55 transition hover:bg-white/[0.06] hover:text-white"
              >
                X
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-white/32">
                  Titre de l&apos;agent
                </label>
                <Input
                  value={ideaTitle}
                  onChange={(event) => setIdeaTitle(event.target.value)}
                  placeholder="Ex: Client Success Agent"
                  className="h-12 rounded-2xl border hover:border-white/[0.15] transition-all duration-200-white/[0.06] bg-white/[0.03] text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-white/32">
                  Description
                </label>
                <Textarea
                  value={ideaDescription}
                  onChange={(event) => setIdeaDescription(event.target.value)}
                  placeholder="Probleme resolu, integratons, ROI, signaux utiles..."
                  rows={5}
                  className="rounded-2xl border hover:border-white/[0.15] transition-all duration-200-white/[0.06] bg-white/[0.03] text-white"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-white/32">
                    Categorie
                  </label>
                  <select
                    value={ideaCategory}
                    onChange={(event) => setIdeaCategory(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-white/[0.04] hover:border-white/[0.10] transition-all duration-300 bg-white/[0.03] px-4 text-sm text-white outline-none focus:border-[#E8912D]"
                  >
                    {categoryOptions
                      .filter((option) => option.value)
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-white/32">
                    Priorite
                  </label>
                  <select
                    value={ideaPriority}
                    onChange={(event) => setIdeaPriority(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-white/[0.04] hover:border-white/[0.10] transition-all duration-300 bg-white/[0.03] px-4 text-sm text-white outline-none focus:border-[#E8912D]"
                  >
                    <option value="nice-to-have">Nice-to-have</option>
                    <option value="important">Important</option>
                    <option value="critical">Critique</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={() =>
                  void sendBrainstormMessage(
                    "Analyse cette idee en detail: faisabilite technique, effort, dependances, ROI et prochaines etapes.",
                    {
                      title: ideaTitle,
                      description: ideaDescription,
                      category: ideaCategory,
                      priority: ideaPriority,
                    },
                  )
                }
                className="h-11 flex-1 rounded-2xl border hover:border-white/[0.15] transition-all duration-200-orange-400/20 bg-orange-400/10 text-orange-300 hover:bg-orange-400/16 hover:text-white"
              >
                <Brain className="mr-2 h-4 w-4" />
                Analyser avec Claude
              </Button>
              <Button
                onClick={() => void submitIdea()}
                disabled={submittingIdea || !ideaTitle.trim() || !ideaDescription.trim()}
                className="h-11 flex-1 rounded-2xl bg-[#E8912D] text-sm font-semibold text-[#17140f] hover:bg-[#f0a94b]"
              >
                {submittingIdea ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lightbulb className="mr-2 h-4 w-4" />
                )}
                Soumettre
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <>
        <div
          className={`fixed inset-0 z-[75] bg-black/40 backdrop-blur-sm transition ${
            brainstormOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setBrainstormOpen(false)}
        />
        <aside
          className={`fixed right-0 top-0 z-[80] flex h-screen w-full max-w-[440px] flex-col border-l border-white/[0.04] bg-[#121216] shadow-[0_30px_90px_rgba(0,0,0,0.45)] transition-transform duration-300 ${
            brainstormOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="border-b border-white/[0.04] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="h-2 w-2 rounded-full bg-orange-400" />
                  Brainstorm avec Claude
                </div>
                <p className="mt-1 text-xs text-white/40">
                  Faisabilite, effort, dependances et ROI des idees d&apos;agents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBrainstormOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] text-white/55 transition hover:bg-white/[0.06] hover:text-white"
              >
                X
              </button>
            </div>

            {brainstormContext ? (
              <div className="mt-4 rounded-2xl border hover:border-white/[0.15] transition-all duration-200 border-orange-400/15 bg-orange-400/8 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-orange-300/75">
                  Contexte
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {brainstormContext.title || "Idee en cours"}
                </div>
                {brainstormContext.description ? (
                  <p className="mt-1 text-xs leading-5 text-white/50">
                    {brainstormContext.description}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {brainstormMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto rounded-br-md bg-[#E8912D]/14 text-white"
                    : "rounded-bl-md bg-white/[0.04] text-white/80"
                }`}
              >
                {message.content}
              </div>
            ))}

            {brainstormBusy ? (
              <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-white/[0.04] px-4 py-3 text-sm text-white/45">
                Claude reflechit...
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/[0.04] px-5 py-4">
            <div className="flex gap-3">
              <Textarea
                value={brainstormInput}
                onChange={(event) => setBrainstormInput(event.target.value)}
                placeholder="Pose une question, ou demande une analyse technique..."
                rows={2}
                className="min-h-[52px] rounded-2xl border hover:border-white/[0.15] transition-all duration-200-white/[0.06] bg-white/[0.03] text-white"
              />
              <Button
                onClick={() => void sendBrainstormMessage()}
                disabled={brainstormBusy || !brainstormInput.trim()}
                className="h-auto min-w-[110px] rounded-2xl bg-orange-400 px-4 font-semibold text-[#17140f] hover:bg-orange-300"
              >
                {brainstormBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Envoyer"}
              </Button>
            </div>
          </div>
        </aside>
      </>
    </div>
  );
}
