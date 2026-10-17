import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import SharedApp from "./SharedApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import type { UserRole } from "@/lib/roles";

type AppUser = { id: string; identifier: string; name: string; role: UserRole; zone: string; kourel: string };

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void apiRequest<{ user: AppUser }>("/api/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  async function signOut() {
    await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
  }

  if (checking) return <main className="signin"><LoaderCircle className="animate-spin" /></main>;
  if (!user) return <AuthScreen onAuthenticated={setUser} />;
  return <SharedApp key={`${user.id}:${user.role}:${user.zone}:${user.kourel}`} user={user} onSignOut={() => void signOut()} />;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: AppUser) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ user: AppUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: form.get("identifier"), password: form.get("password") }),
      });
      onAuthenticated(result.user);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="signin"><div className="signin-card"><img src="/logo-ht.jpg" alt="Logo Hizbut-Tarqiyyah" /><h1>HT Gestion des membres</h1><p>Connectez-vous avec le compte qui vous a été attribué par l’administrateur.</p><form className="signin-form" onSubmit={submit}><Input name="identifier" type="text" placeholder="Identifiant" autoComplete="username" autoCapitalize="none" required /><Input name="password" type="password" placeholder="Mot de passe" autoComplete="current-password" required />{message && <div className="auth-message">{message}</div>}<Button size="lg" type="submit" disabled={busy}>{busy ? "Connexion..." : "Se connecter"}</Button></form></div></main>;
}
