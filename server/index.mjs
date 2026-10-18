import { randomUUID } from "node:crypto";
import express from "express";
import { pool, transaction } from "./db.mjs";
import { createSession, destroySession, hashPassword, publicUser, requireUser, verifyPassword } from "./auth.mjs";

const app = express();
const port = Number(process.env.PORT || 3000);
const roles = new Set(["admin", "administratif", "social", "surveillant_kourel"]);
const zones = new Set(["Diakhaye", "Keur Massar centre", "Tivaoune Peulh-Apix", "Yeumbeul-Malika"]);
const kourels = new Set(["Nourou Dareyni", "Mafatikhoul Bisri", "Adolescent", "Dialibatou Marakhib"]);
const culturalSpaces = new Set(["ECH1", "ECH2", "ECF1", "ECF2", "ECA"]);
const loginAttempts = new Map();

app.disable("x-powered-by");
app.use(express.json({ limit: "8mb" }));

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function allowed(role, values) {
  if (!values.includes(role)) fail(403, "Accès refusé.");
}

function normalizedIdentifier(value) {
  const identifier = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(identifier)) fail(400, "Identifiant invalide.");
  return identifier;
}

function normalizedChoice(value, choices, label, required = false) {
  const choice = String(value || "").trim();
  if ((required && !choice) || (choice && !choices.has(choice))) fail(400, `${label} invalide.`);
  return choice;
}

function assignments(role, source = {}) {
  const result = {
    zone: role === "administratif" ? normalizedChoice(source.zone, zones, "Zone", true) : "",
    kourel: role === "surveillant_kourel" ? normalizedChoice(source.kourel, kourels, "Kourel", true) : "",
  };
  return result;
}

