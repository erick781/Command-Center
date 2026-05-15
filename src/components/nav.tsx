"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/components/language-provider";
import { loadCurrentUserAccess } from "@/lib/current-user-access";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";

const links = [
  { href: "/new", labels: { en: "New", fr: "Nouveau" } },
  { adminOnly: true, href: "/clients", labels: { en: "Clients", fr: "Clients" } },
  { href: "/runs", labels: { en: "Runs", fr: "Runs" } },
  { href: "/ops", labels: { en: "Ops", fr: "Ops" } },
];

const navCopy = {
  en: {
    admin: "Admin",
    closeMenu: "Close menu",
    languageLabel: "Language",
    loading: "Loading...",
    login: "Login",
    logout: "Logout",
    navigation: "Navigation",
    openMenu: "Open menu",
    refresh: "Refresh",
    refreshing: "Refreshing...",
    userFallback: "Guest",
    workspace: "Workspace",
  },
  fr: {
    admin: "Admin",
    closeMenu: "Fermer le menu",
    languageLabel: "Langue",
    loading: "Chargement...",
    login: "Connexion",
    logout: "Déconnexion",
    navigation: "Navigation",
    openMenu: "Ouvrir le menu",
    refresh: "Actualiser",
    refreshing: "Actualisation...",
    userFallback: "Invité",
    workspace: "Espace de travail",
  },
} as const;

export function Nav() {
  const { language } = useLanguage();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);
  const copy = navCopy[language];
  const canAdmin = userRole === "admin" || userRole === "super_admin";
  const visibleLinks = links.filter((link) => !link.adminOnly || canAdmin);

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
        const access = await loadCurrentUserAccess();
        if (!active) return;
        setUserEmail(access.email);
        setUserRole(access.role);
      } finally {
        if (active) setLoadingUser(false);
      }
    };
    loadUser();
    return () => { active = false; };
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
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#0a0a0f]/95 backdrop-blur-2xl shadow-[0_1px_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.36)]">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link href="/new" className="group flex items-center gap-3 no-underline">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8912D] via-[#f6bb57] to-[#ffd980] shadow-[0_8px_20px_rgba(232,145,45,0.28)] ring-1 ring-white/10 transition-all duration-200 group-hover:shadow-[0_10px_28px_rgba(232,145,45,0.38)]">
              <Image src="/logo.png" alt="Partenaire.io" width={24} height={24} className="h-6 w-6 object-contain" />
            </span>
            <span className="hidden sm:flex flex-col leading-none">
              <span className="text-[10px] uppercase tracking-[0.32em] text-white/30">Partenaire.io</span>
              <span className="mt-0.5 text-[15px] font-semibold tracking-[-0.02em] text-white/90">
                Command Center
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 rounded-xl border border-white/[0.05] bg-white/[0.025] p-1 shadow-inner shadow-black/20">
            {visibleLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-4 py-2 text-[13px] font-medium tracking-[-0.01em] transition-all no-underline",
                  path === l.href || path.startsWith(`${l.href}/`)
                    ? "bg-[#6366f1] text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)]"
                    : "text-white/45 hover:bg-white/[0.06] hover:text-white/85"
                )}>
                {l.labels[language]}
              </Link>
            ))}
          </nav>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-2">
            <LanguageToggle ariaLabel={copy.languageLabel} />
            <button
              type="button"
              onClick={() => void handleRefreshData()}
              disabled={refreshingData}
              className="rounded-lg border border-white/[0.05] bg-white/[0.025] px-3.5 py-2 text-[13px] font-medium text-white/55 transition hover:border-white/[0.10] hover:bg-white/[0.06] hover:text-white/85 disabled:opacity-50"
            >
              {refreshingData ? copy.refreshing : copy.refresh}
            </button>
            {canAdmin ? (
              <Link
                href="/admin"
                className="rounded-lg border border-white/[0.05] bg-white/[0.025] px-3.5 py-2 text-[13px] font-medium text-white/55 transition hover:border-white/[0.10] hover:bg-white/[0.06] hover:text-white/85 no-underline"
              >
                {copy.admin}
              </Link>
            ) : null}

            {/* User pill */}
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.025] pl-1.5 pr-1.5 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#818cf8] text-[11px] font-bold tracking-wide text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)]">
                {initials}
              </div>
              <div className="hidden lg:flex min-w-0 flex-col px-1">
                <span className="max-w-[160px] truncate text-[12px] font-medium text-white/80">
                  {loadingUser ? copy.loading : userEmail ?? copy.userFallback}
                </span>
                <span className="text-[10px] uppercase tracking-[0.26em] text-white/28">
                  {activeLink ? activeLink.labels[language] : copy.workspace}
                </span>
              </div>
              {userEmail ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="rounded-lg px-2.5 py-1 text-[12px] font-medium text-white/45 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60"
                >
                  {signingOut ? "..." : copy.logout}
                </button>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg px-2.5 py-1 text-[12px] font-medium text-white/45 transition hover:bg-white/[0.06] hover:text-white no-underline"
                >
                  {copy.login}
                </Link>
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? copy.closeMenu : copy.openMenu}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.025] text-[17px] text-white/60 transition hover:border-white/[0.10] hover:bg-white/[0.06] hover:text-white"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 flex h-full w-[85vw] max-w-sm flex-col border-l border-white/[0.05] bg-[#0a0a0f] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] md:hidden">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
              <Link href="/new" onClick={() => setOpen(false)} className="flex items-center gap-3 no-underline">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8912D] to-[#ffd96b]">
                  <Image src="/logo.png" alt="Partenaire.io" width={22} height={22} className="h-5.5 w-5.5 object-contain" />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-white/30">Partenaire.io</span>
                  <span className="mt-0.5 text-[14px] font-semibold text-white">Command Center</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.05] text-white/40 transition hover:bg-white/[0.05] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Mobile user info */}
            <div className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#818cf8] text-[11px] font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white/85">
                    {loadingUser ? copy.loading : userEmail ?? copy.userFallback}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-white/28">
                    {activeLink ? activeLink.labels[language] : copy.workspace}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <LanguageToggle ariaLabel={copy.languageLabel} />
                <button
                  type="button"
                  onClick={() => { void handleRefreshData(); setOpen(false); }}
                  disabled={refreshingData}
                  className="rounded-lg border border-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >
                  {refreshingData ? "..." : copy.refresh}
                </button>
                {canAdmin ? (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white no-underline"
                  >
                    {copy.admin}
                  </Link>
                ) : null}
                {userEmail ? (
                  <button
                    type="button"
                    onClick={() => { void handleSignOut(); setOpen(false); }}
                    className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-1.5 text-[12px] font-medium text-red-300 transition hover:bg-red-500/15"
                  >
                    {copy.logout}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-indigo-500/25 bg-indigo-500/8 px-3 py-1.5 text-[12px] font-medium text-indigo-300 transition hover:bg-indigo-500/15 no-underline"
                  >
                    {copy.login}
                  </Link>
                )}
              </div>
            </div>

            {/* Mobile nav links */}
            <div className="mt-4 flex-1 overflow-y-auto pr-1">
              <p className="px-1 pb-2 text-[11px] uppercase tracking-[0.3em] text-white/25">
                {copy.navigation}
              </p>
              {visibleLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium no-underline transition",
                    path === l.href || path.startsWith(`${l.href}/`)
                      ? "bg-indigo-500/12 text-indigo-300 ring-1 ring-indigo-500/20"
                      : "text-white/50 hover:bg-white/[0.04] hover:text-white/85"
                  )}>
                  {l.labels[language]}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
