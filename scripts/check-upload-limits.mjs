import { readFile } from "node:fs/promises";
import { projectUpload } from "../server/config/upload.js";

const nginxConfig = await readFile(
  new URL("../deploy/nginx/tz-systems.online.https.conf", import.meta.url),
  "utf8"
);
const match = nginxConfig.match(/client_max_body_size\s+(\d+)([kmg]);/i);

if (!match) {
  throw new Error("client_max_body_size is missing from the production nginx config.");
}

const units = {
  k: 1024,
  m: 1024 * 1024,
  g: 1024 * 1024 * 1024,
};
const nginxLimit = Number(match[1]) * units[match[2].toLowerCase()];
const requiredLimit = projectUpload.maxTotalSize + 1024 * 1024;

if (nginxLimit < requiredLimit) {
  throw new Error(
    `nginx allows ${nginxLimit} bytes, but uploads require at least ${requiredLimit} bytes.`
  );
}

console.log(
  `Upload limits aligned: nginx=${nginxLimit}, application=${projectUpload.maxTotalSize}.`
);
