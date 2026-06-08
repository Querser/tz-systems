import crypto from "node:crypto";
import { env } from "../config/env.js";

/** Creates a high-entropy URL-safe token for cookies or CSRF headers. */
export function createRandomToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString("base64url");
}

/** Stores only a keyed digest of a session cookie token in SQLite. */
export function hashSessionToken(token) {
  return crypto.createHmac("sha256", env.sessionSecret).update(token).digest("hex");
}

/** Creates a short-lived signed token used only to reveal the login page. */
export function createEntryToken() {
  const issuedAt = Date.now().toString(36);
  const nonce = createRandomToken(18);
  const payload = `${issuedAt}.${nonce}`;
  const signature = crypto
    .createHmac("sha256", env.sessionSecret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

/** Verifies integrity and age of a hidden-entry token. */
export function verifyEntryToken(token) {
  if (typeof token !== "string") {
    return false;
  }

  const [issuedAt, nonce, signature, extra] = token.split(".");
  if (!issuedAt || !nonce || !signature || extra) {
    return false;
  }

  const timestamp = Number.parseInt(issuedAt, 36);
  if (!Number.isFinite(timestamp) || Date.now() - timestamp > env.entryDurationMs || timestamp > Date.now()) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", env.sessionSecret)
    .update(`${issuedAt}.${nonce}`)
    .digest();
  let received;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }

  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

/** Compares equal-length secrets without data-dependent early exits. */
export function secretsMatch(first, second) {
  if (typeof first !== "string" || typeof second !== "string") {
    return false;
  }

  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && crypto.timingSafeEqual(firstBuffer, secondBuffer);
}
