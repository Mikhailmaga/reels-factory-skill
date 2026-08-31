import fs from "node:fs";
import path from "node:path";
import {
  assertApproved,
  ensureDirectory,
  ensureFile,
  hasFlag,
  nodeCommand,
  npxCommand,
  option,
  parseArgs,
  readJsonValue,
  run,
  sanitizeJobId,
  writeJson,
} from "./lib.mjs";

const parsed = parseArgs(process.argv.slice(2));
const stage = parsed.positional[0];
if (!['proof', 'final'].includes(stage)) {
  throw new Error("Первый аргумент должен быть proof или final.");
}

const requiredOption = (name) => {
  const value = String(option(parsed, name, "")).trim();
  if (!value) throw new Error(`Не указан обязательный параметр --${name}.`);
  return value;
};
const numericOption = (name, fallback, minimum, maximum) => {
  const value = Number(option(parsed, name, fallback));
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`Параметр --${name} должен быть от ${minimum} до ${maximum}.`);
  }
  return value;
};

const projectRoot = path.resolve(requiredOption("project"));
const jobId = sanitizeJobId(requiredOption("job"));
const briefPath = assertApproved(
  requiredOption("brief"),
  "approval_status",
  "Производственная карточка",
);
assertApproved(
  path.join(projectRoot, "PROFILE.md"),
  "profile_status",
  "Личный профиль фабрики",
);

for (const relative of [
  "package.json",
  path.join("src", "reels", "ReelsUnderKey.tsx"),
  path.join("tools", "prepare-reel.mjs"),
  path.join("tools", "render-proof.mjs"),
  path.join("tools", "qc-report.mjs"),
  path.join("tools", "export-captions.mjs"),
]) {
  ensureFile(path.join(projectRoot, relative), "Обязательный файл проекта");
}

const jobRoot = path.join(projectRoot, "out", "jobs", jobId);
const publicJob = path.join(projectRoot, "public", "jobs", jobId);
const propsPath = path.join(jobRoot, "props.json");
const proofRoot = path.join(jobRoot, "proof");
const qcRoot = path.join(jobRoot, "qc");
const statusPath = path.join(jobRoot, "STATUS.json");
const coverPath = path.join(jobRoot, `${jobId}-cover.png`);
ensureDirectory(jobRoot);

const writeStatus = (status, extra = {}) =>
  writeJson(statusPath, {
    jobId,
    status,
    updatedAt: new Date().toISOString(),
    approvedBrief: briefPath,
    ...extra,
  });

