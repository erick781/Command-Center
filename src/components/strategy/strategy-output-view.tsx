"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StrategyEngineOutput, StrategyOutputMeta } from "@/lib/strategy-schema";

function Section({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-white/[0.06] bg-[#1a1a1f]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] uppercase tracking-[0.22em] text-indigo-400">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm leading-relaxed text-white/65">
          {items.map((item, index) => (
            <div key={`${title}-${index}`}>- {item}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function StrategyOutputView({
  meta,
  output,
}: {
  meta: StrategyOutputMeta | null;
  output: StrategyEngineOutput | null;
}) {
  if (!output) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge className="border border-[#6366f1]/20 bg-[#6366f1]/10 text-indigo-300">
          Strategy Output
        </Badge>
        {meta ? (
          <Badge className="border border-white/10 bg-white/[0.03] text-white/55">
            {meta.provider} / {meta.model}
          </Badge>
        ) : null}
      </div>

      <Card className="border-white/[0.06] bg-[#1a1a1f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] uppercase tracking-[0.22em] text-indigo-400">
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-line text-sm leading-relaxed text-white/65">
            {output.executiveSummary}
          </div>
        </CardContent>
      </Card>

      <Section title="What Changed" items={output.whatChanged} />

      <Card className="border-white/[0.06] bg-[#1a1a1f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] uppercase tracking-[0.22em] text-indigo-400">
            Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-white/65">
          <div>
            <span className="font-semibold text-white">Primary bottleneck: </span>
            {output.diagnosis.primaryBottleneck}
          </div>
          {output.diagnosis.likelyCauses.length > 0 ? (
            <div className="space-y-1">
              {output.diagnosis.likelyCauses.map((cause, index) => (
                <div key={`cause-${index}`}>- {cause}</div>
              ))}
            </div>
          ) : null}
          <div>{output.diagnosis.reasoning}</div>
        </CardContent>
      </Card>

      <Section title="Top Priorities" items={output.topPriorities} />
      <Section
        title="Recommended Actions - Ads"
        items={output.recommendedActions.ads}
      />
      <Section
        title="Recommended Actions - Creative"
        items={output.recommendedActions.creative}
      />
      <Section
        title="Recommended Actions - Funnel"
        items={output.recommendedActions.funnel}
      />
      <Section
        title="Recommended Actions - Offer / CRM / Ops"
        items={[
          ...output.recommendedActions.offer,
          ...output.recommendedActions.crmFollowUp,
          ...output.recommendedActions.clientOps,
          ...output.recommendedActions.salesProcess,
        ]}
      />
      <Section title="Risks / Constraints" items={output.risksConstraints} />

      <Card className="border-white/[0.06] bg-[#1a1a1f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] uppercase tracking-[0.22em] text-indigo-400">
            KPI Interpretation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-white/65">
          <div>
            <span className="font-semibold text-white">North star: </span>
            {output.kpiInterpretation.northStar.join(", ")}
          </div>
          <div>
            <span className="font-semibold text-white">Funnel: </span>
            {output.kpiInterpretation.funnel.join(", ")}
          </div>
          <div>
            <span className="font-semibold text-white">Efficiency: </span>
            {output.kpiInterpretation.efficiency.join(", ")}
          </div>
          <div>
            <span className="font-semibold text-white">Guardrails: </span>
            {output.kpiInterpretation.guardrails.join(", ")}
          </div>
          <div>{output.kpiInterpretation.explanation}</div>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-[#1a1a1f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] uppercase tracking-[0.22em] text-indigo-400">
            Test Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {output.testPlan.map((test, index) => (
            <div
              key={`test-${index}`}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/65"
            >
              <div className="font-semibold text-white">{test.name}</div>
              <div className="mt-1">{test.hypothesis}</div>
              <div className="mt-2 text-xs text-white/42">
                impact: {test.expectedImpact} | difficulty: {test.difficulty} | owner: {test.ownerType} | timeline: {test.timeline}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-[#1a1a1f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] uppercase tracking-[0.22em] text-indigo-400">
            Client-facing Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-line text-sm leading-relaxed text-white/65">
            {output.clientFacingSummary}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-[#1a1a1f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] uppercase tracking-[0.22em] text-indigo-400">
            Internal Execution Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {output.internalExecutionPlan.map((section, sectionIndex) => (
            <div key={`${section.ownerType}-${sectionIndex}`}>
              <div className="text-sm font-semibold text-white">{section.ownerType}</div>
              <div className="mt-2 space-y-1 text-sm text-white/65">
                {section.tasks.map((task, taskIndex) => (
                  <div key={`${section.ownerType}-${taskIndex}`}>- {task}</div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-[#1a1a1f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] uppercase tracking-[0.22em] text-indigo-400">
            Confidence Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-white/65">
          <div>
            <span className="font-semibold text-white">Level: </span>
            {output.confidenceNote.level}
          </div>
          <div>{output.confidenceNote.rationale}</div>
          {output.confidenceNote.missingInputs.length > 0 ? (
            <div>
              <span className="font-semibold text-white">Missing inputs: </span>
              {output.confidenceNote.missingInputs.join(", ")}
            </div>
          ) : null}
          {output.confidenceNote.sourceWarnings.length > 0 ? (
            <div>
              <span className="font-semibold text-white">Source warnings: </span>
              {output.confidenceNote.sourceWarnings.join(" | ")}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
