import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { LoaderCircle } from "lucide-react";
import SharedApp from "./SharedApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/roles";

type Profile = { role: UserRole; full_name: string };

function userInfo(user: User, profile: Profile) {
  return {
    id: user.id,
    email: user.email || "",
    name: profile.full_name || user.email?.split("@")[0] || "Utilisateur",
    role: profile.role,
  };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  async function applySession(session: Session | null) {
    const nextUser = session?.user ?? null;
    setUser(nextUser);
    setProfile(null);
    if (nextUser) {
      const { data } = await supabase.from("profiles").select("role, full_name").eq("id", nextUser.id).maybeSingle();
      if (data) setProfile(data as Profile);
    }
    setChecking(false);
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { void applySession(session); });
    return () => data.subscription.unsubscribe();
  }, []);

  if (checking) return <main className="signin"><LoaderCircle className="animate-spin" /></main>;
  if (!user) return <AuthScreen />;
  if (!profile) return <UnauthorizedScreen email={user.email || ""} onSignOut={() => void supabase.auth.signOut()} />;
  return <SharedApp user={userInfo(user, profile)} onSignOut={() => void supabase.auth.signOut()} />;
}

function AuthScreen() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setMessage("Identifiants incorrects ou compte non autorisé.");
    setBusy(false);
  }

  return <main className="signin"><div className="signin-card"><img src="/logo-ht.jpg" alt="Logo Hizbut-Tarqiyyah" /><h1>HT Gestion des membres</h1><p>Connectez-vous avec le compte qui vous a été attribué par l’administrateur.</p><form className="signin-form" onSubmit={submit}><Input name="email" type="email" placeholder="Adresse e-mail" autoComplete="email" required /><Input name="password" type="password" placeholder="Mot de passe" autoComplete="current-password" required />{message && <div className="auth-message">{message}</div>}<Button size="lg" type="submit" disabled={busy}>{busy ? "Connexion..." : "Se connecter"}</Button></form></div></main>;
}

function UnauthorizedScreen({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return <main className="signin"><div className="signin-card"><img src="/logo-ht.jpg" alt="Logo Hizbut-Tarqiyyah" /><h1>Compte non autorisé</h1><p>Le compte {email} n’a pas encore reçu de rôle. Contactez l’administrateur de l’application.</p><Button variant="outline" onClick={onSignOut}>Se déconnecter</Button></div></main>;
}