const durationOf = (filePath) => {
  const raw = run(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { capture: true },
  );
  const duration = Number(raw);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Не удалось определить длительность: ${filePath}`);
  }
  return duration;
};

if (stage === "proof") {
  const video = ensureFile(requiredOption("video"), "Исходное видео");
  const captionsValue = String(option(parsed, "captions", "")).trim();
  const musicValue = String(option(parsed, "music", "")).trim();
  const logoValue = String(option(parsed, "logo", "")).trim();
  const captions = captionsValue ? ensureFile(captionsValue, "Субтитры") : "";
  const music = musicValue ? ensureFile(musicValue, "Музыка") : "";
  const logo = logoValue ? ensureFile(logoValue, "Логотип") : "";

  const prepareArgs = [
    path.join(projectRoot, "tools", "prepare-reel.mjs"),
    "--video", video,
    "--output", publicJob,
    "--audio-cleanup", String(option(parsed, "audio-cleanup", "off")),
  ];
  if (captions) prepareArgs.push("--captions", captions);
  if (music) prepareArgs.push("--music", music);
  if (logo) prepareArgs.push("--logo", logo);
  run(nodeCommand, prepareArgs, { cwd: projectRoot });

  const preparedVideo = path.join(publicJob, "source.mp4");
  const preparedCaptions = path.join(publicJob, "captions.json");
  const skipTranscription = hasFlag(parsed, "skip-transcription");
  if (!captions && !skipTranscription) {
    run(
      nodeCommand,
      [path.join(projectRoot, "tools", "transcribe-reel.mjs"), preparedVideo, preparedCaptions],
      { cwd: projectRoot },
    );
  }

  let highlights = [];
  const highlightsValue = String(option(parsed, "highlights", "")).trim();
  if (highlightsValue) {
    const source = fs.existsSync(highlightsValue)
      ? fs.readFileSync(path.resolve(highlightsValue), "utf8")
      : highlightsValue;
    highlights = JSON.parse(source);
    if (!Array.isArray(highlights)) {
      throw new Error("--highlights должен содержать JSON-массив или путь к JSON-файлу.");
    }
  }

  const focusKeyframes = readJsonValue(
    option(parsed, "focus-keyframes", ""),
    "--focus-keyframes",
  ) ?? [];
  if (!Array.isArray(focusKeyframes)) {
    throw new Error("--focus-keyframes должен содержать JSON-массив.");
  }
  for (const [index, keyframe] of focusKeyframes.entries()) {
    const at = Number(keyframe.at);
    const x = Number(keyframe.x);
    const y = Number(keyframe.y);
    const scale = Number(keyframe.scale ?? 1);
    if (![at, x, y, scale].every(Number.isFinite) || at < 0 || x < 0 || x > 100 || y < 0 || y > 100 || scale < 0.8 || scale > 2.5) {
      throw new Error(`Некорректный focus keyframe ${index + 1}.`);
    }
  }
  focusKeyframes.sort((left, right) => left.at - right.at);

  const brollInput = readJsonValue(option(parsed, "broll", ""), "--broll") ?? [];
  if (!Array.isArray(brollInput)) {
    throw new Error("--broll должен содержать JSON-массив.");
  }
  const preparedBroll = brollInput.map((item, index) => {
    const source = ensureFile(String(item.path ?? ""), `B-roll ${index + 1}`);
    const start = Number(item.start);
    const end = Number(item.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
      throw new Error(`Некорректный интервал B-roll ${index + 1}.`);
    }
    const fit = String(item.fit ?? "cover");
    if (!["cover", "contain"].includes(fit)) {
      throw new Error(`Некорректный fit у B-roll ${index + 1}.`);
    }
    const image = /\.(png|jpe?g|webp|avif)$/i.test(source);
    const targetName = `broll-${String(index + 1).padStart(3, "0")}.${image ? "png" : "mp4"}`;
    const target = path.join(publicJob, targetName);
    if (image) {
      run("ffmpeg", ["-nostdin", "-y", "-v", "error", "-i", source, "-frames:v", "1", target]);
    } else {
      run("ffmpeg", [
        "-nostdin", "-y", "-v", "error", "-i", source,
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", target,
      ]);
    }
    return {
      source: `jobs/${jobId}/${targetName}`,
      start,
      end,
      fit,
      kind: image ? "image" : "video",
      label: String(item.label ?? ""),
    };
  });

  const captionStyle = String(option(parsed, "caption-style", "karaoke"));
  if (!["karaoke", "boxed", "minimal", "kinetic"].includes(captionStyle)) {
    throw new Error("--caption-style: допустимы karaoke, boxed, minimal, kinetic.");
  }
  const captionPosition = String(option(parsed, "caption-position", "bottom"));
  if (!["bottom", "center", "top"].includes(captionPosition)) {
    throw new Error("--caption-position: допустимы bottom, center, top.");
  }
  const hookStyle = String(option(parsed, "hook-style", "card"));
  if (!["card", "minimal", "kinetic"].includes(hookStyle)) {
    throw new Error("--hook-style: допустимы card, minimal, kinetic.");
  }
  const videoFit = String(option(parsed, "video-fit", "cover"));
  if (!["cover", "contain"].includes(videoFit)) {
    throw new Error("--video-fit: допустимы cover и contain.");
  }
  const coverAt = numericOption("cover-at", 0.6, 0, 3600);

  const mediaPrefix = `jobs/${jobId}`;
  writeJson(propsPath, {
    videoSource: `${mediaPrefix}/source.mp4`,
    captionsSource: `${mediaPrefix}/captions.json`,
    musicSource: music ? `${mediaPrefix}/music.mp3` : "",
    logoSource: logo ? `${mediaPrefix}/logo.png` : "",
    eyebrow: String(option(parsed, "eyebrow", "")),
    author: String(option(parsed, "author", "")),
    headline: String(option(parsed, "headline", "")),
    callout: String(option(parsed, "callout", "")),
    cta: String(option(parsed, "cta", "")),
    ctaHint: String(option(parsed, "cta-hint", "Дальше")),
    accentColor: String(option(parsed, "accent-color", "#7C3AED")),
    backgroundColor: String(option(parsed, "background-color", "#0B1020")),
    textColor: String(option(parsed, "text-color", "#FFFFFF")),
    fontFamily: String(option(parsed, "font-family", "Arial, Helvetica, sans-serif")),
    hookStyle,
    captionStyle,
    captionBottom: numericOption("caption-bottom", 430, 80, 900),
    captionPosition,
    videoFit,
    blurredBackdrop: hasFlag(parsed, "blurred-backdrop"),
    focusKeyframes,
    broll: preparedBroll,
    highlights,
    coverAt,
    sourceVolume: numericOption("source-volume", 1, 0, 1),
    musicVolume: numericOption("music-volume", 0.12, 0, 1),
    musicDuck: hasFlag(parsed, "music-duck"),
    musicDuckVolume: numericOption("music-duck-volume", 0.035, 0, 1),
    showCaptions: Boolean(captions || !skipTranscription),
    showProgress: !hasFlag(parsed, "no-progress"),
    showSafeArea: false,
  });

  const duration = durationOf(preparedVideo);
  const lastFrame = Math.max(0, Math.ceil(duration * 30) - 1);
  const proofFrames = [0.05, 0.27, 0.5, 0.73, 0.95].map((fraction) =>
    Math.min(lastFrame, Math.floor(lastFrame * fraction)),
  );
  ensureDirectory(proofRoot);
  run(
    nodeCommand,
    [
      path.join(projectRoot, "tools", "render-proof.mjs"),
      "--project", projectRoot,
      "--props", propsPath,
      "--output", proofRoot,
      "--frames", proofFrames.join(","),
      "--cover", coverPath,
      "--cover-frame", String(Math.min(lastFrame, Math.round(coverAt * 30))),
    ],
    { cwd: projectRoot },
  );

  writeStatus("proof_ready", { props: propsPath, proofDirectory: proofRoot });
  console.log(`PROPS=${propsPath}`);
  console.log(`PROOF_DIR=${proofRoot}`);
  console.log("Перед финальным рендером просмотри все пять proof-кадров.");
  process.exit(0);
}

ensureFile(propsPath, "Props после стадии proof");
for (let index = 1; index <= 5; index += 1) {
  ensureFile(
    path.join(proofRoot, `proof-${String(index).padStart(2, "0")}.png`),
    "Обязательный proof-кадр",
  );
}
ensureFile(coverPath, "Обложка после стадии proof");

const concurrency = numericOption("concurrency", 1, 1, 8);
const outputPath = path.join(jobRoot, `${jobId}.mp4`);
run(
  npxCommand,
  [
    "remotion", "render", "ReelsUnderKey", outputPath,
    `--props=${propsPath}`,
    "--codec=h264",
    "--crf=18",
    `--concurrency=${concurrency}`,
  ],
  { cwd: projectRoot },
);
run("ffmpeg", ["-nostdin", "-v", "error", "-i", outputPath, "-f", "null", "-"], {
  cwd: projectRoot,
});

ensureDirectory(qcRoot);
run(
  nodeCommand,
  [
    path.join(projectRoot, "tools", "qc-report.mjs"),
    "--video", outputPath,
    "--output", qcRoot,
    "--width", "1080",
    "--height", "1920",
  ],
  { cwd: projectRoot },
);

const probePath = path.join(jobRoot, "final-metadata.json");
const probe = run(
  "ffprobe",
  [
    "-v", "error",
    "-show_entries", "format=duration,size,bit_rate:stream=index,codec_name,codec_type,width,height,r_frame_rate",
    "-of", "json",
    outputPath,
  ],
  { capture: true },
);
fs.writeFileSync(probePath, `${probe}\n`, "utf8");
const qcReportPath = path.join(qcRoot, "QC-REPORT.json");
const qcReport = JSON.parse(fs.readFileSync(ensureFile(qcReportPath, "QC-отчёт"), "utf8"));

let captionsJsonPath = "";
let captionsSrtPath = "";
const preparedCaptionsPath = path.join(publicJob, "captions.json");
if (fs.existsSync(preparedCaptionsPath)) {
  captionsJsonPath = path.join(jobRoot, `${jobId}-captions.json`);
  captionsSrtPath = path.join(jobRoot, `${jobId}-captions.srt`);
  fs.copyFileSync(preparedCaptionsPath, captionsJsonPath);
  run(
    nodeCommand,
    [
      path.join(projectRoot, "tools", "export-captions.mjs"),
      captionsJsonPath,
      captionsSrtPath,
    ],
    { cwd: projectRoot },
  );
}
writeStatus(qcReport.status === "passed" ? "complete" : "qc_review_required", {
  video: outputPath,
  cover: coverPath,
  captionsJson: captionsJsonPath || null,
  captionsSrt: captionsSrtPath || null,
  qcDirectory: qcRoot,
  qcReport: qcReportPath,
  metadata: probePath,
});
console.log(`RESULT_VIDEO=${outputPath}`);
console.log(`COVER=${coverPath}`);
if (captionsJsonPath) console.log(`CAPTIONS_JSON=${captionsJsonPath}`);
if (captionsSrtPath) console.log(`CAPTIONS_SRT=${captionsSrtPath}`);
console.log(`QC_DIR=${qcRoot}`);
console.log(`QC_REPORT=${qcReportPath}`);
console.log(`QC_STATUS=${qcReport.status}`);
console.log(`METADATA=${probePath}`);
