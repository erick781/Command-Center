"use client";

import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase";

type UserRole = "super_admin" | "admin" | "manager" | "viewer";

type UserRecord = {
  allowed_pages?: string[] | null;
  email: string;
  id: string;
  is_active?: boolean | null;
  name: string;
  role: UserRole | string;
  user_id?: string | null;
};

type FlashMessage = {
  kind: "error" | "success";
  text: string;
} | null;

type FormState = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
};

const pageOptions = [
  { id: "command-center.html", label: "Hub", route: "/hub" },
  { id: "portal.html", label: "Rapports", route: "/rapports" },
  { id: "ai-master-tracker.html", label: "Tracker", route: "/tracker" },
  { id: "client-hub.html", label: "Clients", route: "/clients" },
  { id: "strategy-generator.html", label: "Strategie", route: "/strategie" },
  { id: "client-reports/index.html", label: "Client Reports", route: "/client-reports" },
  { id: "admin.html", label: "Admin", route: "/admin" },
] as const;

const roleOptions: UserRole[] = ["viewer", "manager", "admin"];

const roleColor: Record<string, string> = {
  super_admin: "bg-purple-500/10 text-purple-300 ring-purple-500/25",
  admin: "bg-[#E8912D]/12 text-[#f6bb57] ring-[#E8912D]/25",
  manager: "bg-blue-500/10 text-blue-300 ring-blue-500/25",
  viewer: "bg-white/6 text-white/55 ring-white/10",
};

const baseInputClassName =
  "border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/28";

const selectClassName =
  "h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-[#E8912D] focus:bg-white/[0.06]";

const emptyCreateForm = (): FormState => ({
  email: "",
  name: "",
  password: "",
  role: "viewer",
});

