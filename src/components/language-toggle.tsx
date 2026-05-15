"use client";

import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";

export function LanguageToggle(props: {
  ariaLabel?: string;
  className?: string;
}) {
  const { ariaLabel = "Language", className } = props;
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-full border border-white/[0.04] bg-white/[0.02] p-1 shadow-inner shadow-black/20",
        className,
      )}
    >
      {(["fr", "en"] as const).map((option) => {
        const active = language === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => setLanguage(option)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] transition",
              active
                ? "bg-[#6366f1] text-white shadow-[0_10px_20px_rgba(232,145,45,0.18)]"
                : "text-white/50 hover:bg-white/[0.05] hover:text-white",
            )}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
