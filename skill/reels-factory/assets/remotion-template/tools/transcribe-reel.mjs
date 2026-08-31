import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from "@remotion/install-whisper-cpp";

const input = path.resolve(
  process.argv[2] ?? path.join("public", "media", "video", "source.mp4"),
);
const output = path.resolve(
  process.argv[3] ?? path.join("public", "media", "captions", "captions.json"),
);
const projectCache = path.resolve(".cache");
const cacheBase = process.platform === "win32"
  ? (process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"))
  : process.platform === "darwin"
    ? path.join(os.homedir(), "Library", "Caches")
    : path.join(os.homedir(), ".cache");
const runtimeRoot = path.join(cacheBase, "remotion-reels-whisper");
const whisperPath = path.join(runtimeRoot, "whisper.cpp");
const wavePath = path.join(projectCache, "reel-16khz.wav");
const whisperCppVersion = "1.5.5";
const model = process.env.WHISPER_MODEL ?? "base";
const additionalArgs = ["--split-on-word"];

if (process.env.WHISPER_PROMPT) {
  additionalArgs.push("--prompt", process.env.WHISPER_PROMPT);
}

if (!fs.existsSync(input)) {
  console.error(`Видео не найдено: ${input}`);
  process.exit(1);
}

fs.mkdirSync(projectCache, { recursive: true });
fs.mkdirSync(runtimeRoot, { recursive: true });
fs.mkdirSync(path.dirname(output), { recursive: true });

console.log("1/4 Подготавливаю аудио 16 кГц…");
const ffmpeg = spawnSync(
  "ffmpeg",
  [
    "-nostdin",
    "-y",
    "-i",
    input,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    wavePath,
  ],
  { stdio: "inherit" },
);

if (ffmpeg.status !== 0) {
  process.exit(ffmpeg.status ?? 1);
}

const originalWorkingDirectory = process.cwd();

try {
  console.log("2/4 Устанавливаю локальный Whisper.cpp (повторно не скачивается)…");
  process.chdir(runtimeRoot);
  await installWhisperCpp({
    to: whisperPath,
    version: whisperCppVersion,
  });

  console.log("3/4 Загружаю русскоязычную модель base (повторно не скачивается)…");
  await downloadWhisperModel({
    model,
    folder: whisperPath,
  });
  console.log("4/4 Распознаю речь и собираю тайминги слов…");
  const whisperCppOutput = await transcribe({
    inputPath: wavePath,
    whisperPath,
    whisperCppVersion,
    model,
    language: "ru",
    tokenLevelTimestamps: true,
    additionalArgs,
  });
  const { captions } = toCaptions({ whisperCppOutput });

  fs.writeFileSync(output, `${JSON.stringify(captions, null, 2)}\n`);
  console.log(`Готово: ${output}`);
} finally {
  process.chdir(originalWorkingDirectory);
  if (fs.existsSync(wavePath)) {
    fs.unlinkSync(wavePath);
  }
}