function normalizeAllowedPages(value: string[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function defaultAllowedPages(role: UserRole) {
  if (role === "admin" || role === "super_admin") {
    return pageOptions.map((page) => page.id);
  }

  if (role === "manager") {
    return pageOptions
      .filter((page) => page.id !== "admin.html")
      .map((page) => page.id);
  }

  return [
    "command-center.html",
    "portal.html",
    "ai-master-tracker.html",
    "client-reports/index.html",
  ];
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashMessage>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<FormState>(emptyCreateForm());
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyCreateForm());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const isAdmin = currentUserRole === "admin" || currentUserRole === "super_admin";

  const summary = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => user.role === "admin" || user.role === "super_admin").length,
      managers: users.filter((user) => user.role === "manager").length,
      viewers: users.filter((user) => user.role === "viewer").length,
    };
  }, [users]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const supabase = createClient();

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user?.email) {
          setPageError("Session introuvable. Reconnectez-vous pour gerer les acces.");
          setLoading(false);
          setAccessReady(true);
          return;
        }

        setCurrentUserEmail(user.email);

        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("email", user.email)
          .maybeSingle();

        if (!active) return;

        if (roleError) {
          setPageError(roleError.message);
          setLoading(false);
          setAccessReady(true);
          return;
        }

        const role = roleData?.role ?? null;
        setCurrentUserRole(role);
        setAccessReady(true);

        if (role !== "admin" && role !== "super_admin") {
          setLoading(false);
          return;
        }

        await loadUsers({ silent: false });
      } catch (error) {
        if (!active) return;
        setPageError(
          error instanceof Error
            ? error.message
            : "Impossible de verifier vos permissions pour l'instant.",
        );
        setLoading(false);
        setAccessReady(true);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!flash) return;

    const timeout = window.setTimeout(() => {
      setFlash(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [flash]);

  async function loadUsers({ silent }: { silent: boolean }) {
    const supabase = createClient();

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setPageError(null);
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("role")
        .order("name");

      if (error) {
        throw error;
      }

      setUsers(Array.isArray(data) ? (data as UserRecord[]) : []);
      setPageError(null);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les utilisateurs pour l'instant.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function openEdit(user: UserRecord) {
    setEditingId(user.id);
    setEditingForm({
      email: user.email,
      name: user.name,
      password: "",
      role:
        user.role === "admin" || user.role === "manager" || user.role === "viewer"
          ? user.role
          : "viewer",
    });
  }

  function showSuccess(text: string) {
    setFlash({ kind: "success", text });
  }

  function showError(text: string) {
    setFlash({ kind: "error", text });
  }

  async function handleCreateUser() {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
      showError("Nom, email et mot de passe sont requis.");
      return;
    }

    if (createForm.password.length < 8) {
      showError("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    setCreating(true);
    const supabase = createClient();

    try {
      const { data: newUserId, error: createError } = await supabase.rpc("cc_create_user", {
        user_email: createForm.email.trim(),
        user_name: createForm.name.trim(),
        user_password: createForm.password,
        user_role: createForm.role,
      });

      if (createError) {
        throw createError;
      }

      const { error: roleError } = await supabase.from("user_roles").insert({
        allowed_pages: defaultAllowedPages(createForm.role),
        email: createForm.email.trim(),
        name: createForm.name.trim(),
        role: createForm.role,
        user_id: newUserId,
      });

      if (roleError) {
        throw roleError;
      }

      setCreateForm(emptyCreateForm());
      showSuccess(`Compte cree pour ${createForm.name.trim()}.`);
      await loadUsers({ silent: true });
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Impossible de creer cet utilisateur pour l'instant.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveUser(user: UserRecord) {
    if (!editingId) return;

    const nextName = editingForm.name.trim();
    const nextEmail = editingForm.email.trim();

    if (!nextName || !nextEmail) {
      showError("Nom et email sont requis pour enregistrer les changements.");
      return;
    }

    setSavingId(user.id);
    const supabase = createClient();

    try {
      const { error: updateError } = await supabase
        .from("user_roles")
        .update({
          email: nextEmail,
          name: nextName,
          role: editingForm.role,
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      if (user.user_id && nextEmail !== user.email) {
        const { error: emailError } = await supabase.rpc("cc_update_email", {
          new_email: nextEmail,
          target_user_id: user.user_id,
        });

        if (emailError) {
          throw emailError;
        }
      }

      if (user.user_id && editingForm.password) {
        const { error: passwordError } = await supabase.rpc("cc_update_password", {
          new_password: editingForm.password,
          target_user_id: user.user_id,
        });

        if (passwordError) {
          throw passwordError;
        }
      }

      setEditingId(null);
      setEditingForm(emptyCreateForm());
      showSuccess(
        editingForm.password
          ? `Utilisateur mis a jour et mot de passe reinitialise pour ${nextName}.`
          : `Utilisateur mis a jour pour ${nextName}.`,
      );
      await loadUsers({ silent: true });
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer cet utilisateur pour l'instant.",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteUser(user: UserRecord) {
    if (user.email === currentUserEmail) {
      showError("Vous ne pouvez pas supprimer votre propre acces.");
      return;
    }

    const confirmed = window.confirm(
      `Supprimer definitivement ${user.email} ?\n\nLe compte auth et son role seront supprimes.`,
    );

    if (!confirmed) return;

    setDeletingId(user.id);
    const supabase = createClient();

    try {
      const { error: roleDeleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", user.id);

      if (roleDeleteError) {
        throw roleDeleteError;
      }

      if (user.user_id) {
        const { error: authDeleteError } = await supabase.rpc("cc_delete_user", {
          target_user_id: user.user_id,
        });

        if (authDeleteError) {
          throw authDeleteError;
        }
      }

      showSuccess(`${user.email} a ete supprime.`);
      await loadUsers({ silent: true });
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer cet utilisateur pour l'instant.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleAllowedPage(user: UserRecord, pageId: string) {
    const currentPages = normalizeAllowedPages(user.allowed_pages);
    const nextPages = currentPages.includes(pageId)
      ? currentPages.filter((page) => page !== pageId)
      : [...currentPages, pageId];

    setTogglingKey(`${user.id}:${pageId}`);
    const previousUsers = users;
    setUsers((current) =>
      current.map((entry) =>
        entry.id === user.id ? { ...entry, allowed_pages: nextPages } : entry,
      ),
    );

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("user_roles")
        .update({ allowed_pages: nextPages })
        .eq("id", user.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      setUsers(previousUsers);
      showError(
        error instanceof Error
          ? error.message
          : "Impossible de modifier les permissions de page pour l'instant.",
      );
    } finally {
      setTogglingKey(null);
    }
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-4 rounded-[28px] border border-white/[0.08] bg-[#17171b]/85 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.32)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E8912D]/20 bg-[#E8912D]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f6bb57]">
                Admin Control
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white">
                  Administration des acces
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/52">
                  Gere les comptes, les roles et les permissions de navigation
                  depuis une seule surface. Cette page garde la logique V1 tout
                  en restant dans le shell V2.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/[0.04] px-3 py-1 text-white/60 ring-1 ring-white/10">
                {currentUserEmail ?? "Session inconnue"}
              </Badge>
              <Button
                onClick={() => void loadUsers({ silent: true })}
                disabled={!isAdmin || refreshing}
                className="h-10 rounded-full bg-[#E8912D] px-5 text-sm font-semibold text-[#17140f] hover:bg-[#f6bb57]"
              >
                {refreshing ? "Actualisation..." : "Actualiser"}
              </Button>
            </div>
          </div>

          {flash ? (
            <div
              className={
                flash.kind === "success"
                  ? "rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                  : "rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              }
            >
              {flash.text}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-white/[0.06] bg-white/[0.025]">
              <CardContent className="flex flex-col gap-1 py-5">
                <span className="text-[11px] uppercase tracking-[0.28em] text-white/32">
                  Utilisateurs
                </span>
                <strong className="text-2xl font-semibold text-white">
                  {summary.total}
                </strong>
              </CardContent>
            </Card>
            <Card className="border-white/[0.06] bg-white/[0.025]">
              <CardContent className="flex flex-col gap-1 py-5">
                <span className="text-[11px] uppercase tracking-[0.28em] text-white/32">
                  Admins
                </span>
                <strong className="text-2xl font-semibold text-white">
                  {summary.admins}
                </strong>
              </CardContent>
            </Card>
            <Card className="border-white/[0.06] bg-white/[0.025]">
              <CardContent className="flex flex-col gap-1 py-5">
                <span className="text-[11px] uppercase tracking-[0.28em] text-white/32">
                  Managers
                </span>
                <strong className="text-2xl font-semibold text-white">
                  {summary.managers}
                </strong>
              </CardContent>
            </Card>
            <Card className="border-white/[0.06] bg-white/[0.025]">
              <CardContent className="flex flex-col gap-1 py-5">
                <span className="text-[11px] uppercase tracking-[0.28em] text-white/32">
                  Viewers
                </span>
                <strong className="text-2xl font-semibold text-white">
                  {summary.viewers}
                </strong>
              </CardContent>
            </Card>
          </div>
        </section>

        {!accessReady || loading ? (
          <Card className="border-white/[0.06] bg-[#17171b]/85">
            <CardContent className="py-12 text-center text-sm text-white/45">
              Chargement de la console admin...
            </CardContent>
          </Card>
        ) : !isAdmin ? (
          <Card className="border-red-500/20 bg-red-500/8">
            <CardHeader>
              <CardTitle className="text-xl text-white">Acces reserve</CardTitle>
              <CardDescription className="text-white/55">
                Cette page est reservee aux administrateurs.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-white/55">
              {pageError ??
                "Votre role actuel ne vous permet pas de gerer les utilisateurs ou les permissions."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-4">
              {pageError ? (
                <Card className="border-red-500/20 bg-red-500/8">
                  <CardContent className="py-4 text-sm text-red-200">
                    {pageError}
                  </CardContent>
                </Card>
              ) : null}

              {users.length === 0 && !pageError ? (
                <Card className="border-white/[0.06] bg-[#17171b]/85">
                  <CardContent className="py-12 text-center text-sm text-white/45">
                    Aucun utilisateur trouve pour le moment.
                  </CardContent>
                </Card>
              ) : null}

              {users.map((user) => {
                const pages = normalizeAllowedPages(user.allowed_pages);
                const isEditing = editingId === user.id;
                const isDeleting = deletingId === user.id;
                const isSaving = savingId === user.id;
                const isSelf = user.email === currentUserEmail;

                return (
                  <Card
                    key={user.id}
                    className="overflow-hidden border-white/[0.06] bg-[#17171b]/85 shadow-[0_16px_48px_rgba(0,0,0,0.2)]"
                  >
                    <div className="h-1 w-full bg-gradient-to-r from-[#E8912D] via-[#f6bb57] to-transparent" />
                    <CardContent className="space-y-5 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold text-white">
                              {user.name || "Utilisateur sans nom"}
                            </h2>
                            <Badge
                              className={`px-3 py-1 ring-1 ${roleColor[user.role] || roleColor.viewer}`}
                            >
                              {String(user.role).replace("_", " ")}
                            </Badge>
                            <Badge className="bg-white/[0.04] px-3 py-1 text-white/50 ring-1 ring-white/10">
                              {user.is_active === false ? "Inactif" : "Actif"}
                            </Badge>
                            {isSelf ? (
                              <Badge className="bg-[#E8912D]/10 px-3 py-1 text-[#f6bb57] ring-1 ring-[#E8912D]/20">
                                Vous
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-white/45">{user.email}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            className="h-9 rounded-full border-white/[0.08] bg-white/[0.03] px-4 text-white/70 hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
                            onClick={() => {
                              if (isEditing) {
                                setEditingId(null);
                                setEditingForm(emptyCreateForm());
                              } else {
                                openEdit(user);
                              }
                            }}
                          >
                            {isEditing ? "Fermer" : "Modifier"}
                          </Button>
                          <Button
                            variant="outline"
                            className="h-9 rounded-full border-red-500/25 bg-red-500/8 px-4 text-red-200 hover:bg-red-500/15"
                            disabled={isSelf || isDeleting}
                            onClick={() => void handleDeleteUser(user)}
                          >
                            {isDeleting ? "Suppression..." : "Supprimer"}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/32">
                            Acces aux pages
                          </span>
                          <span className="text-xs text-white/38">
                            Compatibilite V1 conservee
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {pageOptions.map((page) => {
                            const active = pages.includes(page.id);
                            const isToggling = togglingKey === `${user.id}:${page.id}`;

                            return (
                              <button
                                key={page.id}
                                type="button"
                                onClick={() => void toggleAllowedPage(user, page.id)}
                                disabled={isToggling}
                                className={
                                  active
                                    ? "rounded-full border border-[#E8912D]/30 bg-[#E8912D]/10 px-3 py-2 text-left text-xs text-[#f6bb57] transition hover:bg-[#E8912D]/14 disabled:opacity-60"
                                    : "rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-xs text-white/45 transition hover:border-white/15 hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
                                }
                              >
                                <span className="block font-semibold">{page.label}</span>
                                <span className="mt-0.5 block text-[10px] opacity-70">
                                  {isToggling ? "Mise a jour..." : page.route}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="grid gap-4 rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/32">
                              Nom
                            </label>
                            <Input
                              value={editingForm.name}
                              onChange={(event) =>
                                setEditingForm((current) => ({
                                  ...current,
                                  name: event.target.value,
                                }))
                              }
                              className={baseInputClassName}
                              placeholder="Nom complet"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/32">
                              Courriel
                            </label>
                            <Input
                              type="email"
                              value={editingForm.email}
                              onChange={(event) =>
                                setEditingForm((current) => ({
                                  ...current,
                                  email: event.target.value,
                                }))
                              }
                              className={baseInputClassName}
                              placeholder="nom@entreprise.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/32">
                              Role
                            </label>
                            <select
                              value={editingForm.role}
                              onChange={(event) =>
                                setEditingForm((current) => ({
                                  ...current,
                                  role: event.target.value as UserRole,
                                }))
                              }
                              className={selectClassName}
                            >
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/32">
                              Nouveau mot de passe
                            </label>
                            <Input
                              type="password"
                              value={editingForm.password}
                              onChange={(event) =>
                                setEditingForm((current) => ({
                                  ...current,
                                  password: event.target.value,
                                }))
                              }
                              className={baseInputClassName}
                              placeholder="Laisser vide pour ne pas changer"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                            <Button
                              onClick={() => void handleSaveUser(user)}
                              disabled={isSaving}
                              className="h-10 rounded-full bg-[#E8912D] px-5 text-sm font-semibold text-[#17140f] hover:bg-[#f6bb57]"
                            >
                              {isSaving ? "Enregistrement..." : "Enregistrer"}
                            </Button>
                            <Button
                              variant="outline"
                              className="h-10 rounded-full border-white/[0.08] bg-white/[0.03] px-5 text-white/70 hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
                              onClick={() => {
                                setEditingId(null);
                                setEditingForm(emptyCreateForm());
                              }}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            <aside className="space-y-4">
              <Card className="border-white/[0.06] bg-[#17171b]/85">
                <CardHeader>
                  <CardTitle className="text-xl text-white">
                    Ajouter un utilisateur
                  </CardTitle>
                  <CardDescription className="text-white/52">
                    Cree un compte, assigne un role et applique les permissions
                    par defaut de la V1.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/32">
                      Nom complet
                    </label>
                    <Input
                      value={createForm.name}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className={baseInputClassName}
                      placeholder="Ex.: Camille Tremblay"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/32">
                      Courriel
                    </label>
                    <Input
                      type="email"
                      value={createForm.email}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      className={baseInputClassName}
                      placeholder="camille@partenaire.io"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/32">
                      Mot de passe
                    </label>
                    <Input
                      type="password"
                      value={createForm.password}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      className={baseInputClassName}
                      placeholder="Minimum 8 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/32">
                      Role
                    </label>
                    <select
                      value={createForm.role}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          role: event.target.value as UserRole,
                        }))
                      }
                      className={selectClassName}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-white/52">
                    <p className="font-medium text-white/78">
                      Permissions par defaut:
                    </p>
                    <p className="mt-2 leading-6">
                      {createForm.role === "admin"
                        ? "Acces complet a toutes les pages."
                        : createForm.role === "manager"
                          ? "Acces a toutes les pages sauf Admin."
                          : "Acces limite au Hub, Rapports, Tracker et Client Reports."}
                    </p>
                  </div>
                  <Button
                    onClick={() => void handleCreateUser()}
                    disabled={creating}
                    className="h-10 w-full rounded-full bg-[#E8912D] px-5 text-sm font-semibold text-[#17140f] hover:bg-[#f6bb57]"
                  >
                    {creating ? "Creation en cours..." : "Creer le compte"}
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
