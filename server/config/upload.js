export const projectUpload = {
  fieldName: "screenshots",
  maxFiles: 20,
  maxFileSize: 8 * 1024 * 1024,
  maxTotalSize: 64 * 1024 * 1024,
  allowedTypes: new Map([
    ["image/jpeg", { extension: ".jpg", acceptedExtensions: [".jpg", ".jpeg"] }],
    ["image/png", { extension: ".png", acceptedExtensions: [".png"] }],
    ["image/webp", { extension: ".webp", acceptedExtensions: [".webp"] }],
  ]),
};
