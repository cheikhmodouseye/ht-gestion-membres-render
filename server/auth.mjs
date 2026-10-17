import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "./db.mjs";

const scrypt = promisify(scryptCallback);
const sessionHours = Number(process.env.SESSION_HOURS || 12);

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, saltValue, hashValue] = String(encoded || "").split("$");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, "base64url");
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltValue, "base64url"), expected.length));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((item) => item.trim().split(/=(.*)/s)).filter(([key]) => key));
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId, response) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000);
  await pool.query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [tokenHash(token), userId, expiresAt]);
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  response.setHeader("Set-Cookie", `ht_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionHours * 3600}${secure}`);
}

export async function destroySession(request, response) {
  const token = parseCookies(request.headers.cookie).ht_session;
  if (token) await pool.query("delete from sessions where token_hash = $1", [tokenHash(token)]);
  response.setHeader("Set-Cookie", "ht_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
}

export async function requireUser(request, response, next) {
  try {
    const token = parseCookies(request.headers.cookie).ht_session;
    if (!token) return response.status(401).json({ error: "Connexion requise." });
    const result = await pool.query(
      `select u.id, u.identifier, u.full_name, u.role, u.zone, u.kourel
       from sessions s join app_users u on u.id = s.user_id
       where s.token_hash = $1 and s.expires_at > now() and u.active = true`,
      [tokenHash(token)],
    );
    if (!result.rowCount) return response.status(401).json({ error: "Session expirée." });
    request.user = result.rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

export function publicUser(user) {
  return {
    id: user.id,
    identifier: user.identifier,
    name: user.full_name || user.identifier,
    role: user.role,
    zone: user.zone || "",
    kourel: user.kourel || "",
  };
}
