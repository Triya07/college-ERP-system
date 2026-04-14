const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const backendFile = path.join(__dirname, "..", "index.js");
const source = fs.readFileSync(backendFile, "utf8");

const checks = [
  {
    name: "attendance by-date endpoint is protected",
    pattern: /app\.get\("\/attendance\/by-date",\s*verifyToken,\s*checkRole\(\["admin", "teacher", "student"\]\)/
  },
  {
    name: "class report endpoint is protected",
    pattern: /app\.get\("\/attendance\/class\/:classId\/report",\s*verifyToken,\s*checkRole\(\["admin", "teacher"\]\)/
  },
  {
    name: "course-registration endpoint is protected",
    pattern: /app\.get\("\/course-registration",\s*verifyToken,\s*checkRole\(\["admin", "teacher", "student"\]\)/
  },
  {
    name: "rate limiter is configured",
    pattern: /const authRateLimiter = createRateLimiter/
  },
  {
    name: "audit table exists",
    pattern: /CREATE TABLE IF NOT EXISTS audit_log/
  },
  {
    name: "result update audit log exists",
    pattern: /action:\s*"result\.update"/
  },
  {
    name: "fee update audit log exists",
    pattern: /action:\s*"fee\.update"/
  },
  {
    name: "user update audit log exists",
    pattern: /action:\s*"user\.update"/
  }
];

let failed = false;
for (const check of checks) {
  try {
    assert.match(source, check.pattern);
    console.log(`PASS: ${check.name}`);
  } catch (err) {
    failed = true;
    console.error(`FAIL: ${check.name}`);
  }
}

if (failed) {
  process.exit(1);
}
