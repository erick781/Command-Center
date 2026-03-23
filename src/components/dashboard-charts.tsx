"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { BarList, CategoryBar } from "@tremor/react";

interface TrendData {
  mois: string;
  Livrables: number;
  Strategies: number;
}

interface TypeDist {
  type: string;
  count: number;
}

interface IndustryDist {
  industrie: string;
  clients: number;
}

interface HealthDist {
  status: string;
  clients: number;
}

interface TopClient {
  name: string;
  value: number;
  industry: string;
}

interface TrendsResponse {
  activity_trends: TrendData[];
  type_distribution: TypeDist[];
  industry_distribution: IndustryDist[];
  health_distribution?: HealthDist[];
  top_clients?: TopClient[];
  updated_at: string;
}

const COLORS = ["#E8912D", "#f6c978", "#16a34a", "#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#fbbf24"];

const HEALTH_COLORS: Record<string, string> = {
  green: "#16a34a",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
};

const HEALTH_LABELS: Record<string, string> = {
  green: "Sain",
  yellow: "À surveiller",
  orange: "Attention",
  red: "Critique",
};

const TYPE_LABELS: Record<string, string> = {
  diagnostic: "Diagnostic",
  brief: "Brief créatif",
  resume: "Résumé",
  email: "Email",
  publicite: "Publicité",
  social: "Réseaux sociaux",
  blog: "Blog",
  autre: "Autre",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a1f]/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="mb-1 text-xs font-medium text-white/60">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function DashboardCharts() {
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrends() {
      const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
      try {
        const res = await fetch(`${apiBase}/api/dashboard/trends`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setTrends(data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    void fetchTrends();
  }, []);

  if (loading) {
    return (
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[320px] animate-pulse rounded-[26px] border border-white/[0.04] bg-[#17171b]/90" />
        ))}
      </section>
    );
  }

  if (!trends) return null;

  const activityData = trends.activity_trends;
  const typeDist = trends.type_distribution.map((d) => ({
    name: TYPE_LABELS[d.type] || d.type,
    value: d.count,
  }));

  // Tremor BarList data for top clients by retainer
  const topClientsData = (trends.top_clients || []).map((c) => ({
    name: c.name,
    value: c.value,
    icon: () => (
      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#E8912D]/15 text-[9px] font-bold text-[#f6c978]">
        {c.name.slice(0, 2).toUpperCase()}
      </span>
    ),
  }));

  // Tremor CategoryBar data for health distribution
  const healthDist = trends.health_distribution || [];
  const totalHealth = healthDist.reduce((s, h) => s + h.clients, 0) || 1;
  const healthValues = ["green", "yellow", "orange", "red"].map((status) => {
    const found = healthDist.find((h) => h.status === status);
    return found ? Math.round((found.clients / totalHealth) * 100) : 0;
  });
  const healthColorsList = ["#16a34a", "#eab308", "#f97316", "#ef4444"];

  // Industry bar list for Tremor
  const industryBarData = trends.industry_distribution.slice(0, 8).map((d) => ({
    name: d.industrie,
    value: d.clients,
  }));

  return (
    <section className="mt-8 space-y-4">
      {/* Row 1: Recharts - Activity + Type Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Activity Trends - Area Chart */}
        <div className="rounded-[26px] border border-white/[0.04] bg-[#17171b]/90 p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white">Activité — 6 derniers mois</h3>
            <p className="mt-1 text-xs text-white/35">Livrables et stratégies générés</p>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradLivrables" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8912D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E8912D" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradStrategies" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="mois"
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Livrables"
                  stroke="#E8912D"
                  strokeWidth={2}
                  fill="url(#gradLivrables)"
                />
                <Area
                  type="monotone"
                  dataKey="Strategies"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fill="url(#gradStrategies)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#E8912D]" />
              <span className="text-xs text-white/45">Livrables</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-white/45">Stratégies</span>
            </div>
          </div>
        </div>

        {/* Type Distribution - Donut Chart */}
        <div className="rounded-[26px] border border-white/[0.04] bg-[#17171b]/90 p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white">Répartition des livrables</h3>
            <p className="mt-1 text-xs text-white/35">Par type de contenu généré</p>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {typeDist.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(26,26,31,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "13px",
                    color: "white",
                    backdropFilter: "blur(8px)",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Tremor components - Top Clients + Health + Industries */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Clients by Retainer - Tremor BarList */}
        {topClientsData.length > 0 && (
          <div className="rounded-[26px] border border-white/[0.04] bg-[#17171b]/90 p-5">
            <div className="mb-4">
              <h3 className="text-base font-bold text-white">Top clients — Retainer mensuel</h3>
              <p className="mt-1 text-xs text-white/35">Classement par valeur de contrat</p>
            </div>
            <div className="tremor-dark">
              <BarList
                data={topClientsData}
                valueFormatter={(v: number) => `$${v.toLocaleString()}`}
                color="amber"
                className="mt-2"
              />
            </div>
          </div>
        )}

        {/* Portfolio Health + Industry Distribution */}
        <div className="space-y-4">
          {/* Health Distribution - Tremor CategoryBar */}
          {healthDist.length > 0 && (
            <div className="rounded-[26px] border border-white/[0.04] bg-[#17171b]/90 p-5">
              <div className="mb-4">
                <h3 className="text-base font-bold text-white">Santé du portfolio</h3>
                <p className="mt-1 text-xs text-white/35">Distribution des scores de santé clients</p>
              </div>
              <div className="tremor-dark">
                <CategoryBar
                  values={healthValues}
                  colors={["emerald", "yellow", "orange", "rose"]}
                  className="mt-4"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {healthDist.map((h) => (
                  <div key={h.status} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: HEALTH_COLORS[h.status] || "#666" }}
                    />
                    <span className="text-xs text-white/50">
                      {HEALTH_LABELS[h.status] || h.status}: {h.clients}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Industry Distribution - Tremor BarList */}
          {industryBarData.length > 0 && (
            <div className="rounded-[26px] border border-white/[0.04] bg-[#17171b]/90 p-5">
              <div className="mb-3">
                <h3 className="text-base font-bold text-white">Industries</h3>
                <p className="mt-1 text-xs text-white/35">Répartition par secteur</p>
              </div>
              <div className="tremor-dark">
                <BarList
                  data={industryBarData}
                  valueFormatter={(v: number) => `${v} clients`}
                  color="amber"
                  className="mt-2"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
