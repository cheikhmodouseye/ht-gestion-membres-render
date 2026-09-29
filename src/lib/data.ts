import { supabase } from "./supabase";

export type AppData = { members: any[]; renewals: any[]; activities: any[]; attendance: any[]; contributions: any[]; socialEvents: any[]; cashMovements: any[] };

const maps: Record<string, Record<string, string>> = {
  members: { birth_date: "birthDate", daara_sector: "daaraSector", magal_sector: "magalSector", cultural_space: "culturalSpace", registration_date: "registrationDate", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  renewals: { member_id: "memberId", renewal_date: "renewalDate", updated_by: "updatedBy", created_at: "createdAt", updated_at: "updatedAt" },
  activities: { start_time: "startTime", end_time: "endTime", event_name: "eventName", cultural_space: "culturalSpace", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  attendance: { activity_id: "activityId", member_id: "memberId", updated_by: "updatedBy", created_at: "createdAt", updated_at: "updatedAt" },
  social_contributions: { member_id: "memberId", paid_date: "paidDate", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  social_events: { member_id: "memberId", expense_amount: "expenseAmount", kourel_performance: "kourelPerformance", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  cash_movements: { social_event_id: "socialEventId", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
};

function camelRows(table: string, rows: any[] = []) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [maps[table]?.[key] || key, value])));
}

async function rows(table: string, order?: string, ascending = false) {
  let query = supabase.from(table).select("*");
  if (order) query = query.order(order, { ascending });
  const { data, error } = await query;
  if (error) throw error;
  return camelRows(table, data || []);
}

export async function loadData(): Promise<AppData> {
  const [members, renewals, activities, attendance, contributions, socialEvents, cashMovements] = await Promise.all([
    rows("members", "nom", true), rows("renewals", "year"), rows("activities", "date"), rows("attendance"),
    rows("social_contributions", "month"), rows("social_events", "date"), rows("cash_movements", "date"),
  ]);
  return { members, renewals, activities, attendance, contributions, socialEvents, cashMovements };
}

function base(userId: string) {
  return { updated_at: new Date().toISOString(), created_by: userId };
}

export async function mutateData(body: any, userId: string) {
  const now = new Date().toISOString();
  if (body.action === "saveMember") {
    const item = body.member || {};
    if (!item.matricule?.trim() || !item.nom?.trim() || !item.prenom?.trim()) throw new Error("Matricule, nom et prénom obligatoires.");
    const id = item.id || crypto.randomUUID();
    const member = { id, matricule: item.matricule.trim(), nom: item.nom.trim(), prenom: item.prenom.trim(), sexe: item.sexe || "", birth_date: item.birthDate || "", address: item.address || "", phone: item.phone || "", email: item.email || "", profession: item.profession || "", daara_sector: item.daaraSector || "", magal_sector: item.magalSector || "", cultural_space: item.culturalSpace || "", kourel: item.kourel || "", registration_date: item.registrationDate || now.slice(0, 10), ...base(userId) };
    const saved = await supabase.from("members").upsert(member, { onConflict: "id" });
    if (saved.error) throw saved.error;
    if (body.renewal?.year) {
      const renewal = { id: crypto.randomUUID(), member_id: id, year: Number(body.renewal.year), renewal_date: body.renewal.date || now.slice(0, 10), updated_by: userId, updated_at: now };
      const result = await supabase.from("renewals").upsert(renewal, { onConflict: "member_id,year" });
      if (result.error) throw result.error;
    }
    return;
  }
  if (body.action === "saveActivity") {
    const item = body.activity || {};
    if (!item.type || !item.date) throw new Error("Type et date obligatoires.");
    const id = item.id || crypto.randomUUID();
    const activity = { id, type: item.type, scope: item.scope || "general", kourel: item.kourel || "Tous", date: item.date, start_time: item.startTime || "", end_time: item.endTime || "", place: item.place || "", event_name: item.eventName || "", cultural_space: item.culturalSpace || "", melodies: item.melodies || [], ...base(userId) };
    const saved = await supabase.from("activities").upsert(activity, { onConflict: "id" });
    if (saved.error) throw saved.error;
    const cleared = await supabase.from("attendance").delete().eq("activity_id", id);
    if (cleared.error) throw cleared.error;
    const attendance = Object.entries(body.attendance || {}).map(([memberId, status]) => ({ id: crypto.randomUUID(), activity_id: id, member_id: memberId, status: String(status), updated_by: userId, updated_at: now }));
    if (attendance.length) {
      const result = await supabase.from("attendance").insert(attendance);
      if (result.error) throw result.error;
    }
    return;
  }
  if (body.action === "toggleContribution") {
    const memberId = String(body.memberId || "");
    const month = String(body.month || "");
    if (!memberId || !month) throw new Error("Membre et mois obligatoires.");
    if (!body.paid) {
      const result = await supabase.from("social_contributions").delete().eq("member_id", memberId).eq("month", month);
      if (result.error) throw result.error;
    } else {
      const contribution = { id: crypto.randomUUID(), member_id: memberId, month, amount: 1000, paid_date: body.paidDate || now.slice(0, 10), ...base(userId) };
      const result = await supabase.from("social_contributions").upsert(contribution, { onConflict: "member_id,month" });
      if (result.error) throw result.error;
    }
    return;
  }
  if (body.action === "addSocialEvent") {
    const item = body.event || {};
    const id = crypto.randomUUID();
    const result = await supabase.from("social_events").insert({ id, member_id: item.memberId, type: item.type, date: item.date, expense_amount: Number(item.expenseAmount || 0), kourel_performance: Boolean(item.kourelPerformance), note: item.note || "", ...base(userId) });
    if (result.error) throw result.error;
    if (Number(item.expenseAmount || 0) > 0) {
      const movement = await supabase.from("cash_movements").insert({ id: crypto.randomUUID(), type: "expense", date: item.date, label: `${item.type} - aide sociale`, amount: Number(item.expenseAmount), social_event_id: id, ...base(userId) });
      if (movement.error) throw movement.error;
    }
    return;
  }
  if (body.action === "addCashMovement") {
    const item = body.movement || {};
    const result = await supabase.from("cash_movements").insert({ id: crypto.randomUUID(), type: item.type, date: item.date, label: item.label, amount: Number(item.amount || 0), ...base(userId) });
    if (result.error) throw result.error;
    return;
  }
  if (body.action === "delete") {
    const tableMap: Record<string, string> = { member: "members", activity: "activities", socialEvent: "social_events", cashMovement: "cash_movements" };
    const table = tableMap[String(body.entity || "")];
    if (!table) throw new Error("Entité inconnue.");
    const result = await supabase.from(table).delete().eq("id", String(body.id || ""));
    if (result.error) throw result.error;
    return;
  }
  throw new Error("Action inconnue.");
}
