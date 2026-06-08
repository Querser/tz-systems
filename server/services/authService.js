import bcrypt from "bcryptjs";
import { entryCookieName, sessionCookieName } from "../config/security.js";
import { env } from "../config/env.js";
import { adminRepository } from "../repositories/adminRepository.js";
import { sessionRepository } from "../repositories/sessionRepository.js";
import { parseCookies } from "../utils/cookies.js";
import {
  createEntryToken,
  createRandomToken,
  hashSessionToken,
  verifyEntryToken,
} from "../utils/tokens.js";

export const authService = {
  /** Verifies the submitted password against the persisted bcrypt digest. */
  async verifyPassword(password) {
    if (typeof password !== "string" || password.length < 1 || password.length > 256) {
      return null;
    }

    const admin = adminRepository.findByUsername("admin");
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return null;
    }
    return admin;
  },

  /** Creates a server-side session and returns its opaque cookie token. */
  createSession(adminId) {
    sessionRepository.purgeExpired();
    const token = createRandomToken();
    const csrfToken = createRandomToken();
    sessionRepository.create({
      tokenHash: hashSessionToken(token),
      adminId,
      csrfToken,
      expiresAt: Date.now() + env.sessionDurationMs,
    });
    return { token, csrfToken };
  },

  /** Resolves the current HttpOnly cookie to an active server-side session. */
  resolveSession(request) {
    const token = parseCookies(request)[sessionCookieName];
    if (!token) {
      return null;
    }
    return sessionRepository.findActive(hashSessionToken(token));
  },

  /** Removes the current server-side session when a valid cookie exists. */
  destroySession(request) {
    const token = parseCookies(request)[sessionCookieName];
    if (token) {
      sessionRepository.delete(hashSessionToken(token));
    }
  },

  /** Issues the signed, short-lived hidden-entry gate token. */
  createEntryToken,

  /** Checks whether the request may render or submit the login page. */
  hasValidEntry(request) {
    return verifyEntryToken(parseCookies(request)[entryCookieName]);
  },
};
