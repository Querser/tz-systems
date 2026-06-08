import { database } from "../db/database.js";

const createStatement = database.prepare(`
  INSERT INTO sessions (token_hash, admin_id, csrf_token, expires_at, created_at)
  VALUES (?, ?, ?, ?, ?)
`);
const findStatement = database.prepare(`
  SELECT sessions.token_hash, sessions.admin_id, sessions.csrf_token, sessions.expires_at,
         admins.username
  FROM sessions
  JOIN admins ON admins.id = sessions.admin_id
  WHERE sessions.token_hash = ? AND sessions.expires_at > ?
`);
const deleteStatement = database.prepare("DELETE FROM sessions WHERE token_hash = ?");
const purgeStatement = database.prepare("DELETE FROM sessions WHERE expires_at <= ?");

export const sessionRepository = {
  /** Persists a server-side authenticated session. */
  create(session) {
    return createStatement.run(
      session.tokenHash,
      session.adminId,
      session.csrfToken,
      session.expiresAt,
      new Date().toISOString()
    );
  },

  /** Resolves a non-expired session through its hashed cookie token. */
  findActive(tokenHash) {
    return findStatement.get(tokenHash, Date.now()) || null;
  },

  /** Deletes one server-side session during logout. */
  delete(tokenHash) {
    return deleteStatement.run(tokenHash);
  },

  /** Removes expired session records. */
  purgeExpired() {
    return purgeStatement.run(Date.now());
  },
};
