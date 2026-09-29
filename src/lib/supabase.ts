import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://kbxlzdsguqxtiamjkacn.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtieGx6ZHNndXF4dGlhbWprYWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDIwNjcsImV4cCI6MjEwNjExODA2N30.M_493bPVRyaDvJnDxRZpEu37X2Iqg7yja3w6agyqwZY";

if (!supabaseUrl || !supabaseKey) throw new Error("Configuration Supabase manquante.");

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
