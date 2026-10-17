import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const [keyPath, destination, loginFile] = process.argv.slice(2);
if (!keyPath || !destination || !loginFile) process.exit(2);

const command = [
  "set -eu",
  "LOGIN=$(mktemp)",
  "COOKIE=$(mktemp)",
  "trap 'rm -f $LOGIN $COOKIE' EXIT",
  "chmod 600 $LOGIN $COOKIE",
  "cat > $LOGIN",
  "curl -fsS -c $COOKIE -H 'Content-Type: application/json' --data-binary @$LOGIN http://127.0.0.1:8081/api/auth/login",
  "printf '\\n'",
  "curl -fsS -b $COOKIE http://127.0.0.1:8081/api/auth/me",
  "printf '\\n'",
  "curl -fsS -o /dev/null -w 'DATA_HTTP=%{http_code}\\n' -b $COOKIE http://127.0.0.1:8081/api/data",
].join("; ");

const result = spawnSync("ssh", [
  "-i", keyPath,
  "-o", "IdentitiesOnly=yes",
  "-o", "BatchMode=yes",
  "-o", "StrictHostKeyChecking=no",
  "-o", "UserKnownHostsFile=NUL",
  destination,
  command,
], { input: readFileSync(loginFile), stdio: ["pipe", "inherit", "inherit"] });

process.exit(result.status ?? 1);
