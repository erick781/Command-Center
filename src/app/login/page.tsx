"use client";
import { useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/components/language-provider";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginCopy = {
  en: {
    errorFallback: "Unable to sign in.",
    languageLabel: "Language",
    loading: "Signing in...",
    password: "Password",
    submit: "Sign in",
    subtitle: "Sign in",
    forgotPassword: "Forgot password?",
    resetEmailPlaceholder: "Enter your email",
    sendReset: "Send reset link",
    sendingReset: "Sending...",
    resetSuccess: "If that email is registered, a reset link has been sent.",
    resetError: "Unable to send reset email.",
    backToLogin: "Back to sign in",
  },
  fr: {
    errorFallback: "Impossible de se connecter.",
    languageLabel: "Langue",
    loading: "Connexion...",
    password: "Mot de passe",
    submit: "Se connecter",
    subtitle: "Connexion",
    forgotPassword: "Mot de passe oublié ?",
    resetEmailPlaceholder: "Votre adresse courriel",
    sendReset: "Envoyer le lien",
    sendingReset: "Envoi en cours...",
    resetSuccess: "Si cette adresse est enregistrée, un lien de réinitialisation a été envoyé.",
    resetError: "Impossible d'envoyer l'email de réinitialisation.",
    backToLogin: "Retour à la connexion",
  },
} as const;

export default function LoginPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = loginCopy[language];

  // Reset password state
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message || t.errorFallback);
      setLoading(false);
      return;
    }
    router.replace("/new");
    router.refresh();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");
    setResetMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      setResetError(t.resetError);
    } else {
      setResetMessage(t.resetSuccess);
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
          <CardTitle className="text-lg">Command Center</CardTitle>
          <p className="text-white/40 text-xs mt-1">{t.subtitle}</p>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08]" required />
              <Input type="password" placeholder={t.password} value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08]" required />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <Button type="submit" disabled={loading}
                className="w-full bg-[#E8912D] hover:bg-[#E8912D]/80 text-white font-semibold">
                {loading ? t.loading : t.submit}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode("reset"); setResetEmail(email); }}
                  className="text-white/40 hover:text-white/70 text-xs transition-colors"
                >
                  {t.forgotPassword}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <Input type="email" placeholder={t.resetEmailPlaceholder} value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08]" required />
              {resetError && <p className="text-red-400 text-xs">{resetError}</p>}
              {resetMessage && <p className="text-green-400 text-xs">{resetMessage}</p>}
              <Button type="submit" disabled={resetLoading}
                className="w-full bg-[#E8912D] hover:bg-[#E8912D]/80 text-white font-semibold">
                {resetLoading ? t.sendingReset : t.sendReset}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setResetMessage(""); setResetError(""); }}
                  className="text-white/40 hover:text-white/70 text-xs transition-colors"
                >
                  {t.backToLogin}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
