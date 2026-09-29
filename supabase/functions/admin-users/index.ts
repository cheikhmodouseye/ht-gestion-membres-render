import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const roles = ["admin", "administratif", "social", "surveillant_kourel"] as const;
type Role = typeof roles[number];

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validIdentifier(value: unknown) {
  return typeof value === "string" && /^[a-z0-9._-]{3,40}$/.test(value);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    const authClient = createClient(supabaseUrl, anonKey);
    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return response({ error: "Session invalide." }, 401);

    const callerId = authData.user.id;
    const { data: caller } = await adminClient.from("profiles").select("role").eq("id", callerId).maybeSingle();
    if (caller?.role !== "admin") return response({ error: "Accès réservé à l’administrateur." }, 403);

    const body = await request.json();
    const action = body?.action;

    if (action === "list") {
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const { data: profiles, error: profileError } = await adminClient.from("profiles").select("id, full_name, role");
      if (profileError) throw profileError;
      const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
      return response({
        users: data.users
          .filter((user) => user.email?.endsWith("@ht-gestion.app"))
          .map((user) => {
            const profile = byId.get(user.id);
            return {
              id: user.id,
              identifier: user.email!.split("@")[0],
              fullName: profile?.full_name || "",
              role: profile?.role || "",
              createdAt: user.created_at,
              isCurrent: user.id === callerId,
            };
          }),
      });
    }

    if (action === "create") {
      const identifier = String(body.identifier || "").trim().toLowerCase();
      const password = String(body.password || "");
      const fullName = String(body.fullName || "").trim();
      const role = body.role as Role;
      if (!validIdentifier(identifier)) return response({ error: "Identifiant invalide (3 à 40 caractères)." }, 400);
      if (password.length < 8) return response({ error: "Le mot de passe doit contenir au moins 8 caractères." }, 400);
      if (!roles.includes(role)) return response({ error: "Rôle invalide." }, 400);
      const { data, error } = await adminClient.auth.admin.createUser({
        email: `${identifier}@ht-gestion.app`,
        password,
        email_confirm: true,
      });
      if (error) return response({ error: error.message.includes("registered") ? "Cet identifiant existe déjà." : error.message }, 400);
      const { error: profileError } = await adminClient.from("profiles").insert({ id: data.user.id, full_name: fullName, role });
      if (profileError) {
        await adminClient.auth.admin.deleteUser(data.user.id);
        throw profileError;
      }
      return response({ ok: true });
    }

    if (action === "update") {
      const id = String(body.id || "");
      const fullName = String(body.fullName || "").trim();
      const role = body.role as Role;
      const password = String(body.password || "");
      if (!roles.includes(role)) return response({ error: "Rôle invalide." }, 400);
      if (id === callerId && role !== "admin") return response({ error: "Vous ne pouvez pas retirer votre propre rôle administrateur." }, 400);
      const { error: profileError } = await adminClient.from("profiles").update({ full_name: fullName, role, updated_at: new Date().toISOString() }).eq("id", id);
      if (profileError) throw profileError;
      if (password) {
        if (password.length < 8) return response({ error: "Le mot de passe doit contenir au moins 8 caractères." }, 400);
        const { error } = await adminClient.auth.admin.updateUserById(id, { password });
        if (error) throw error;
      }
      return response({ ok: true });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (id === callerId) return response({ error: "Vous ne pouvez pas supprimer votre propre compte." }, 400);
      const { error } = await adminClient.auth.admin.deleteUser(id);
      if (error) throw error;
      return response({ ok: true });
    }

    return response({ error: "Action inconnue." }, 400);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Erreur du serveur." }, 500);
  }
});
