import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const [keyPath, destination] = process.argv.slice(2);
if (!keyPath || !destination) {
  console.error("Usage: node deploy/rotate-db-secret.mjs <cle-ssh> <utilisateur@hote>");
  process.exit(2);
}

const secret = randomBytes(32).toString("hex");
const stack = "/opt/ht-gestion-stack";
const command = [
  "set -eu",
  `sudo docker exec ht-postgres psql -U ht_app -d ht_gestion -v ON_ERROR_STOP=1 -c \"alter role ht_app password '${secret}'\" >/dev/null`,
  `printf 'HT_DB_PASSWORD=${secret}\\nHT_COOKIE_SECURE=false\\nHT_WEB_PORT=8081\\n' | sudo tee ${stack}/.env >/dev/null`,
  `sudo chmod 600 ${stack}/.env`,
  `cd ${stack}`,
  "sudo docker compose -f compose.yml up -d --force-recreate ht-db ht-api",
  `test \"$(sudo awk -F= '/HT_DB_PASSWORD/{print length($2)}' ${stack}/.env)\" -eq 64`,
  "sleep 3",
  "curl -fsS http://127.0.0.1:8081/api/health",
].join("; ");

const result = spawnSync("ssh", [
  "-i", keyPath,
  "-o", "IdentitiesOnly=yes",
  "-o", "BatchMode=yes",
  "-o", "StrictHostKeyChecking=no",
  "-o", "UserKnownHostsFile=NUL",
  destination,
  command,
], { stdio: "inherit" });

process.exit(result.status ?? 1);
