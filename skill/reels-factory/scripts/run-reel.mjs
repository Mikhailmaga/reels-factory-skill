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
]) {
  ensureFile(path.join(projectRoot, relative), "Обязательный файл проекта");
}

const jobRoot = path.join(projectRoot, "out", "jobs", jobId);
const publicJob = path.join(projectRoot, "public", "jobs", jobId);
const propsPath = path.join(jobRoot, "props.json");
const proofRoot = path.join(jobRoot, "proof");
const qcRoot = path.join(jobRoot, "qc");
const statusPath = path.join(jobRoot, "STATUS.json");
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

  const captionStyle = String(option(parsed, "caption-style", "karaoke"));
  if (!["karaoke", "boxed", "minimal"].includes(captionStyle)) {
    throw new Error("--caption-style: допустимы karaoke, boxed, minimal.");
  }
  const videoFit = String(option(parsed, "video-fit", "cover"));
  if (!["cover", "contain"].includes(videoFit)) {
    throw new Error("--video-fit: допустимы cover и contain.");
  }

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
    captionStyle,
    captionBottom: numericOption("caption-bottom", 430, 80, 900),
    videoFit,
    blurredBackdrop: hasFlag(parsed, "blurred-backdrop"),
    highlights,
    sourceVolume: numericOption("source-volume", 1, 0, 1),
    musicVolume: numericOption("music-volume", 0.12, 0, 1),
    showCaptions: Boolean(captions || !skipTranscription),
    showProgress: !hasFlag(parsed, "no-progress"),
    showSafeArea: false,
  });

  const duration = durationOf(preparedVideo);
  const lastFrame = Math.max(0, Math.ceil(duration * 30) - 1);
  const proofFrames = [0.08, 0.5, 0.9].map((fraction) =>
    Math.min(lastFrame, Math.floor(lastFrame * fraction)),
  );
  ensureDirectory(proofRoot);
  proofFrames.forEach((frame, index) => {
    const proofPath = path.join(proofRoot, `proof-${String(index + 1).padStart(2, "0")}.png`);
    run(
      npxCommand,
      ["remotion", "still", "ReelsUnderKey", proofPath, `--props=${propsPath}`, `--frame=${frame}`],
      { cwd: projectRoot },
    );
  });

  writeStatus("proof_ready", { props: propsPath, proofDirectory: proofRoot });
  console.log(`PROPS=${propsPath}`);
  console.log(`PROOF_DIR=${proofRoot}`);
  console.log("Перед финальным рендером просмотри все три proof-кадра.");
  process.exit(0);
}

ensureFile(propsPath, "Props после стадии proof");
for (let index = 1; index <= 3; index += 1) {
  ensureFile(
    path.join(proofRoot, `proof-${String(index).padStart(2, "0")}.png`),
    "Обязательный proof-кадр",
  );
}

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
const duration = durationOf(outputPath);
const fractions = [0.08, 0.5, 0.9];
const fallbackFractions = [0.03, 0.4, 0.75];
for (let index = 0; index < fractions.length; index += 1) {
  const qcPath = path.join(qcRoot, `final-${String(index + 1).padStart(2, "0")}.png`);
  const makeFrame = (fraction) => {
    const second = Math.min(Math.max(0, duration - 0.1), duration * fraction).toFixed(3);
    run(
      "ffmpeg",
      ["-nostdin", "-y", "-v", "error", "-ss", second, "-i", outputPath, "-frames:v", "1", "-vf", "scale=540:-2", qcPath],
      { cwd: projectRoot },
    );
  };
  try {
    makeFrame(fractions[index]);
  } catch {
    makeFrame(fallbackFractions[index]);
  }
  ensureFile(qcPath, "Финальный QC-кадр");
}

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
writeStatus("complete", { video: outputPath, qcDirectory: qcRoot, metadata: probePath });
console.log(`RESULT_VIDEO=${outputPath}`);
console.log(`QC_DIR=${qcRoot}`);
console.log(`METADATA=${probePath}`);
