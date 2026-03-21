"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/hub");
  };

  return (
    <div className="min-h-screen bg-[#111113] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm bg-[#1a1a1f] border-white/[0.06]">
        <CardHeader className="text-center pb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8912D] to-[#ffca06] flex items-center justify-center text-sm font-black text-[#1a1a1f] mx-auto mb-3">P</div>
          <CardTitle className="text-lg">Command Center</CardTitle>
          <p className="text-white/40 text-xs mt-1">Connexion</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08]" required />
            </div>
            <div>
              <Input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08]" required />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full bg-[#E8912D] hover:bg-[#E8912D]/80 text-white font-semibold">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
