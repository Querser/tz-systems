import { database } from "../db/database.js";

const insertStatement = database.prepare(`
  INSERT INTO admin_audit (admin_id, action, target_id, created_at)
  VALUES (?, ?, ?, ?)
`);

export const auditRepository = {
  /** Records a minimal admin action without credentials or request payloads. */
  log(adminId, action, targetId = null) {
    insertStatement.run(adminId, action, targetId, new Date().toISOString());
  },
};
