"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";

const links = [
  { href: "/hub", label: "Hub" },
  { href: "/rapports", label: "Rapports" },
  { href: "/clients", label: "Clients" },
  { href: "/strategie", label: "Strategie" },
];

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);

  const handleRefreshData = async () => {
    try {
      setRefreshingData(true);
      await fetch("/api/refresh", { method: "POST", credentials: "include" });
    } finally {
      setRefreshingData(false);
      router.refresh();
    }
  };

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();

        if (!active) return;
        setUserEmail(data.user?.email ?? null);
      } finally {
        if (active) setLoadingUser(false);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  const initials = (() => {
    const source = userEmail ?? "Partenaire";
    return source
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "P";
  })();

  const activeLink = links.find(
    (link) => path === link.href || path.startsWith(`${link.href}/`),
  );

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-[#0f0f12]/95 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/hub" className="group flex items-center gap-3 no-underline">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8912D] via-[#f6bb57] to-[#ffd980] shadow-[0_14px_30px_rgba(232,145,45,0.22)] ring-1 ring-white/10 transition-transform duration-200 group-hover:-translate-y-0.5">
              <Image src="/logo.png" alt="Partenaire.io" width={28} height={28} className="h-7 w-7 object-contain" />
            </span>
            <span className="hidden sm:flex flex-col leading-none">
              <span className="text-[10px] uppercase tracking-[0.34em] text-white/35">Partenaire.io</span>
              <span className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-white">
                Command Center
              </span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 rounded-full border border-white/[0.04] bg-white/[0.02] p-1 shadow-inner shadow-black/20">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] transition-all no-underline",
                  path.startsWith(l.href)
                    ? "bg-[#E8912D] text-[#17140f] shadow-[0_10px_20px_rgba(232,145,45,0.22)]"
                    : "text-white/45 hover:bg-white/[0.05] hover:text-white"
                )}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRefreshData()}
              disabled={refreshingData}
              className="rounded-full border border-white/[0.04] bg-white/[0.02] px-4 py-2 text-[13px] font-medium text-white/70 transition hover:border-white/[0.10] hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
            >
              {refreshingData ? "Refreshing..." : "Refresh Data"}
            </button>
            <Link
              href="/admin"
              className="rounded-full border border-white/[0.04] bg-white/[0.02] px-4 py-2 text-[13px] font-medium text-white/70 transition hover:border-white/[0.10] hover:bg-white/[0.06] hover:text-white no-underline"
            >
              Admin
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-white/[0.04] bg-white/[0.02] px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#E8912D] to-[#ffd96b] text-[11px] font-bold tracking-wide text-[#17140f] shadow-[0_10px_20px_rgba(232,145,45,0.2)]">
                {initials}
              </div>
              <div className="hidden lg:flex min-w-0 flex-col pr-1">
                <span className="max-w-[180px] truncate text-[12px] font-medium text-white/85">
                  {loadingUser ? "Chargement..." : userEmail ?? "Invité"}
                </span>
                <span className="text-[10px] uppercase tracking-[0.28em] text-white/32">
                  {activeLink ? activeLink.label : "Workspace"}
                </span>
              </div>
              {userEmail ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="rounded-full px-3 py-1.5 text-[12px] font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-60"
                >
                  {signingOut ? "..." : "Logout"}
                </button>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full px-3 py-1.5 text-[12px] font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white no-underline"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.04] bg-white/[0.02] text-[18px] text-white/70 transition hover:border-white/[0.10] hover:bg-white/[0.06] hover:text-white"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </header>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 flex h-full w-[88vw] max-w-sm flex-col border-l border-white/[0.04] bg-[#0f0f12] p-5 pt-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] md:hidden">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
              <Link href="/hub" onClick={() => setOpen(false)} className="flex items-center gap-3 no-underline">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8912D] to-[#ffd96b] text-[11px] font-black text-[#17140f]">
                  <Image src="/logo.png" alt="Partenaire.io" width={24} height={24} className="h-6 w-6 object-contain" />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="text-[9px] uppercase tracking-[0.32em] text-white/35">Partenaire.io</span>
                  <span className="mt-1 text-[15px] font-semibold text-white">Command Center</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.04] text-white/50 transition hover:bg-white/[0.05] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.04] bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#E8912D] to-[#ffd96b] text-[11px] font-bold tracking-wide text-[#17140f]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {loadingUser ? "Chargement..." : userEmail ?? "Invité"}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/32">
                    {activeLink ? activeLink.label : "Workspace"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleRefreshData();
                    setOpen(false);
                  }}
                  disabled={refreshingData}
                  className="rounded-full border border-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >
                  {refreshingData ? "..." : "Refresh Data"}
                </button>
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white no-underline"
                >
                  Admin
                </Link>
                {userEmail ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleSignOut();
                      setOpen(false);
                    }}
                    className="rounded-full border border-[#E8912D]/35 bg-[#E8912D]/10 px-3 py-1.5 text-[12px] font-medium text-[#f4c87d] transition hover:bg-[#E8912D]/15"
                  >
                    Logout
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-[#E8912D]/35 bg-[#E8912D]/10 px-3 py-1.5 text-[12px] font-medium text-[#f4c87d] transition hover:bg-[#E8912D]/15 no-underline"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-1">
              <p className="px-1 pb-2 text-[11px] uppercase tracking-[0.3em] text-white/30">
                Navigation
              </p>
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "mb-1 block rounded-2xl px-4 py-3 text-sm font-medium no-underline transition",
                    path.startsWith(l.href)
                      ? "bg-[#E8912D]/12 text-[#f4c87d] ring-1 ring-[#E8912D]/20"
                      : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                  )}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
