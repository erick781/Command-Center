"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  StrategyFieldLabel,
  StrategyPanel,
  strategyInputClassName,
  strategyNativeSelectClassName,
} from "@/components/strategy/strategy-ui";
import {
  BUSINESS_MODELS,
  STRATEGY_NICHES,
  type StrategyBusinessModel,
  type StrategyProfileEditableSection,
  type StrategyNiche,
  type StrategyProfileRecord,
} from "@/lib/strategy-schema";

function listValue(values: string[]) {
  return values.join(", ");
}

function parseList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function StrategyProfileEditor({
  canWrite,
  profile,
  onBoolean,
  onSectionPatch,
}: {
  canWrite: boolean;
  profile: StrategyProfileRecord | null;
  onBoolean: (section: "marketing", key: string, value: boolean) => void;
  onSectionPatch: (
    section: StrategyProfileEditableSection,
    patch: Record<string, unknown>,
  ) => void;
}) {
  if (!profile) {
    return null;
  }

  return (
    <StrategyPanel
      title="Profile Editor"
      description="Construit la memoire persistante du client: qui il est, comment il vend, a qui il parle et quelles contraintes doivent guider la strategie."
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <StrategyFieldLabel>Brand name</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("identity", { brandName: event.target.value })
              }
              value={profile.identity.brandName}
            />
          </div>
          <div>
            <StrategyFieldLabel>Website</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("identity", { websiteUrl: event.target.value })
              }
              value={profile.identity.websiteUrl}
            />
          </div>
          <div>
            <StrategyFieldLabel>Language</StrategyFieldLabel>
            <select
              className={strategyNativeSelectClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("identity", {
                  language: event.target.value as "fr" | "en",
                })
              }
              value={profile.identity.language}
            >
              <option value="fr">Francais</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <StrategyFieldLabel>Region / Geo</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onSectionPatch("identity", { region: event.target.value })}
              value={profile.identity.region}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <StrategyFieldLabel>Niche</StrategyFieldLabel>
            <select
              className={strategyNativeSelectClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("business", {
                  niche: event.target.value as StrategyNiche | "",
                })
              }
              value={profile.business.niche}
            >
              <option value="">Auto-detect</option>
              {STRATEGY_NICHES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <StrategyFieldLabel>Business model</StrategyFieldLabel>
            <select
              className={strategyNativeSelectClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("business", {
                  businessModel: event.target.value as StrategyBusinessModel | "",
                })
              }
              value={profile.business.businessModel}
            >
              <option value="">A definir</option>
              {BUSINESS_MODELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <StrategyFieldLabel>Industry</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onSectionPatch("business", { industry: event.target.value })}
              value={profile.business.industry}
            />
          </div>
          <div>
            <StrategyFieldLabel>Sub-industry</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("business", { subIndustry: event.target.value })
              }
              value={profile.business.subIndustry}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <StrategyFieldLabel>Main offer</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onSectionPatch("offers", { mainOffer: event.target.value })}
              value={profile.offers.mainOffer}
            />
          </div>
          <div>
            <StrategyFieldLabel>Offer type</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onSectionPatch("business", { offerType: event.target.value })}
              value={profile.business.offerType}
            />
          </div>
          <div>
            <StrategyFieldLabel>Pricing model</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("business", { pricingModel: event.target.value })
              }
              value={profile.business.pricingModel}
            />
          </div>
          <div>
            <StrategyFieldLabel>Promo / Financing</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("offers", {
                  promoModel: event.target.value,
                })
              }
              value={profile.offers.promoModel}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <StrategyFieldLabel>Average ticket</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("business", { averageTicket: event.target.value })
              }
              value={profile.business.averageTicket}
            />
          </div>
          <div>
            <StrategyFieldLabel>AOV</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("business", { averageOrderValue: event.target.value })
              }
              value={profile.business.averageOrderValue}
            />
          </div>
          <div>
            <StrategyFieldLabel>Margin range</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("business", {
                  estimatedMarginRange: event.target.value,
                })
              }
              value={profile.business.estimatedMarginRange}
            />
          </div>
          <div>
            <StrategyFieldLabel>Target geo</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onSectionPatch("audience", { targetGeo: event.target.value })}
              value={profile.audience.targetGeo}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StrategyFieldLabel>ICP / Audience</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("audience", {
                  idealCustomerProfile: event.target.value,
                })
              }
              rows={4}
              value={profile.audience.idealCustomerProfile}
            />
          </div>
          <div>
            <StrategyFieldLabel>Objections / Pain points</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("audience", {
                  objections: parseList(event.target.value),
                })
              }
              placeholder="comma or newline separated"
              rows={4}
              value={listValue(profile.audience.objections)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <StrategyFieldLabel>Funnel type</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onSectionPatch("funnel", { funnelType: event.target.value })}
              value={profile.funnel.funnelType}
            />
          </div>
          <div>
            <StrategyFieldLabel>Conversion event</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("funnel", { conversionEvent: event.target.value })
              }
              value={profile.funnel.conversionEvent}
            />
          </div>
          <div>
            <StrategyFieldLabel>CRM / Tooling</StrategyFieldLabel>
            <Input
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) => onSectionPatch("funnel", { crmUsed: event.target.value })}
              value={profile.funnel.crmUsed}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StrategyFieldLabel>Sales process / Follow-up</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("funnel", {
                  salesProcess: event.target.value,
                })
              }
              rows={4}
              value={profile.funnel.salesProcess}
            />
          </div>
          <div>
            <StrategyFieldLabel>Acquisition channels</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("marketing", {
                  acquisitionChannels: parseList(event.target.value),
                })
              }
              rows={4}
              value={listValue(profile.marketing.acquisitionChannels)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Meta active", profile.marketing.metaActive, "metaActive"],
            ["Google active", profile.marketing.googleActive, "googleActive"],
            ["Email active", profile.marketing.emailActive, "emailActive"],
            ["SMS active", profile.marketing.smsActive, "smsActive"],
          ].map(([label, checked, key]) => (
            <label
              key={String(key)}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white/65"
            >
              <input
                checked={Boolean(checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent"
                disabled={!canWrite}
                onChange={(event) =>
                  onBoolean("marketing", String(key), event.target.checked)
                }
                type="checkbox"
              />
              {label}
            </label>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StrategyFieldLabel>Sales capacity</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("operations", {
                  salesCapacity: event.target.value,
                })
              }
              rows={3}
              value={profile.operations.salesCapacity}
            />
          </div>
          <div>
            <StrategyFieldLabel>Serviceability constraints</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("operations", {
                  serviceabilityConstraints: event.target.value,
                })
              }
              rows={3}
              value={profile.operations.serviceabilityConstraints}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StrategyFieldLabel>Inventory constraints</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("operations", {
                  inventoryConstraints: event.target.value,
                })
              }
              rows={3}
              value={profile.operations.inventoryConstraints}
            />
          </div>
          <div>
            <StrategyFieldLabel>Booking delay</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("operations", {
                  bookingDelay: event.target.value,
                })
              }
              rows={3}
              value={profile.operations.bookingDelay}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StrategyFieldLabel>Tone of voice</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("compliance", {
                  toneOfVoice: event.target.value,
                })
              }
              rows={3}
              value={profile.compliance.toneOfVoice}
            />
          </div>
          <div>
            <StrategyFieldLabel>Legal / compliance notes</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("compliance", {
                  legalComplianceNotes: event.target.value,
                })
              }
              rows={3}
              value={profile.compliance.legalComplianceNotes}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StrategyFieldLabel>Internal notes</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("internalNotes", {
                  internalContextNotes: event.target.value,
                })
              }
              rows={3}
              value={profile.internalNotes.internalContextNotes}
            />
          </div>
          <div>
            <StrategyFieldLabel>Recurring blockers</StrategyFieldLabel>
            <Textarea
              className={strategyInputClassName}
              disabled={!canWrite}
              onChange={(event) =>
                onSectionPatch("internalNotes", {
                  recurringBlockers: parseList(event.target.value),
                })
              }
              rows={3}
              value={listValue(profile.internalNotes.recurringBlockers)}
            />
          </div>
        </div>
      </div>
    </StrategyPanel>
  );
}
