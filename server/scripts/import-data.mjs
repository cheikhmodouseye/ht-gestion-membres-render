import { pool, transaction } from "../db.mjs";

const input = await new Promise((resolve, reject) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { data += chunk; });
  process.stdin.on("end", () => resolve(data));
  process.stdin.on("error", reject);
});

const data = JSON.parse(input || "{}");
data.activities = (data.activities || []).map((activity) => ({ ...activity, melodies: JSON.stringify(activity.melodies || []) }));
const now = new Date().toISOString();

function value(row, camel, fallback = "") {
  return row[camel] ?? fallback;
}

async function upsert(client, table, columns, conflict, rows) {
  for (const row of rows || []) {
    const values = columns.map(([column, camel, fallback]) => value(row, camel, fallback));
    const names = columns.map(([column]) => column);
    const updates = names.filter((name) => !conflict.includes(name)).map((name) => `${name}=excluded.${name}`).join(",");
    const placeholders = values.map((_, index) => `$${index + 1}`).join(",");
    await client.query(`insert into ${table} (${names.join(",")}) values (${placeholders}) on conflict (${conflict.join(",")}) do update set ${updates}`, values);
  }
}

await transaction(async (client) => {
  await upsert(client, "members", [
    ["id", "id"], ["zone", "zone", ""], ["matricule", "matricule"], ["nom", "nom"], ["prenom", "prenom"],
    ["sexe", "sexe", ""], ["birth_date", "birthDate", ""], ["address", "address", ""], ["phone", "phone", ""], ["phone2", "phone2", ""],
    ["email", "email", ""], ["emergency_contact_name", "emergencyContactName", ""], ["emergency_contact_phone", "emergencyContactPhone", ""],
    ["is_student", "isStudent", false], ["school_class", "schoolClass", ""], ["arabic_education_level", "arabicEducationLevel", ""],
    ["profession", "profession", ""], ["daara_sector", "daaraSector", ""],
    ["magal_sector", "magalSector", ""], ["cultural_space", "culturalSpace", ""], ["kourel", "kourel", ""],
    ["registration_date", "registrationDate", now.slice(0, 10)], ["created_by", "createdBy", "migration"],
    ["created_at", "createdAt", now], ["updated_at", "updatedAt", now],
  ], ["id"], data.members);

  await upsert(client, "renewals", [
    ["id", "id"], ["member_id", "memberId"], ["year", "year"], ["renewal_date", "renewalDate"],
    ["updated_by", "updatedBy", "migration"], ["created_at", "createdAt", now], ["updated_at", "updatedAt", now],
  ], ["id"], data.renewals);

  await upsert(client, "activities", [
    ["id", "id"], ["zone", "zone", ""], ["type", "type"], ["scope", "scope", "general"], ["kourel", "kourel", "Tous"],
    ["date", "date"], ["start_time", "startTime", ""], ["end_time", "endTime", ""], ["place", "place", ""],
    ["event_name", "eventName", ""], ["cultural_space", "culturalSpace", ""], ["melodies", "melodies", []], ["observation", "observation", ""],
    ["created_by", "createdBy", "migration"], ["created_at", "createdAt", now], ["updated_at", "updatedAt", now],
  ], ["id"], data.activities);

  await upsert(client, "attendance", [
    ["id", "id"], ["activity_id", "activityId"], ["member_id", "memberId"], ["status", "status"],
    ["updated_by", "updatedBy", "migration"], ["created_at", "createdAt", now], ["updated_at", "updatedAt", now],
  ], ["id"], data.attendance);

  await upsert(client, "social_contributions", [
    ["id", "id"], ["member_id", "memberId"], ["month", "month"], ["amount", "amount", 1000],
    ["paid_date", "paidDate", now.slice(0, 10)], ["created_by", "createdBy", "migration"],
    ["created_at", "createdAt", now], ["updated_at", "updatedAt", now],
  ], ["id"], data.contributions);

  await upsert(client, "social_events", [
    ["id", "id"], ["member_id", "memberId"], ["type", "type"], ["date", "date"],
    ["expense_amount", "expenseAmount", 0], ["kourel_performance", "kourelPerformance", false], ["note", "note", ""],
    ["created_by", "createdBy", "migration"], ["created_at", "createdAt", now], ["updated_at", "updatedAt", now],
  ], ["id"], data.socialEvents);

  await upsert(client, "cash_movements", [
    ["id", "id"], ["type", "type"], ["date", "date"], ["label", "label"], ["amount", "amount", 0],
    ["social_event_id", "socialEventId", null], ["created_by", "createdBy", "migration"],
    ["created_at", "createdAt", now], ["updated_at", "updatedAt", now],
  ], ["id"], data.cashMovements);
});

console.log(JSON.stringify({
  members: data.members?.length || 0,
  renewals: data.renewals?.length || 0,
  activities: data.activities?.length || 0,
  attendance: data.attendance?.length || 0,
  contributions: data.contributions?.length || 0,
  socialEvents: data.socialEvents?.length || 0,
  cashMovements: data.cashMovements?.length || 0,
}));
await pool.end();
