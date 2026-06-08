import crypto from "node:crypto";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { env } from "../config/env.js";
import { projectUpload } from "../config/upload.js";
import { HttpError } from "../utils/httpError.js";

const ownedUploadPattern = /^\/uploads\/projects\/([a-f0-9-]{36})\.(jpg|png|webp)$/;

function detectImageType(buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function resolveOwnedUpload(publicPath) {
  const match = ownedUploadPattern.exec(publicPath);
  return match ? path.join(env.uploadDirectory, `${match[1]}.${match[2]}`) : null;
}

async function removeFile(filePath) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

export const uploadService = {
  /** Verifies image signatures and writes new files with unguessable names. */
  async saveProjectImages(files = []) {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > projectUpload.maxTotalSize) {
      throw new HttpError(413, "Общий размер изображений не должен превышать 64 МБ.");
    }

    if (!files.length) {
      return [];
    }

    await mkdir(env.uploadDirectory, { recursive: true });
    const savedPaths = [];

    try {
      for (const file of files) {
        const detectedType = detectImageType(file.buffer);
        if (!detectedType || detectedType !== file.mimetype) {
          throw new HttpError(400, "Содержимое файла не соответствует формату изображения.");
        }

        const extension = projectUpload.allowedTypes.get(detectedType).extension;
        const fileName = `${crypto.randomUUID()}${extension}`;
        const filePath = path.join(env.uploadDirectory, fileName);
        await writeFile(filePath, file.buffer, { flag: "wx", mode: 0o644 });
        savedPaths.push(`/uploads/projects/${fileName}`);
      }
      return savedPaths;
    } catch (error) {
      await this.deleteProjectImages(savedPaths);
      throw error;
    }
  },

  /** Deletes only files created by this application, never arbitrary paths. */
  async deleteProjectImages(publicPaths = []) {
    await Promise.all(
      publicPaths.map((publicPath) => {
        const filePath = resolveOwnedUpload(publicPath);
        return filePath ? removeFile(filePath) : Promise.resolve();
      })
    );
  },
};
