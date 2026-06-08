import { database } from "../db/database.js";

const countStatement = database.prepare("SELECT COUNT(*) AS count FROM admins");
const findByUsernameStatement = database.prepare(
  "SELECT id, username, password_hash FROM admins WHERE username = ?"
);
const createStatement = database.prepare(`
  INSERT INTO admins (username, password_hash, created_at, updated_at)
  VALUES (?, ?, ?, ?)
`);

export const adminRepository = {
  /** Returns the number of persisted administrators. */
  count() {
    return Number(countStatement.get().count);
  },

  /** Finds one administrator through a prepared username lookup. */
  findByUsername(username) {
    return findByUsernameStatement.get(username) || null;
  },

  /** Creates an administrator using a precomputed password hash. */
  create(username, passwordHash) {
    const now = new Date().toISOString();
    return createStatement.run(username, passwordHash, now, now);
  },
};
