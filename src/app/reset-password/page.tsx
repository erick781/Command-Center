"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { LanguageToggle } from "@/components/language-toggle";

const resetCopy = {
  en: {
    title: "New Password",
    subtitle: "Choose a new password for your account",
    passwordLabel: "New password",
    confirmLabel: "Confirm password",
    submit: "Update password",
    loading: "Updating...",
    success: "Password updated! Redirecting...",
    mismatch: "Passwords do not match.",
    error: "Unable to update password.",
    languageLabel: "Language",
    minLength: "Password must be at least 8 characters.",
  },
  fr: {
    title: "Nouveau mot de passe",
    subtitle: "Choisissez un nouveau mot de passe pour votre compte",
    passwordLabel: "Nouveau mot de passe",
    confirmLabel: "Confirmer le mot de passe",
    submit: "Mettre à jour",
    loading: "Mise à jour...",
    success: "Mot de passe mis à jour ! Redirection...",
    mismatch: "Les mots de passe ne correspondent pas.",
    error: "Impossible de mettre à jour le mot de passe.",
    languageLabel: "Langue",
    minLength: "Le mot de passe doit contenir au moins 8 caractères.",
  },
} as const;

export default function ResetPasswordPage() {
  const { language } = useLanguage();
  const t = resetCopy[language];
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t.minLength);
      return;
    }
    if (password !== confirm) {
      setError(t.mismatch);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(t.error);
    } else {
      setSuccess(t.success);
      setTimeout(() => router.replace("/new"), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#111113] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm bg-[#1a1a1f] border-white/[0.06]">
        <CardHeader className="text-center pb-2">
          <div className="mb-4 flex justify-end">
            <LanguageToggle ariaLabel={t.languageLabel} />
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8912D] to-[#ffca06] flex items-center justify-center text-sm font-black text-[#1a1a1f] mx-auto mb-3">P</div>
          <CardTitle className="text-lg">{t.title}</CardTitle>
          <p className="text-white/40 text-xs mt-1">{t.subtitle}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder={t.passwordLabel}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-white/[0.04] border-white/[0.08]"
              required
            />
            <Input
              type="password"
              placeholder={t.confirmLabel}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="bg-white/[0.04] border-white/[0.08]"
              required
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            {success && <p className="text-green-400 text-xs">{success}</p>}
            <Button
              type="submit"
              disabled={loading || !!success}
              className="w-full bg-[#E8912D] hover:bg-[#E8912D]/80 text-white font-semibold"
            >
              {loading ? t.loading : t.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
