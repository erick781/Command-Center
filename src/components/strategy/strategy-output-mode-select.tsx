"use client";

import { StrategyFieldLabel, StrategyPanel, strategyNativeSelectClassName } from "@/components/strategy/strategy-ui";
import { OUTPUT_MODES, type StrategyOutputMode } from "@/lib/strategy-schema";

export function StrategyOutputModeSelect({
  canWrite,
  value,
  onChange,
}: {
  canWrite: boolean;
  value: StrategyOutputMode;
  onChange: (value: StrategyOutputMode) => void;
}) {
  return (
    <StrategyPanel
      title="Mode de Sortie"
      description="Selectionne le livrable principal que le strategist copilot doit privilegier pour cette passe."
    >
      <div>
        <StrategyFieldLabel>Livrable</StrategyFieldLabel>
        <select
          className={strategyNativeSelectClassName}
          disabled={!canWrite}
          onChange={(event) => onChange(event.target.value as StrategyOutputMode)}
          value={value}
        >
          {OUTPUT_MODES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </StrategyPanel>
  );
}
