import {
  type StrategyBusinessModel,
  type StrategyKpiFramework,
  type StrategyNiche,
  type StrategyObjective,
  type StrategyOutputMode,
  type StrategyProfileRecord,
  type StrategyRequestRecord,
  type StrategyResolvedOverlays,
  type StrategySourceContextRecord,
} from "@/lib/strategy-schema";

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function resolveNiche(profile: StrategyProfileRecord): StrategyNiche {
  if (profile.business.niche) {
    return profile.business.niche;
  }

  const industry = normalizeText(profile.business.industry);
  const funnelType = normalizeText(profile.funnel.funnelType);

  if (industry.includes("ecom")) return "ecommerce";
  if (
    industry.includes("coach") ||
    industry.includes("info") ||
    industry.includes("formation") ||
    funnelType.includes("webinar")
  ) {
    return "coaching_high_ticket";
  }

  if (
    industry.includes("construction") ||
    industry.includes("toiture") ||
    industry.includes("renov") ||
    industry.includes("service")
  ) {
    return "construction_local_services";
  }

  if (
    funnelType.includes("appointment") ||
    funnelType.includes("booking") ||
    industry.includes("clinic") ||
    industry.includes("medspa")
  ) {
    return "appointment_local";
  }

  return "b2b_lead_gen";
}

export function resolveBusinessModel(
  profile: StrategyProfileRecord,
): StrategyBusinessModel {
  if (profile.business.businessModel) {
    return profile.business.businessModel;
  }

  const funnelType = normalizeText(profile.funnel.funnelType);
  const conversionEvent = normalizeText(profile.funnel.conversionEvent);
  const offerType = normalizeText(profile.business.offerType);

  if (
    funnelType.includes("purchase") ||
    conversionEvent.includes("purchase") ||
    offerType.includes("product")
  ) {
    return "direct_purchase";
  }
  if (funnelType.includes("application")) return "application_funnel";
  if (funnelType.includes("booked call") || conversionEvent.includes("booked call")) {
    return "booked_call";
  }
  if (funnelType.includes("quote") || conversionEvent.includes("estimate")) {
    return "quote_request";
  }
  if (funnelType.includes("appointment") || conversionEvent.includes("booking")) {
    return "appointment_booking";
  }
  if (offerType.includes("subscription")) return "subscription";
  if (offerType.includes("launch") || funnelType.includes("cohort")) {
    return "launch_cohort";
  }
  return "lead_gen";
}

function buildKpiFramework(
  niche: StrategyNiche,
  businessModel: StrategyBusinessModel,
  objective: StrategyObjective,
): StrategyKpiFramework {
  if (niche === "ecommerce" || businessModel === "direct_purchase") {
    return {
      northStar: ["profitable_revenue", "mer", "nc_roas"],
      funnel: [
        "ctr",
        "cpc",
        "product_page_view_rate",
        "add_to_cart_rate",
        "checkout_initiated_rate",
        "conversion_rate",
      ],
      efficiency: ["cac", "cpa", "roas", "aov"],
      guardrails: ["margin_pressure", "inventory_issues", "return_rate", "creative_fatigue"],
    };
  }

  if (
    niche === "coaching_high_ticket" ||
    businessModel === "application_funnel" ||
    businessModel === "booked_call"
  ) {
    return {
      northStar: ["booked_calls", "qualified_calls", "cash_collected", "cac_to_sale"],
      funnel: ["opt_in_rate", "cpl", "application_rate", "booking_rate", "show_up_rate", "close_rate"],
      efficiency: ["cpl", "cost_per_application", "cost_per_booked_call", "cac"],
      guardrails: ["lead_quality", "sales_capacity", "follow_up_delay", "refund_rate"],
    };
  }

  if (niche === "construction_local_services" || businessModel === "quote_request") {
    return {
      northStar: ["qualified_leads", "booked_estimates", "revenue_booked", "jobs_closed"],
      funnel: ["lead_to_contact_rate", "contact_speed", "lead_to_estimate_rate", "estimate_to_close_rate"],
      efficiency: ["cpl", "cost_per_qualified_lead", "cost_per_booked_estimate", "cac"],
      guardrails: ["service_area_mismatch", "sales_capacity", "booking_delay", "seasonality"],
    };
  }

  if (niche === "appointment_local" || businessModel === "appointment_booking") {
    return {
      northStar: ["booked_appointments", "attended_appointments", "revenue_per_booking"],
      funnel: ["booking_rate", "show_up_rate", "no_show_rate", "in_store_conversion"],
      efficiency: ["cost_per_booking", "cost_per_show"],
      guardrails: ["staff_capacity", "schedule_saturation", "geographic_mismatch"],
    };
  }

  const recoveryFirst = objective === "recover" || objective === "improve_lead_quality";

  return {
    northStar: recoveryFirst ? ["sqls", "pipeline_value", "closed_revenue"] : ["qualified_leads", "pipeline_value", "closed_revenue"],
    funnel: ["mql_rate", "sql_rate", "meeting_booked_rate", "opportunity_rate", "close_rate"],
    efficiency: ["cpl", "cost_per_sql", "cac", "payback_period"],
    guardrails: ["lead_quality", "long_sales_cycle", "sales_rep_response_lag"],
  };
}

function buildPriorityKpiOptions(kpis: StrategyKpiFramework) {
  return [...kpis.northStar, ...kpis.funnel, ...kpis.efficiency, ...kpis.guardrails];
}

export function resolveStrategyOverlays(input: {
  clientProfile: StrategyProfileRecord;
  requestContext: StrategyRequestRecord;
  sourceContext: StrategySourceContextRecord[];
}): StrategyResolvedOverlays {
  const niche = resolveNiche(input.clientProfile);
  const businessModel = resolveBusinessModel(input.clientProfile);
  const kpiFramework = buildKpiFramework(
    niche,
    businessModel,
    input.requestContext.objective,
  );
  const primaryOutputMode =
    input.requestContext.requestedOutputs[0] ?? ("30_day_action_plan" satisfies StrategyOutputMode);

  return {
    businessModel,
    niche,
    stage: input.requestContext.stage,
    objective: input.requestContext.objective,
    primaryOutputMode,
    kpiFramework,
    priorityKpiOptions: buildPriorityKpiOptions(kpiFramework),
  };
}
