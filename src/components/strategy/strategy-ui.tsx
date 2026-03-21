"use client";

import { type ReactNode, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const strategyInputClassName =
  "border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/25";

export const strategyNativeSelectClassName =
  "h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-[#E8912D]";

export function StrategyPanel({
  title,
  description,
  children,
  className,
  defaultCollapsed = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <Card className={cn("border-white/[0.06] bg-[#1a1a1f]", className)}>
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setCollapsed((v) => !v)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-white">{title}</CardTitle>
          <span className="text-xs text-white/30">{collapsed ? "▸" : "▾"}</span>
        </div>
        {description && !collapsed ? (
          <p className="text-xs leading-5 text-white/38">{description}</p>
        ) : null}
      </CardHeader>
      {!collapsed && <CardContent>{children}</CardContent>}
    </Card>
  );
}

export function StrategyFieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-xs text-white/40">{children}</label>;
}
