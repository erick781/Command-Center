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
  },
  fr: {
    errorFallback: "Impossible de se connecter.",
    languageLabel: "Langue",
    loading: "Connexion...",
    password: "Mot de passe",
    submit: "Se connecter",
    subtitle: "Connexion",
  },
} as const;

export default function LoginPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const copy = loginCopy[language];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message || copy.errorFallback);
      setLoading(false);
      return;
    }
    router.replace("/new");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#111113] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm bg-[#1a1a1f] border-white/[0.06]">
        <CardHeader className="text-center pb-2">
          <div className="mb-4 flex justify-end">
            <LanguageToggle ariaLabel={copy.languageLabel} />
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8912D] to-[#ffca06] flex items-center justify-center text-sm font-black text-[#1a1a1f] mx-auto mb-3">P</div>
          <CardTitle className="text-lg">Command Center</CardTitle>
          <p className="text-white/40 text-xs mt-1">{copy.subtitle}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08]" required />
            </div>
            <div>
              <Input type="password" placeholder={copy.password} value={password} onChange={e => setPassword(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08]" required />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full bg-[#E8912D] hover:bg-[#E8912D]/80 text-white font-semibold">
              {loading ? copy.loading : copy.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
