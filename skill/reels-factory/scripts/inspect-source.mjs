import fs from "node:fs";
import path from "node:path";
import {
  ensureDirectory,
  ensureFile,
  option,
  parseArgs,
  run,
  runDetailed,
  writeJson,
} from "./lib.mjs";

const parsed = parseArgs(process.argv.slice(2));
const video = ensureFile(String(option(parsed, "video")), "Видео");
const outputValue = String(option(parsed, "output", "")).trim();
if (!outputValue) throw new Error("Укажи --output для папки инспекции.");
const outputDirectory = path.resolve(outputValue);
ensureDirectory(outputDirectory);

const metadataText = run(
  "ffprobe",
  [
    "-v", "error",
    "-show_entries",
    "format=duration,size,bit_rate,format_name:stream=index,codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels,channel_layout",
    "-of", "json",
    video,
  ],
  { capture: true },
);
const metadata = JSON.parse(metadataText);
const duration = Number(metadata?.format?.duration);
if (!Number.isFinite(duration) || duration <= 0) {
  throw new Error("FFprobe не вернул корректную длительность видео.");
}

const videoStream = metadata.streams?.find((stream) => stream.codec_type === "video") ?? null;
const audioStream = metadata.streams?.find((stream) => stream.codec_type === "audio") ?? null;
const width = Number(videoStream?.width ?? 0);
const height = Number(videoStream?.height ?? 0);
const orientation =
  width > height ? "landscape" : height > width ? "portrait" : "square";

const metadataPath = path.join(outputDirectory, "source-metadata.json");
writeJson(metadataPath, metadata);

const fractions = [0.03, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 0.97];
const frames = fractions.map((fraction, index) => {
  const second = Math.min(Math.max(0, duration - 0.1), duration * fraction);
  const framePath = path.join(
    outputDirectory,
    `frame-${String(index + 1).padStart(2, "0")}.png`,
  );
  run("ffmpeg", [
    "-nostdin", "-y", "-v", "error",
    "-ss", second.toFixed(3),
    "-i", video,
    "-frames:v", "1",
    "-vf", "scale=540:-2",
    framePath,
  ]);
  ensureFile(framePath, "Контрольный кадр");
  return { at: Number(second.toFixed(3)), path: framePath };
});

const parseLoudness = (stderr) => {
  const candidates = stderr.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/g) ?? [];
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    try {
      const value = JSON.parse(candidates[index]);
      return Object.fromEntries(
        Object.entries(value).map(([key, raw]) => {
          const numeric = Number(raw);
          return [key, Number.isFinite(numeric) ? numeric : raw];
        }),
      );
    } catch {
      // Try the previous JSON block.
    }
  }
  return null;
};

const parseSilences = (stderr) => {
  const events = [];
  const pattern = /silence_(start|end):\s*([0-9.]+)/g;
  let match = pattern.exec(stderr);
  while (match) {
    events.push({ type: match[1], at: Number(match[2]) });
    match = pattern.exec(stderr);
  }

  const ranges = [];
  let start = null;
  for (const event of events) {
    if (event.type === "start") {
      start = event.at;
    } else if (start !== null && event.at > start) {
      ranges.push({
        start: Number(start.toFixed(3)),
        end: Number(event.at.toFixed(3)),
        duration: Number((event.at - start).toFixed(3)),
      });
      start = null;
    }
  }
  if (start !== null && duration > start) {
    ranges.push({
      start: Number(start.toFixed(3)),
      end: Number(duration.toFixed(3)),
      duration: Number((duration - start).toFixed(3)),
    });
  }
  return ranges;
};

let loudness = null;
let silences = [];
if (audioStream) {
  const measured = runDetailed(
    "ffmpeg",
    [
      "-nostdin", "-hide_banner", "-nostats",
      "-i", video,
      "-map", "0:a:0",
      "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
      "-f", "null", "-",
    ],
    { allowFailure: true },
  );
  loudness = parseLoudness(measured.stderr);

  const rawThreshold = Number(loudness?.input_thresh);
  const threshold = Number.isFinite(rawThreshold)
    ? Math.min(-20, Math.max(-60, rawThreshold))
    : -35;
  const detected = runDetailed(
    "ffmpeg",
    [
      "-nostdin", "-hide_banner", "-nostats",
      "-i", video,
      "-map", "0:a:0",
      "-af", `silencedetect=noise=${threshold}dB:d=0.45`,
      "-f", "null", "-",
    ],
    { allowFailure: true },
  );
  silences = parseSilences(detected.stderr);
}

const sceneScan = runDetailed(
  "ffmpeg",
  [
    "-nostdin", "-hide_banner", "-nostats",
    "-i", video,
    "-an",
    "-vf", "scale=320:-2,select=gt(scene\\,0.30),showinfo",
    "-f", "null", "-",
  ],
  { allowFailure: true },
);
const sceneChanges = [];
const scenePattern = /pts_time:([0-9.]+)/g;
let sceneMatch = scenePattern.exec(sceneScan.stderr);
while (sceneMatch && sceneChanges.length < 200) {
  const at = Number(sceneMatch[1]);
  if (Number.isFinite(at)) sceneChanges.push(Number(at.toFixed(3)));
  sceneMatch = scenePattern.exec(sceneScan.stderr);
}

const reportPath = path.join(outputDirectory, "SOURCE-ANALYSIS.json");
writeJson(reportPath, {
  schemaVersion: 3,
  generatedAt: new Date().toISOString(),
  source: video,
  duration: Number(duration.toFixed(3)),
  dimensions: { width, height, orientation },
  streams: {
    video: videoStream,
    audio: audioStream,
  },
  representativeFrames: frames,
  audio: {
    present: Boolean(audioStream),
    loudness,
    silences,
    silenceTotal: Number(
      silences.reduce((total, item) => total + item.duration, 0).toFixed(3),
    ),
  },
  sceneChanges,
});

console.log(`ANALYSIS=${reportPath}`);
console.log(`METADATA=${metadataPath}`);
for (const frame of frames) console.log(`FRAME=${frame.path}`);
