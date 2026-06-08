import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(currentDirectory, "../..");
const isProduction = process.env.NODE_ENV === "production";
const configuredSessionSecret = process.env.SESSION_SECRET || "";
const configuredAdminPasswordHash = process.env.ADMIN_INITIAL_PASSWORD_HASH || "";

if (isProduction && configuredSessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters in production.");
}
if (isProduction && !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(configuredAdminPasswordHash)) {
  throw new Error("ADMIN_INITIAL_PASSWORD_HASH must contain a valid bcrypt hash in production.");
}

/** Converts a port-like environment value into a safe local port. */
function parsePort(value) {
  const port = Number.parseInt(value || "3000", 10);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : 3000;
}

export const env = {
  host: process.env.HOST || "127.0.0.1",
  port: parsePort(process.env.PORT),
  isProduction,
  databasePath:
    process.env.DATABASE_PATH || path.join(projectRoot, "database", "portfolio.sqlite"),
  uploadDirectory:
    process.env.UPLOAD_DIRECTORY ||
    path.join(projectRoot, "public", "uploads", "projects"),
  sessionSecret: configuredSessionSecret || crypto.randomBytes(48).toString("hex"),
  initialAdminPasswordHash:
    configuredAdminPasswordHash ||
    "$2b$12$pwTpm7sXQ7FOD0ki8bC6peBpkAjA7ftVengORN5.6adcRoMLw2cs.",
  sessionDurationMs: 8 * 60 * 60 * 1000,
  entryDurationMs: 5 * 60 * 1000,
};
