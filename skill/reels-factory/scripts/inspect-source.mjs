import fs from "node:fs";
import path from "node:path";
import {
  ensureDirectory,
  ensureFile,
  option,
  parseArgs,
  run,
} from "./lib.mjs";

const parsed = parseArgs(process.argv.slice(2));
const video = ensureFile(String(option(parsed, "video")), "Видео");
const outputDirectory = path.resolve(String(option(parsed, "output")));
if (!option(parsed, "output")) {
  throw new Error("Укажи --output для папки инспекции.");
}
ensureDirectory(outputDirectory);

const metadataText = run(
  "ffprobe",
  [
    "-v",
    "error",
    "-show_entries",
    "format=duration,size,bit_rate:stream=index,codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels",
    "-of",
    "json",
    video,
  ],
  { capture: true },
);
const metadata = JSON.parse(metadataText);
const duration = Number(metadata?.format?.duration);
if (!Number.isFinite(duration) || duration <= 0) {
  throw new Error("FFprobe не вернул корректную длительность видео.");
}

const metadataPath = path.join(outputDirectory, "source-metadata.json");
fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

const fractions = [0.05, 0.25, 0.5, 0.75, 0.95];
const frames = fractions.map((fraction, index) => {
  const second = Math.min(Math.max(0, duration - 0.1), duration * fraction);
  const framePath = path.join(
    outputDirectory,
    `frame-${String(index + 1).padStart(2, "0")}.png`,
  );
  run("ffmpeg", [
    "-nostdin",
    "-y",
    "-v",
    "error",
    "-ss",
    second.toFixed(3),
    "-i",
    video,
    "-frames:v",
    "1",
    "-vf",
    "scale=540:-2",
    framePath,
  ]);
  ensureFile(framePath, "Контрольный кадр");
  return framePath;
});

console.log(`METADATA=${metadataPath}`);
for (const frame of frames) {
  console.log(`FRAME=${frame}`);
}
