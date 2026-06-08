import crypto from "node:crypto";
import { projectRepository } from "../repositories/projectRepository.js";
import { validateProjectId, validateProjectPayload } from "../utils/validators.js";
import { HttpError } from "../utils/httpError.js";
import { uploadService } from "./uploadService.js";

export const projectService = {
  /** Returns the ordered public project collection. */
  list() {
    return projectRepository.list();
  },

  /** Validates and creates one project with uploaded screenshots. */
  async create(payload, files) {
    const project = validateProjectPayload(payload);
    if (project.existingScreenshots.length) {
      throw new HttpError(400, "Новый проект не может ссылаться на существующие скриншоты.");
    }
    const screenshots = await uploadService.saveProjectImages(files);

    try {
      return projectRepository.create({
        ...project,
        screenshots,
        id: crypto.randomUUID(),
        order: projectRepository.nextOrder(),
      });
    } catch (error) {
      await uploadService.deleteProjectImages(screenshots);
      throw error;
    }
  },

  /** Updates editable fields, adding and safely removing screenshots. */
  async update(id, payload, files) {
    const safeId = validateProjectId(id);
    const currentProject = projectRepository.findById(safeId);
    if (!currentProject) {
      throw new HttpError(404, "Проект не найден.");
    }

    const project = validateProjectPayload(payload);
    const currentScreenshots = new Set(currentProject.screenshots);
    if (new Set(project.existingScreenshots).size !== project.existingScreenshots.length) {
      throw new HttpError(400, "Список существующих скриншотов содержит дубликаты.");
    }
    if (project.existingScreenshots.some((source) => !currentScreenshots.has(source))) {
      throw new HttpError(400, "Список существующих скриншотов был изменён некорректно.");
    }

    const newScreenshots = await uploadService.saveProjectImages(files);
    const screenshots = [...project.existingScreenshots, ...newScreenshots];
    const removedScreenshots = currentProject.screenshots.filter(
      (source) => !project.existingScreenshots.includes(source)
    );

    let updatedProject;
    try {
      updatedProject = projectRepository.update(safeId, {
        ...project,
        screenshots,
      });
    } catch (error) {
      await uploadService.deleteProjectImages(newScreenshots);
      throw error;
    }

    try {
      await uploadService.deleteProjectImages(removedScreenshots);
    } catch (error) {
      console.error("[uploads] Failed to remove obsolete project images", error);
    }
    return updatedProject;
  },

  /** Deletes a project and any application-owned screenshots. */
  async delete(id) {
    const safeId = validateProjectId(id);
    const project = projectRepository.findById(safeId);
    if (!project || !projectRepository.delete(safeId)) {
      throw new HttpError(404, "Проект не найден.");
    }

    try {
      await uploadService.deleteProjectImages(project.screenshots);
    } catch (error) {
      console.error("[uploads] Failed to remove deleted project images", error);
    }
    return safeId;
  },
};
