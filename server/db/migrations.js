import { readFile } from "node:fs/promises";
import path from "node:path";
import { env, projectRoot } from "../config/env.js";
import { database } from "./database.js";

/** Creates all tables and indexes required by the application. */
function migrateSchema() {
  database.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL,
      code TEXT NOT NULL,
      title_ru TEXT NOT NULL,
      title_en TEXT NOT NULL,
      description_ru TEXT NOT NULL,
      description_en TEXT NOT NULL,
      stack_json TEXT NOT NULL,
      screenshots_json TEXT NOT NULL,
      live_url TEXT NOT NULL,
      github_url TEXT NOT NULL,
      metrics_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      csrf_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      action TEXT NOT NULL,
      target_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON projects(sort_order);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);
}

/** Seeds the first admin with a bcrypt hash only, never a plaintext password. */
function seedAdmin(adminRepository) {
  if (adminRepository.count() > 0) {
    return;
  }

  adminRepository.create("admin", env.initialAdminPasswordHash);
}

/** Imports the legacy JSON project seed only when the SQLite project table is empty. */
async function seedProjects(projectRepository) {
  if (projectRepository.count() > 0) {
    return;
  }

  const seedPath = path.join(projectRoot, "data", "default-projects.json");
  const projects = JSON.parse(await readFile(seedPath, "utf8"));
  projectRepository.insertSeed(projects);
}

/** Initializes schema and one-time seed data for a fresh local installation. */
export async function initializeDatabase() {
  migrateSchema();
  const [{ adminRepository }, { projectRepository }] = await Promise.all([
    import("../repositories/adminRepository.js"),
    import("../repositories/projectRepository.js"),
  ]);
  seedAdmin(adminRepository);
  await seedProjects(projectRepository);
}
