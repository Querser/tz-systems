import { database } from "../db/database.js";

const listStatement = database.prepare("SELECT * FROM projects ORDER BY sort_order ASC");
const countStatement = database.prepare("SELECT COUNT(*) AS count FROM projects");
const findStatement = database.prepare("SELECT * FROM projects WHERE id = ?");
const maxOrderStatement = database.prepare(
  "SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM projects"
);
const insertStatement = database.prepare(`
  INSERT INTO projects (
    id, sort_order, code, title_ru, title_en, description_ru, description_en,
    stack_json, screenshots_json, live_url, github_url, metrics_json, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const updateStatement = database.prepare(`
  UPDATE projects SET
    code = ?, title_ru = ?, title_en = ?, description_ru = ?, description_en = ?,
    stack_json = ?, screenshots_json = ?, live_url = ?, github_url = ?,
    metrics_json = ?, updated_at = ?
  WHERE id = ?
`);
const deleteStatement = database.prepare("DELETE FROM projects WHERE id = ?");
const reorderStatement = database.prepare(
  "UPDATE projects SET sort_order = ?, updated_at = ? WHERE id = ?"
);

/** Converts one SQLite row into the public project data model. */
function mapProject(row) {
  return {
    id: row.id,
    order: row.sort_order,
    code: row.code,
    title: { ru: row.title_ru, en: row.title_en },
    description: { ru: row.description_ru, en: row.description_en },
    stack: JSON.parse(row.stack_json),
    screenshots: JSON.parse(row.screenshots_json),
    liveUrl: row.live_url,
    githubUrl: row.github_url,
    metrics: JSON.parse(row.metrics_json),
  };
}

/** Inserts a normalized project using a single prepared statement. */
function insertProject(project) {
  const now = new Date().toISOString();
  insertStatement.run(
    project.id,
    project.order,
    project.code,
    project.title.ru,
    project.title.en,
    project.description.ru,
    project.description.en,
    JSON.stringify(project.stack),
    JSON.stringify(project.screenshots),
    project.liveUrl,
    project.githubUrl,
    JSON.stringify(project.metrics),
    now,
    now
  );
}

export const projectRepository = {
  /** Returns all projects in their public display order. */
  list() {
    return listStatement.all().map(mapProject);
  },

  /** Returns the current number of projects. */
  count() {
    return Number(countStatement.get().count);
  },

  /** Finds one project by its validated identifier. */
  findById(id) {
    const row = findStatement.get(id);
    return row ? mapProject(row) : null;
  },

  /** Returns the next available project order. */
  nextOrder() {
    return Number(maxOrderStatement.get().max_order) + 1;
  },

  /** Persists one newly created project. */
  create(project) {
    insertProject(project);
    return this.findById(project.id);
  },

  /** Updates project content while preserving identity and order. */
  update(id, project) {
    updateStatement.run(
      project.code,
      project.title.ru,
      project.title.en,
      project.description.ru,
      project.description.en,
      JSON.stringify(project.stack),
      JSON.stringify(project.screenshots),
      project.liveUrl,
      project.githubUrl,
      JSON.stringify(project.metrics),
      new Date().toISOString(),
      id
    );
    return this.findById(id);
  },

  /** Deletes a project and compacts display order inside one transaction. */
  delete(id) {
    database.exec("BEGIN IMMEDIATE");
    try {
      const result = deleteStatement.run(id);
      if (result.changes) {
        const now = new Date().toISOString();
        this.list().forEach((project, index) => {
          reorderStatement.run(index + 1, now, project.id);
        });
      }
      database.exec("COMMIT");
      return Boolean(result.changes);
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  },

  /** Imports initial projects into an empty database transactionally. */
  insertSeed(projects) {
    database.exec("BEGIN IMMEDIATE");
    try {
      projects.forEach(insertProject);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  },
};
