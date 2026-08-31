import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const values = process.argv.slice(2);
const readOption = (name, fallback = "") => {
  const index = values.indexOf(`--${name}`);
  return index >= 0 ? values[index + 1] : fallback;
};
const required = (name) => {
  const value = readOption(name);
  if (!value) throw new Error(`Не указан --${name}.`);
  return value;
};
const run = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};
const numberOption = (name, fallback) => {
  const value = Number(readOption(name, String(fallback)));
  if (!Number.isFinite(value)) throw new Error(`Некорректный --${name}.`);
  return value;
};

const video = path.resolve(required("video"));
const outputRoot = path.resolve(required("output"));
if (!fs.existsSync(video)) throw new Error(`Видео не найдено: ${video}`);
fs.mkdirSync(outputRoot, { recursive: true });
const framesRoot = path.join(outputRoot, "frames");
fs.mkdirSync(framesRoot, { recursive: true });

const probeResult = run("ffprobe", [
  "-v", "error",
  "-show_entries",
  "format=duration,size,bit_rate,format_name:stream=index,codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels",
  "-of", "json",
  video,
]);
if (probeResult.status !== 0) throw new Error("FFprobe не смог прочитать финальное видео.");
const metadata = JSON.parse(probeResult.stdout);
const videoStream = metadata.streams?.find((stream) => stream.codec_type === "video") ?? null;
const audioStream = metadata.streams?.find((stream) => stream.codec_type === "audio") ?? null;
const duration = Number(metadata.format?.duration ?? 0);
const expectedWidth = numberOption("width", 1080);
const expectedHeight = numberOption("height", 1920);
const minDuration = numberOption("min-duration", 0);
const maxDuration = numberOption("max-duration", 0);

const checks = [];
const check = (id, level, passed, details) => {
  checks.push({ id, level, passed, details });
};
const decoded = run("ffmpeg", [
  "-nostdin", "-v", "error", "-i", video, "-f", "null", "-",
]);
check("full_decode", "error", decoded.status === 0, decoded.stderr.trim() || "complete");
check(
  "dimensions",
  "error",
  Number(videoStream?.width) === expectedWidth && Number(videoStream?.height) === expectedHeight,
  `${videoStream?.width ?? 0}x${videoStream?.height ?? 0}; expected ${expectedWidth}x${expectedHeight}`,
);
check(
  "video_codec",
  "error",
  videoStream?.codec_name === "h264",
  String(videoStream?.codec_name ?? "missing"),
);
if (minDuration > 0) {
  check("minimum_duration", "error", duration >= minDuration, `${duration}s >= ${minDuration}s`);
}
if (maxDuration > 0) {
  check("maximum_duration", "error", duration <= maxDuration, `${duration}s <= ${maxDuration}s`);
}

let loudness = null;
if (audioStream) {
  const measured = run("ffmpeg", [
    "-nostdin", "-hide_banner", "-nostats", "-i", video,
    "-map", "0:a:0",
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
    "-f", "null", "-",
  ]);
  const candidates = measured.stderr.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/g) ?? [];
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    try {
      loudness = JSON.parse(candidates[index]);
      break;
    } catch {
      // Continue.
    }
  }
  const integrated = Number(loudness?.input_i);
  check(
    "speech_loudness",
    "warning",
    Number.isFinite(integrated) && integrated >= -20 && integrated <= -12,
    Number.isFinite(integrated) ? `${integrated} LUFS` : "not measured",
  );
} else {
  check("audio_stream", "warning", false, "missing");
}

const black = run("ffmpeg", [
  "-nostdin", "-hide_banner", "-nostats", "-i", video,
  "-vf", "blackdetect=d=0.30:pix_th=0.10",
  "-an", "-f", "null", "-",
]);
const blackRanges = [];
const blackPattern = /black_start:([0-9.]+)\s+black_end:([0-9.]+)\s+black_duration:([0-9.]+)/g;
let blackMatch = blackPattern.exec(black.stderr);
while (blackMatch) {
  blackRanges.push({
    start: Number(blackMatch[1]),
    end: Number(blackMatch[2]),
    duration: Number(blackMatch[3]),
  });
  blackMatch = blackPattern.exec(black.stderr);
}
check(
  "unexpected_black",
  "warning",
  blackRanges.length === 0,
  blackRanges.length ? blackRanges : "none",
);

const fractions = [0.02, 0.1, 0.22, 0.35, 0.5, 0.65, 0.78, 0.9, 0.98];
const frames = [];
for (let index = 0; index < fractions.length; index += 1) {
  const second = Math.min(Math.max(0, duration - 0.05), duration * fractions[index]);
  const framePath = path.join(framesRoot, `qc-${String(index + 1).padStart(2, "0")}.png`);
  const extracted = run("ffmpeg", [
    "-nostdin", "-y", "-v", "error",
    "-ss", second.toFixed(3),
    "-i", video,
    "-frames:v", "1",
    "-vf", "scale=540:-2",
    framePath,
  ]);
  check(
    `frame_${String(index + 1).padStart(2, "0")}`,
    "error",
    extracted.status === 0 && fs.existsSync(framePath),
    `${second.toFixed(3)}s`,
  );
  if (fs.existsSync(framePath)) frames.push({ at: second, path: framePath });
}

const failed = checks.filter((item) => item.level === "error" && !item.passed);
const warnings = checks.filter((item) => item.level === "warning" && !item.passed);
const report = {
  schemaVersion: 3,
  generatedAt: new Date().toISOString(),
  video,
  status: failed.length ? "failed" : warnings.length ? "review_required" : "passed",
  metadata,
  loudness,
  blackRanges,
  frames,
  checks,
};
const reportPath = path.join(outputRoot, "QC-REPORT.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(`QC_REPORT=${reportPath}`);
console.log(`QC_FRAMES=${framesRoot}`);
console.log(`QC_STATUS=${report.status}`);
process.exitCode = failed.length ? 1 : 0;
