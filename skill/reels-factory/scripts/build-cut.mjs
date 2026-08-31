import fs from "node:fs";
import os from "node:os";
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
const segmentsPath = ensureFile(
  String(option(parsed, "segments")),
  "JSON со списком фрагментов",
);
const outputValue = option(parsed, "output");
if (!outputValue) {
  throw new Error("Укажи --output для монтажного видео.");
}
const output = path.resolve(String(outputValue));
const segments = JSON.parse(fs.readFileSync(segmentsPath, "utf8"));
if (!Array.isArray(segments) || segments.length === 0) {
  throw new Error("Список монтажных фрагментов пуст.");
}

ensureDirectory(path.dirname(output));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "reels-factory-cut-"));

try {
  const parts = segments.map((segment, index) => {
    const start = Number(segment.start);
    const end = Number(segment.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
      throw new Error(`Некорректный фрагмент ${index + 1}: start=${segment.start}, end=${segment.end}`);
    }

    const partPath = path.join(
      temporary,
      `part-${String(index).padStart(3, "0")}.mp4`,
    );
    run("ffmpeg", [
      "-nostdin",
      "-y",
      "-v",
      "error",
      "-ss",
      start.toFixed(3),
      "-i",
      video,
      "-t",
      (end - start).toFixed(3),
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "19",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      partPath,
    ]);
    return ensureFile(partPath, "Монтажный фрагмент");
  });

  const concatPath = path.join(temporary, "concat.txt");
  const concatBody = parts
    .map((part) => {
      const normalized = part.replaceAll("\\", "/").replaceAll("'", "'\\''");
      return `file '${normalized}'`;
    })
    .join("\n");
  fs.writeFileSync(concatPath, `${concatBody}\n`, "utf8");

  run("ffmpeg", [
    "-nostdin",
    "-y",
    "-v",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    output,
  ]);
  ensureFile(output, "Собранное монтажное видео");
  run("ffmpeg", ["-nostdin", "-v", "error", "-i", output, "-f", "null", "-"]);
  console.log(`CUT_VIDEO=${output}`);
} finally {
  fs.rmSync(temporary, { force: true, recursive: true });
}
