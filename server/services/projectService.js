import crypto from "node:crypto";
import { projectRepository } from "../repositories/projectRepository.js";
import { validateProjectId, validateProjectPayload } from "../utils/validators.js";
import { HttpError } from "../utils/httpError.js";

export const projectService = {
  /** Returns the ordered public project collection. */
  list() {
    return projectRepository.list();
  },

  /** Validates and creates one project with a server-generated identifier. */
  create(payload) {
    const project = validateProjectPayload(payload);
    return projectRepository.create({
      ...project,
      id: crypto.randomUUID(),
      order: projectRepository.nextOrder(),
    });
  },

  /** Validates and updates an existing project. */
  update(id, payload) {
    const safeId = validateProjectId(id);
    if (!projectRepository.findById(safeId)) {
      throw new HttpError(404, "Проект не найден.");
    }
    return projectRepository.update(safeId, validateProjectPayload(payload));
  },

  /** Deletes an existing project by its validated identifier. */
  delete(id) {
    const safeId = validateProjectId(id);
    if (!projectRepository.delete(safeId)) {
      throw new HttpError(404, "Проект не найден.");
    }
    return safeId;
  },
};
