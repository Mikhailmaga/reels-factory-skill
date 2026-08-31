import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { finished } from "node:stream/promises";
import { Readable } from "node:stream";
import { fal } from "@fal-ai/client";

const values = process.argv.slice(2);
const readOption = (name, required = false) => {
  const index = values.indexOf(`--${name}`);
  const value = index >= 0 ? values[index + 1] : "";
  if (required && !value) throw new Error(`Не указан --${name}.`);
  return value;
};
const hasFlag = (name) => values.includes(`--${name}`);

if (!hasFlag("approved-paid-generation")) {
  throw new Error(
    "Платная генерация не подтверждена. После явного согласования добавь --approved-paid-generation.",
  );
}
if (!process.env.FAL_KEY) {
  throw new Error("FAL_KEY: not configured");
}

const model = readOption("model", true);
if (!/^fal-ai\/[A-Za-z0-9._/-]+$/.test(model)) {
  throw new Error("Разрешены только официальные endpoint ID вида fal-ai/*.");
}
const inputPath = path.resolve(readOption("input", true));
const outputPath = path.resolve(readOption("output", true));
const purpose = readOption("purpose") || "approved external generation";
if (!fs.existsSync(inputPath)) throw new Error(`Input JSON не найден: ${inputPath}`);
const inputText = fs.readFileSync(inputPath, "utf8");
const input = JSON.parse(inputText);

fal.config({ credentials: process.env.FAL_KEY });
console.log(`Запускаю подтверждённую генерацию: ${model}`);
const result = await fal.subscribe(model, {
  input,
  logs: false,
  onQueueUpdate(update) {
    console.log(`FAL_STATUS=${update.status}`);
  },
});

const data = result.data ?? result;
const mediaUrl =
  data?.video?.url ??
  data?.audio?.url ??
  data?.image?.url ??
  data?.images?.[0]?.url ??
  data?.file?.url;
if (!mediaUrl || !/^https:\/\//i.test(mediaUrl)) {
  throw new Error("Провайдер не вернул поддерживаемую HTTPS-ссылку на медиа.");
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const temporaryPath = outputPath + ".partial";
try {
  const response = await fetch(mediaUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Не удалось скачать результат: HTTP ${response.status}`);
  }
  await finished(Readable.fromWeb(response.body).pipe(fs.createWriteStream(temporaryPath)));
  fs.renameSync(temporaryPath, outputPath);
} catch (error) {
  if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
  throw error;
}

const provenance = {
  schemaVersion: 1,
  origin: "external-provider",
  provider: "fal.ai",
  model,
  requestId: result.requestId ?? result.request_id ?? null,
  createdAt: new Date().toISOString(),
  purpose,
  mediaFile: path.basename(outputPath),
  mediaSha256: crypto.createHash("sha256").update(fs.readFileSync(outputPath)).digest("hex"),
  inputSha256: crypto.createHash("sha256").update(inputText).digest("hex"),
};
fs.writeFileSync(
  outputPath + ".provenance.json",
  JSON.stringify(provenance, null, 2) + "\n",
  "utf8",
);
console.log(`GENERATED_MEDIA=${outputPath}`);
console.log(`PROVENANCE=${outputPath}.provenance.json`);
