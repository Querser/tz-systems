import path from "node:path";
import multer from "multer";
import { projectUpload } from "../config/upload.js";
import { HttpError } from "../utils/httpError.js";

const boundedMemoryStorage = {
  _handleFile(request, file, callback) {
    const chunks = [];
    let fileSize = 0;
    let settled = false;

    file.stream.on("data", (chunk) => {
      if (settled) {
        return;
      }

      fileSize += chunk.length;
      request.projectUploadTotal = (request.projectUploadTotal || 0) + chunk.length;
      if (request.projectUploadTotal > projectUpload.maxTotalSize) {
        settled = true;
        callback(new HttpError(413, "Общий размер изображений не должен превышать 64 МБ."));
        return;
      }
      chunks.push(chunk);
    });
    file.stream.on("error", (error) => {
      if (!settled) {
        settled = true;
        callback(error);
      }
    });
    file.stream.on("end", () => {
      if (!settled) {
        settled = true;
        callback(null, { buffer: Buffer.concat(chunks), size: fileSize });
      }
    });
  },
  _removeFile(_request, file, callback) {
    delete file.buffer;
    callback();
  },
};

const uploader = multer({
  storage: boundedMemoryStorage,
  limits: {
    files: projectUpload.maxFiles,
    fileSize: projectUpload.maxFileSize,
    fields: 4,
    fieldSize: 64 * 1024,
  },
  fileFilter(_request, file, callback) {
    const type = projectUpload.allowedTypes.get(file.mimetype);
    const extension = path.extname(file.originalname).toLowerCase();

    if (!type || !type.acceptedExtensions.includes(extension)) {
      callback(new HttpError(400, "Разрешены только изображения JPEG, PNG и WebP."));
      return;
    }

    callback(null, true);
  },
});

/** Parses project screenshots and converts Multer errors to safe API errors. */
export function uploadProjectScreenshots(request, response, next) {
  uploader.array(projectUpload.fieldName, projectUpload.maxFiles)(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof HttpError) {
      next(error);
      return;
    }

    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Размер одного изображения не должен превышать 16 МБ."
          : "Не удалось обработать загруженные изображения.";
      next(new HttpError(status, message));
      return;
    }

    next(error);
  });
}
