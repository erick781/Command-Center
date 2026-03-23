"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

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

interface TrendsResponse {
  activity_trends: TrendData[];
  type_distribution: TypeDist[];
  industry_distribution: IndustryDist[];
  updated_at: string;
}

const COLORS = ["#E8912D", "#f6c978", "#16a34a", "#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#fbbf24"];

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
        {[0, 1].map((i) => (
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
  const industryDist = trends.industry_distribution;

  return (
    <section className="mt-8 grid gap-4 md:grid-cols-2">
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
    </section>
  );
}
