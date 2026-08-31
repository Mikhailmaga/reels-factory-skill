import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const values = process.argv.slice(2);
const readOption = (name, required = false) => {
  const index = values.indexOf(name);
  const value = index >= 0 ? values[index + 1] : "";
  if (required && (!value || value.startsWith("--"))) {
    throw new Error(`Нужен параметр ${name}.`);
  }
  return value && !value.startsWith("--") ? value : "";
};

const sourcePath = path.resolve(readOption("--source", true));
const outputPath = path.resolve(readOption("--output", true));
const origin = readOption("--origin", true);
const purpose = readOption("--purpose", true);
const promptFileValue = readOption("--prompt-file");
const model = readOption("--model");
const requestId = readOption("--request-id");

const allowedOrigins = new Set([
  "codex-imagegen",
  "local-source",
  "user-supplied",
  "external-provider",
]);
if (!allowedOrigins.has(origin)) {
  throw new Error(`Недопустимый --origin: ${origin}.`);
}
if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
  throw new Error(`Исходный медиофайл не найден: ${sourcePath}`);
}

const promptFile = promptFileValue ? path.resolve(promptFileValue) : "";
if (promptFile && (!fs.existsSync(promptFile) || !fs.statSync(promptFile).isFile())) {
  throw new Error(`Файл промпта не найден: ${promptFile}`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const samePath = process.platform === "win32"
  ? sourcePath.toLowerCase() === outputPath.toLowerCase()
  : sourcePath === outputPath;
if (!samePath) {
  fs.copyFileSync(sourcePath, outputPath);
}

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const mediaSha256 = sha256(fs.readFileSync(outputPath));
const promptSha256 = promptFile ? sha256(fs.readFileSync(promptFile)) : "";
const sidecarPath = `${outputPath}.provenance.json`;
const sidecar = {
  schemaVersion: 1,
  origin,
  purpose,
  model: model || undefined,
  requestId: requestId || undefined,
  createdAt: new Date().toISOString(),
  mediaFile: path.basename(outputPath),
  mediaSha256,
  promptFile: promptFile ? path.basename(promptFile) : undefined,
  promptSha256: promptSha256 || undefined,
};

fs.writeFileSync(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: outputPath, provenance: sidecarPath, mediaSha256 }, null, 2));
