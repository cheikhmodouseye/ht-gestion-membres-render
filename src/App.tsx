import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LoaderCircle } from "lucide-react";
import SharedApp from "./SharedApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

function userInfo(user: User) {
  return {
    id: user.id,
    email: user.email || "",
    name: String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Utilisateur"),
  };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setChecking(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (checking) return <main className="signin"><LoaderCircle className="animate-spin" /></main>;
  if (!user) return <AuthScreen />;
  return <SharedApp user={userInfo(user)} onSignOut={() => void supabase.auth.signOut()} />;
}

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("Compte créé. Consultez votre e-mail pour confirmer l'inscription.");
    setBusy(false);
  }

  return <main className="signin"><div className="signin-card"><img src="/logo-ht.jpg" alt="Logo Hizbut-Tarqiyyah" /><h1>HT Gestion des membres</h1><p>{mode === "signin" ? "Connectez-vous pour accéder aux données partagées de la Daara." : "Créez votre compte pour utiliser l'application."}</p><form className="signin-form" onSubmit={submit}><Input name="email" type="email" placeholder="Adresse e-mail" autoComplete="email" required /><Input name="password" type="password" placeholder="Mot de passe (6 caractères minimum)" minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} required />{message && <div className="auth-message">{message}</div>}<Button size="lg" type="submit" disabled={busy}>{busy ? "Traitement..." : mode === "signin" ? "Se connecter" : "Créer le compte"}</Button></form><button className="auth-mode" type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>{mode === "signin" ? "Créer un nouveau compte" : "J'ai déjà un compte"}</button></div></main>;
}
