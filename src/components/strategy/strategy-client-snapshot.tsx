"use client";

import type { Dispatch, SetStateAction } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StrategyPanel, strategyInputClassName } from "@/components/strategy/strategy-ui";
import type { StrategyProfileRecord, StrategySeedClient } from "@/lib/strategy-schema";

export function StrategyClientSnapshot({
  clients,
  contextLoading,
  dropdownClients,
  onSelectClient,
  profile,
  search,
  selectedClient,
  setSearch,
  setShowDropdown,
  showDropdown,
}: {
  clients: StrategySeedClient[];
  contextLoading: boolean;
  dropdownClients: StrategySeedClient[];
  onSelectClient: (client: StrategySeedClient) => void;
  profile: StrategyProfileRecord | null;
  search: string;
  selectedClient: StrategySeedClient | null;
  setSearch: Dispatch<SetStateAction<string>>;
  setShowDropdown: Dispatch<SetStateAction<boolean>>;
  showDropdown: boolean;
}) {
  return (
    <StrategyPanel
      title="Profil Client"
      description="Charge le profil persistant, les signaux existants et la posture du client avant de cadrer la demande du jour."
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="relative">
            <label className="mb-1.5 block text-xs text-white/40">Client</label>
            <Input
              className={strategyInputClassName}
              onBlur={() => {
                window.setTimeout(() => setShowDropdown(false), 120);
              }}
              onChange={(event) => {
                setSearch(event.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Rechercher un client..."
              value={search}
            />
            {showDropdown && search.length > 0 && dropdownClients.length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#222225] shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                        {dropdownClients.map((client) => (
                          <button
                            key={client.id}
                            className="block w-full px-3 py-3 text-left text-sm text-white/68 transition hover:bg-white/[0.05] hover:text-white"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              onSelectClient(client);
                            }}
                            type="button"
                          >
                            {client.name}
                          </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/28">
              Etat du profil
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {contextLoading
                ? "Hydratation du contexte..."
                : profile
                  ? `${profile.completenessScore}% complet`
                  : "Selection requise"}
            </div>
            <div className="mt-1 text-xs text-white/40">
              {profile
                ? `${profile.missingImportantFields.length} champs critiques manquants`
                : `${clients.length} clients detectes`}
            </div>
          </div>
        </div>

        {selectedClient && profile ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge className="border border-[#6366f1]/20 bg-[#6366f1]/10 text-indigo-300">
                {profile.business.industry || "Industrie a confirmer"}
              </Badge>
              <Badge className="border border-white/10 bg-white/[0.04] text-white/60">
                {profile.business.businessModel || "Business model a cadrer"}
              </Badge>
              <Badge className="border border-white/10 bg-white/[0.04] text-white/60">
                {profile.funnel.funnelType || "Funnel a definir"}
              </Badge>
              <Badge className="border border-white/10 bg-white/[0.04] text-white/60">
                {profile.offers.mainOffer || "Offre principale a completer"}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              {[
                { label: "Website", value: profile.identity.websiteUrl || "Website manquant" },
                { label: "Geo", value: profile.audience.targetGeo || profile.identity.region || "Geo a confirmer" },
                { label: "AOV / Ticket", value: profile.business.averageOrderValue || profile.business.averageTicket || "--" },
                { label: "Canaux", value: profile.marketing.acquisitionChannels.join(", ") || "--" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="text-sm font-semibold text-white">{item.value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/28">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-white/38">
            Selectionne un client pour charger son contexte, son profil persistant et l&apos;historique strategie.
          </div>
        )}
      </div>
    </StrategyPanel>
  );
}
