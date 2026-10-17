import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import SharedApp from "./SharedApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import type { UserRole } from "@/lib/roles";

type AppUser = { id: string; identifier: string; name: string; role: UserRole; zone: string; kourel: string };
const inactivityTimeoutMs = 5 * 60 * 1000;

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    void apiRequest<{ user: AppUser }>("/api/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!user) return;

    let timer: ReturnType<typeof setTimeout>;
    const expireSession = () => {
      setAuthMessage("Session fermée après 5 minutes d’inactivité.");
      setUser(null);
      void apiRequest("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    };
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(expireSession, inactivityTimeoutMs);
    };
    const activityEvents = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"];

    activityEvents.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  async function signOut() {
    await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setAuthMessage("");
    setUser(null);
  }

  if (checking) return <main className="signin"><LoaderCircle className="animate-spin" /></main>;
  if (!user) return <AuthScreen message={authMessage} onAuthenticated={(authenticatedUser) => { setAuthMessage(""); setUser(authenticatedUser); }} />;
  return <SharedApp key={`${user.id}:${user.role}:${user.zone}:${user.kourel}`} user={user} onSignOut={() => void signOut()} />;
}

function AuthScreen({ message: initialMessage, onAuthenticated }: { message: string; onAuthenticated: (user: AppUser) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);

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
