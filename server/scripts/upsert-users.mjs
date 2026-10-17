import { randomUUID } from "node:crypto";
import { hashPassword } from "../auth.mjs";
import { pool, transaction } from "../db.mjs";

const input = await new Promise((resolve, reject) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { data += chunk; });
  process.stdin.on("end", () => resolve(data));
  process.stdin.on("error", reject);
});

const users = JSON.parse(input || "[]");
await transaction(async (client) => {
  for (const user of users) {
    const identifier = String(user.identifier || "").trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(identifier) || String(user.password || "").length < 8) throw new Error(`Compte invalide: ${identifier}`);
    await client.query(
      `insert into app_users (id,identifier,password_hash,full_name,role,zone,kourel)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (identifier) do update set password_hash=excluded.password_hash,full_name=excluded.full_name,role=excluded.role,zone=excluded.zone,kourel=excluded.kourel,active=true,updated_at=now()`,
      [user.id || randomUUID(), identifier, await hashPassword(String(user.password)), String(user.fullName || identifier), user.role, user.zone || "", user.kourel || ""],
    );
  }
});

console.log(`USERS_IMPORTED=${users.length}`);
await pool.end();