const maps = {
  members: { birth_date: "birthDate", daara_sector: "daaraSector", magal_sector: "magalSector", cultural_space: "culturalSpace", registration_date: "registrationDate", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  renewals: { member_id: "memberId", renewal_date: "renewalDate", updated_by: "updatedBy", created_at: "createdAt", updated_at: "updatedAt" },
  activities: { start_time: "startTime", end_time: "endTime", event_name: "eventName", cultural_space: "culturalSpace", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  attendance: { activity_id: "activityId", member_id: "memberId", updated_by: "updatedBy", created_at: "createdAt", updated_at: "updatedAt" },
  social_contributions: { member_id: "memberId", paid_date: "paidDate", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  social_events: { member_id: "memberId", expense_amount: "expenseAmount", kourel_performance: "kourelPerformance", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  cash_movements: { social_event_id: "socialEventId", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
};

function camelRows(table, rows = []) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [maps[table]?.[key] || key, value])));
}

function canSeeMember(user, member) {
  if (user.role === "admin" || user.role === "social" || user.role === "administratif") return true;
  if (user.role === "surveillant_kourel") return Boolean(user.kourel) && member.kourel === user.kourel;
  return false;
}

function canSeeActivity(user, activity) {
  if (user.role === "admin") return true;
  if (user.role === "administratif") return activity.scope === "general";
  if (user.role === "surveillant_kourel") return Boolean(user.kourel) && activity.scope === "kourel" && activity.kourel === user.kourel;
  return false;
}

async function loadData(user) {
  const tables = ["members", "renewals", "activities", "attendance", "social_contributions", "social_events", "cash_movements"];
  const results = await Promise.all(tables.map((table) => pool.query(`select * from ${table}`)));
  const raw = Object.fromEntries(tables.map((table, index) => [table, results[index].rows]));
  const members = raw.members.filter((row) => canSeeMember(user, row)).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const activities = raw.activities.filter((row) => canSeeActivity(user, row)).sort((a, b) => b.date.localeCompare(a.date));
  const memberIds = new Set(members.map((row) => row.id));
  const activityIds = new Set(activities.map((row) => row.id));
  const socialAccess = user.role === "admin" || user.role === "social";
  return {
    members: camelRows("members", members),
    renewals: camelRows("renewals", raw.renewals.filter((row) => memberIds.has(row.member_id))),
    activities: camelRows("activities", activities),
    attendance: camelRows("attendance", raw.attendance.filter((row) => memberIds.has(row.member_id) && activityIds.has(row.activity_id))),
    contributions: socialAccess ? camelRows("social_contributions", raw.social_contributions) : [],
    socialEvents: socialAccess ? camelRows("social_events", raw.social_events) : [],
    cashMovements: socialAccess ? camelRows("cash_movements", raw.cash_movements) : [],
  };
}

app.get("/api/health", async (_request, response, next) => {
  try {
    await pool.query("select 1");
    response.json({ ok: true, database: "postgresql" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (request, response) => {
  const key = request.ip;
  const recent = (loginAttempts.get(key) || []).filter((time) => Date.now() - time < 15 * 60_000);
  if (recent.length >= 10) return response.status(429).json({ error: "Trop de tentatives. Réessayez dans quelques minutes." });
  const identifier = normalizedIdentifier(request.body.identifier);
  const result = await pool.query("select * from app_users where identifier = $1 and active = true", [identifier]);
  const user = result.rows[0];
  if (!user || !(await verifyPassword(String(request.body.password || ""), user.password_hash))) {
    recent.push(Date.now());
    loginAttempts.set(key, recent);
    return response.status(401).json({ error: "Identifiants incorrects ou compte non autorisé." });
  }
  loginAttempts.delete(key);
  await createSession(user.id, response);
  response.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", async (request, response, next) => {
  try {
    await destroySession(request, response);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireUser, (request, response) => response.json({ user: publicUser(request.user) }));
app.get("/api/data", requireUser, async (request, response) => response.json(await loadData(request.user)));

app.post("/api/mutate", requireUser, async (request, response) => {
  const body = request.body || {};
  const user = request.user;
  const now = new Date().toISOString();

  if (body.action === "saveMember") {
    allowed(user.role, ["admin", "administratif"]);
    const item = body.member || {};
    if (!String(item.matricule || "").trim() || !String(item.nom || "").trim() || !String(item.prenom || "").trim()) fail(400, "Matricule, nom et prénom obligatoires.");
    const id = item.id || randomUUID();
    const zone = normalizedChoice(item.zone, zones, "Zone", true);
    const culturalSpace = normalizedChoice(item.culturalSpace, culturalSpaces, "Espace culturel");
    const kourel = normalizedChoice(item.kourel, kourels, "Kourel");
    await transaction(async (client) => {
      await client.query(
        `insert into members (id,zone,matricule,nom,prenom,sexe,birth_date,address,phone,phone2,email,profession,daara_sector,magal_sector,cultural_space,kourel,registration_date,created_by,updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         on conflict (id) do update set zone=excluded.zone,matricule=excluded.matricule,nom=excluded.nom,prenom=excluded.prenom,sexe=excluded.sexe,birth_date=excluded.birth_date,address=excluded.address,phone=excluded.phone,phone2=excluded.phone2,email=excluded.email,profession=excluded.profession,daara_sector=excluded.daara_sector,magal_sector=excluded.magal_sector,cultural_space=excluded.cultural_space,kourel=excluded.kourel,registration_date=excluded.registration_date,updated_at=excluded.updated_at`,
        [id, zone, String(item.matricule).trim(), String(item.nom).trim(), String(item.prenom).trim(), item.sexe || "", item.birthDate || "", item.address || "", item.phone || "", item.phone2 || "", item.email || "", item.profession || "", item.daaraSector || "", item.magalSector || "", culturalSpace, kourel, item.registrationDate || now.slice(0, 10), user.id, now],
      );
      if (body.renewal?.year) {
        await client.query(
          `insert into renewals (id,member_id,year,renewal_date,updated_by,updated_at) values ($1,$2,$3,$4,$5,$6)
           on conflict (member_id,year) do update set renewal_date=excluded.renewal_date,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
          [randomUUID(), id, Number(body.renewal.year), body.renewal.date || now.slice(0, 10), user.id, now],
        );
      }
    });
    return response.json({ ok: true });
  }

  if (body.action === "saveActivity") {
    allowed(user.role, ["admin", "administratif", "surveillant_kourel"]);
    const item = body.activity || {};
    if (!item.type || !item.date) fail(400, "Type et date obligatoires.");
    const scope = item.scope || "general";
    if (user.role === "administratif" && scope !== "general") fail(403, "Activité non autorisée.");
    if (user.role === "surveillant_kourel" && scope !== "kourel") fail(403, "Activité non autorisée.");
    const id = item.id || randomUUID();
    const zone = scope === "general" ? normalizedChoice(item.zone, zones, "Zone", true) : "";
    const kourel = scope === "kourel" ? normalizedChoice(user.role === "surveillant_kourel" ? user.kourel : item.kourel, kourels, "Kourel", true) : "Tous";
    const culturalSpace = normalizedChoice(item.culturalSpace, culturalSpaces, "Espace culturel");
    await transaction(async (client) => {
      await client.query(
        `insert into activities (id,zone,type,scope,kourel,date,start_time,end_time,place,event_name,cultural_space,melodies,created_by,updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         on conflict (id) do update set zone=excluded.zone,type=excluded.type,scope=excluded.scope,kourel=excluded.kourel,date=excluded.date,start_time=excluded.start_time,end_time=excluded.end_time,place=excluded.place,event_name=excluded.event_name,cultural_space=excluded.cultural_space,melodies=excluded.melodies,updated_at=excluded.updated_at`,
        [id, zone, item.type, scope, kourel, item.date, item.startTime || "", item.endTime || "", item.place || "", item.eventName || "", culturalSpace, JSON.stringify(item.melodies || []), user.id, now],
      );
      await client.query("delete from attendance where activity_id = $1", [id]);
      for (const [memberId, status] of Object.entries(body.attendance || {})) {
        if (!["present", "late", "absent", "justified"].includes(String(status))) fail(400, "Statut de présence invalide.");
        const member = await client.query("select zone,kourel from members where id = $1", [memberId]);
        if (!member.rowCount || !canSeeMember(user, member.rows[0])) fail(403, "Membre hors de votre affectation.");
        await client.query("insert into attendance (id,activity_id,member_id,status,updated_by,updated_at) values ($1,$2,$3,$4,$5,$6)", [randomUUID(), id, memberId, String(status), user.id, now]);
      }
    });
    return response.json({ ok: true });
  }

  if (body.action === "toggleContribution" || body.action === "saveContributions") {
    allowed(user.role, ["admin", "social"]);
    const month = String(body.month || "");
    if (!/^\d{4}-\d{2}$/.test(month)) fail(400, "Mois invalide.");
    const memberIds = body.action === "toggleContribution" ? (body.paid ? [String(body.memberId || "")] : []) : [...new Set((body.memberIds || []).map(String).filter(Boolean))];
    await transaction(async (client) => {
      if (body.action === "toggleContribution") await client.query("delete from social_contributions where member_id = $1 and month = $2", [String(body.memberId || ""), month]);
      else await client.query("delete from social_contributions where month = $1", [month]);
      for (const memberId of memberIds) {
        await client.query(
          `insert into social_contributions (id,member_id,month,amount,paid_date,created_by,updated_at) values ($1,$2,$3,1000,$4,$5,$6)
           on conflict (member_id,month) do update set amount=1000,paid_date=excluded.paid_date,created_by=excluded.created_by,updated_at=excluded.updated_at`,
          [randomUUID(), memberId, month, body.paidDate || now.slice(0, 10), user.id, now],
        );
      }
    });
    return response.json({ ok: true });
  }

  if (body.action === "addSocialEvent") {
    allowed(user.role, ["admin", "social"]);
    const item = body.event || {};
    const id = randomUUID();
    await transaction(async (client) => {
      await client.query("insert into social_events (id,member_id,type,date,expense_amount,kourel_performance,note,created_by,updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [id, item.memberId, item.type, item.date, Number(item.expenseAmount || 0), Boolean(item.kourelPerformance), item.note || "", user.id, now]);
      if (Number(item.expenseAmount || 0) > 0) await client.query("insert into cash_movements (id,type,date,label,amount,social_event_id,created_by,updated_at) values ($1,'expense',$2,$3,$4,$5,$6,$7)", [randomUUID(), item.date, `${item.type} - aide sociale`, Number(item.expenseAmount), id, user.id, now]);
    });
    return response.json({ ok: true });
  }

  if (body.action === "addCashMovement") {
    allowed(user.role, ["admin", "social"]);
    const item = body.movement || {};
    await pool.query("insert into cash_movements (id,type,date,label,amount,created_by,updated_at) values ($1,$2,$3,$4,$5,$6,$7)", [randomUUID(), item.type, item.date, item.label, Number(item.amount || 0), user.id, now]);
    return response.json({ ok: true });
  }

  if (body.action === "delete") {
    const entities = { member: ["members", ["admin", "administratif"]], activity: ["activities", ["admin", "administratif", "surveillant_kourel"]], socialEvent: ["social_events", ["admin", "social"]], cashMovement: ["cash_movements", ["admin", "social"]] };
    const target = entities[String(body.entity || "")];
    if (!target) fail(400, "Entité inconnue.");
    allowed(user.role, target[1]);
    const id = String(body.id || "");
    if (target[0] === "activities" && user.role !== "admin") {
      const record = await pool.query("select * from activities where id = $1", [id]);
      if (!record.rowCount || !canSeeActivity(user, record.rows[0])) fail(403, "Activité hors de votre affectation.");
    }
    await pool.query(`delete from ${target[0]} where id = $1`, [id]);
    return response.json({ ok: true });
  }

  fail(400, "Action inconnue.");
});

app.post("/api/admin/users", requireUser, async (request, response) => {
  allowed(request.user.role, ["admin"]);
  const body = request.body || {};
  if (body.action === "list") {
    const result = await pool.query("select id,identifier,full_name,role,zone,kourel,created_at from app_users where active = true order by identifier");
    return response.json({ users: result.rows.map((row) => ({ id: row.id, identifier: row.identifier, fullName: row.full_name, role: row.role, zone: row.zone, kourel: row.kourel, createdAt: row.created_at, isCurrent: row.id === request.user.id })) });
  }
  if (body.action === "create") {
    const identifier = normalizedIdentifier(body.identifier);
    const password = String(body.password || "");
    const role = String(body.role || "");
    if (password.length < 8) fail(400, "Le mot de passe doit contenir au moins 8 caractères.");
    if (!roles.has(role)) fail(400, "Rôle invalide.");
    const scope = assignments(role, body);
    const result = await pool.query("insert into app_users (identifier,password_hash,full_name,role,zone,kourel) values ($1,$2,$3,$4,$5,$6) returning id", [identifier, await hashPassword(password), String(body.fullName || "").trim(), role, scope.zone, scope.kourel]);
    return response.json({ ok: true, id: result.rows[0].id });
  }
  if (body.action === "update") {
    const id = String(body.id || "");
    const role = String(body.role || "");
    if (!roles.has(role)) fail(400, "Rôle invalide.");
    if (id === request.user.id && role !== "admin") fail(400, "Votre propre compte doit rester administrateur.");
    const scope = assignments(role, body);
    await pool.query("update app_users set full_name=$1,role=$2,zone=$3,kourel=$4,updated_at=now() where id=$5", [String(body.fullName || "").trim(), role, scope.zone, scope.kourel, id]);
    if (String(body.password || "")) {
      if (String(body.password).length < 8) fail(400, "Le mot de passe doit contenir au moins 8 caractères.");
      await pool.query("update app_users set password_hash=$1,updated_at=now() where id=$2", [await hashPassword(String(body.password)), id]);
      await pool.query("delete from sessions where user_id=$1 and user_id<>$2", [id, request.user.id]);
    }
    return response.json({ ok: true });
  }
  if (body.action === "delete") {
    const id = String(body.id || "");
    if (id === request.user.id) fail(400, "Vous ne pouvez pas supprimer votre propre compte.");
    await pool.query("delete from app_users where id=$1", [id]);
    return response.json({ ok: true });
  }
  fail(400, "Action inconnue.");
});

app.use((error, _request, response, _next) => {
  console.error(error);
  const status = Number(error.status || (error.code === "23505" ? 409 : 500));
  const message = error.code === "23505" ? "Cette valeur existe déjà." : status >= 500 ? "Erreur interne du serveur." : error.message;
  response.status(status).json({ error: message });
});

async function start() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query("select 1");
      app.listen(port, "0.0.0.0", () => console.log(`HT API listening on ${port}`));
      return;
    } catch (error) {
      if (attempt === 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

await start();
