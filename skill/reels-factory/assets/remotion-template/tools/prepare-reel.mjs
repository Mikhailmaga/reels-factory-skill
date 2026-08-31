import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const values = process.argv.slice(2);
const readOption = (name, required = false) => {
  const index = values.indexOf(`--${name}`);
  const value = index >= 0 ? values[index + 1] : "";
  if (required && !value) throw new Error(`Не указан --${name}.`);
  return value;
};
const ensureInput = (value, label) => {
  const resolved = path.resolve(value);
  if (!fs.existsSync(resolved)) throw new Error(`${label} не найден: ${resolved}`);
  return resolved;
};
const run = (command, args, errorMessage) => {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(errorMessage);
};

const video = ensureInput(readOption("video", true), "Видео");
const outputRoot = path.resolve(readOption("output", true));
const captionsValue = readOption("captions");
const musicValue = readOption("music");
const logoValue = readOption("logo");
const audioCleanup = readOption("audio-cleanup") || "off";
if (!["off", "light", "voice"].includes(audioCleanup)) {
  throw new Error("--audio-cleanup: допустимы off, light, voice.");
}
fs.mkdirSync(outputRoot, { recursive: true });

const videoOutput = path.join(outputRoot, "source.mp4");
const captionsOutput = path.join(outputRoot, "captions.json");
const musicOutput = path.join(outputRoot, "music.mp3");
const logoOutput = path.join(outputRoot, "logo.png");

console.log("Готовлю видео для Remotion…");
const probe = spawnSync(
  "ffprobe",
  ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=index", "-of", "csv=p=0", video],
  { encoding: "utf8", shell: false },
);
const hasAudio = probe.status === 0 && Boolean((probe.stdout ?? "").trim());
const videoArgs = [
  "-nostdin", "-y", "-i", video,
  "-c:v", "libx264", "-preset", "medium", "-crf", "19",
];
if (hasAudio) {
  if (audioCleanup === "light") {
    videoArgs.push("-af", "highpass=f=65,lowpass=f=15500,afftdn=nf=-28,loudnorm=I=-16:TP=-1.5:LRA=11");
  }
  if (audioCleanup === "voice") {
    videoArgs.push("-af", "highpass=f=80,lowpass=f=14000,afftdn=nf=-32,loudnorm=I=-16:TP=-1.5:LRA=11");
  }
  videoArgs.push("-c:a", "aac", "-b:a", "192k");
} else {
  videoArgs.push("-an");
}
videoArgs.push("-movflags", "+faststart", videoOutput);
run(
  "ffmpeg",
  videoArgs,
  "FFmpeg не смог подготовить видео.",
);

if (captionsValue) {
  const captions = ensureInput(captionsValue, "Субтитры");
  run(process.execPath, [path.join(import.meta.dirname, "import-captions.mjs"), captions, captionsOutput], "Не удалось импортировать субтитры.");
} else {
  fs.writeFileSync(captionsOutput, "[]\n", "utf8");
}

if (musicValue) {
  const music = ensureInput(musicValue, "Музыка");
  run("ffmpeg", ["-nostdin", "-y", "-i", music, "-vn", "-c:a", "libmp3lame", "-b:a", "192k", musicOutput], "FFmpeg не смог подготовить музыку.");
}
if (logoValue) {
  const logo = ensureInput(logoValue, "Логотип");
  run("ffmpeg", ["-nostdin", "-y", "-i", logo, "-frames:v", "1", logoOutput], "FFmpeg не смог подготовить логотип.");
}

console.log(`PREPARED_VIDEO=${videoOutput}`);
console.log(`PREPARED_CAPTIONS=${captionsOutput}`);
