import { NextResponse } from "next/server";

import { getBackendApiBase } from "@/lib/backend-api";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireStrategyUser } from "@/lib/strategy-store";

type UsageBucket = {
  cache_hit_rate?: number;
  cached_tokens?: number;
  calls?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_cost?: number;
};

type UsageDetail = {
  cache_read_tokens?: number | string | null;
  client_name?: string | null;
  endpoint?: string | null;
  estimated_cost?: number | string | null;
  input_tokens?: number | string | null;
  model_used?: string | null;
  output_tokens?: number | string | null;
};

type RateLimitValue = {
  allowed?: boolean;
  limit?: number;
  used?: number;
};

type BackendUsageResponse = {
  month?: UsageBucket;
  rate_limits?: Record<string, RateLimitValue>;
  today?: UsageBucket;
  today_details?: UsageDetail[];
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeBucket(bucket?: UsageBucket) {
  const calls = Math.max(0, Math.round(toNumber(bucket?.calls)));
  const inputTokens = Math.max(0, Math.round(toNumber(bucket?.input_tokens)));
  const outputTokens = Math.max(0, Math.round(toNumber(bucket?.output_tokens)));
  const cachedTokens = Math.max(0, Math.round(toNumber(bucket?.cached_tokens)));
  const totalCost = Math.max(0, toNumber(bucket?.total_cost));
  const cacheHitRate = Math.max(0, toNumber(bucket?.cache_hit_rate));

  return {
    averageCostPerCall: calls > 0 ? totalCost / calls : 0,
    cacheHitRate,
    cachedTokens,
    calls,
    inputTokens,
    outputTokens,
    totalCost,
    totalTokens: inputTokens + outputTokens,
  };
}

function normalizeDetail(detail: UsageDetail, index: number) {
  const inputTokens = Math.max(0, Math.round(toNumber(detail.input_tokens)));
  const outputTokens = Math.max(0, Math.round(toNumber(detail.output_tokens)));
  const cachedTokens = Math.max(0, Math.round(toNumber(detail.cache_read_tokens)));
  const estimatedCost = Math.max(0, toNumber(detail.estimated_cost));

  return {
    cacheHitRate: inputTokens > 0 ? (cachedTokens / inputTokens) * 100 : 0,
    cachedTokens,
    clientName: typeof detail.client_name === "string" ? detail.client_name : "",
    endpoint: typeof detail.endpoint === "string" ? detail.endpoint : "",
    estimatedCost,
    id: `${detail.endpoint ?? "call"}-${detail.client_name ?? "unknown"}-${index}`,
    inputTokens,
    modelUsed: typeof detail.model_used === "string" ? detail.model_used : "",
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

function summarizeDimension(
  details: ReturnType<typeof normalizeDetail>[],
  pickKey: (detail: ReturnType<typeof normalizeDetail>) => string,
) {
  const summary = new Map<
    string,
    { calls: number; estimatedCost: number; key: string; totalTokens: number }
  >();

  details.forEach((detail) => {
    const key = pickKey(detail).trim();
    if (!key) {
      return;
    }

    const existing = summary.get(key) ?? {
      calls: 0,
      estimatedCost: 0,
      key,
      totalTokens: 0,
    };

    existing.calls += 1;
    existing.estimatedCost += detail.estimatedCost;
    existing.totalTokens += detail.totalTokens;
    summary.set(key, existing);
  });

  return Array.from(summary.values())
    .sort((left, right) => {
      if (right.estimatedCost !== left.estimatedCost) {
        return right.estimatedCost - left.estimatedCost;
      }

      if (right.calls !== left.calls) {
        return right.calls - left.calls;
      }

      return right.totalTokens - left.totalTokens;
    })
    .slice(0, 6);
}

function normalizeRateLimits(rateLimits?: Record<string, RateLimitValue>) {
  return Object.fromEntries(
    Object.entries(rateLimits ?? {}).map(([key, value]) => [
      key,
      {
        allowed: Boolean(value?.allowed),
        limit: Math.max(0, Math.round(toNumber(value?.limit))),
        used: Math.max(0, Math.round(toNumber(value?.used))),
      },
    ]),
  );
}

export async function GET() {
  const supabase = await createRouteSupabaseClient();
  const user = await requireStrategyUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.canAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const backendResponse = await fetch(`${getBackendApiBase()}/api/strategy/usage`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const payload = (await backendResponse.json().catch(() => null)) as BackendUsageResponse | null;

    if (!backendResponse.ok || !payload) {
      return NextResponse.json(
        {
          error:
            typeof (payload as { error?: unknown } | null)?.error === "string"
              ? (payload as { error: string }).error
              : "Unable to load usage stats.",
        },
        { status: backendResponse.status || 502 },
      );
    }

    const recentCalls = Array.isArray(payload.today_details)
      ? payload.today_details.map(normalizeDetail).slice(0, 12)
      : [];

    return NextResponse.json({
      month: normalizeBucket(payload.month),
      rateLimits: normalizeRateLimits(payload.rate_limits),
      recentCalls,
      topClients: summarizeDimension(recentCalls, (detail) => detail.clientName),
      topEndpoints: summarizeDimension(recentCalls, (detail) => detail.endpoint),
      topModels: summarizeDimension(recentCalls, (detail) => detail.modelUsed),
      today: normalizeBucket(payload.today),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load usage stats.",
      },
      { status: 500 },
    );
  }
}
