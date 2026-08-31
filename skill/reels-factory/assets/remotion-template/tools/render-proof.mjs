import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const values = process.argv.slice(2);
const readOption = (name, required = false) => {
  const index = values.indexOf("--" + name);
  const value = index >= 0 ? values[index + 1] : "";
  if (required && !value) throw new Error("Не указан --" + name + ".");
  return value;
};

const projectRoot = path.resolve(readOption("project", true));
const propsPath = path.resolve(readOption("props", true));
const outputRoot = path.resolve(readOption("output", true));
const coverOutputValue = readOption("cover");
const coverOutput = coverOutputValue ? path.resolve(coverOutputValue) : "";
const coverFrame = Number(readOption("cover-frame") || 0);
if (coverOutput && (!Number.isInteger(coverFrame) || coverFrame < 0)) {
  throw new Error("--cover-frame должен быть целым неотрицательным номером кадра.");
}
const frames = readOption("frames", true)
  .split(",")
  .map((item) => Number(item.trim()));
if (!frames.length || frames.some((frame) => !Number.isInteger(frame) || frame < 0)) {
  throw new Error("--frames должен содержать целые номера кадров через запятую.");
}
const inputProps = JSON.parse(fs.readFileSync(propsPath, "utf8"));
const coverBaseProps = structuredClone(inputProps);
fs.mkdirSync(outputRoot, { recursive: true });

const serveUrl = await bundle({
  entryPoint: path.join(projectRoot, "src", "index.ts"),
  onProgress(progress) {
    if (progress % 20 < 1) console.log("BUNDLE_PROGRESS=" + Math.round(progress));
  },
});
const composition = await selectComposition({
  serveUrl,
  id: "ReelsUnderKey",
  inputProps,
});

for (let index = 0; index < frames.length; index += 1) {
  const output = path.join(
    outputRoot,
    "proof-" + String(index + 1).padStart(2, "0") + ".png",
  );
  await renderStill({
    composition,
    serveUrl,
    inputProps,
    frame: Math.min(frames[index], composition.durationInFrames - 1),
    output,
    imageFormat: "png",
  });
  console.log("PROOF_FRAME=" + output);
}

if (coverOutput) {
  fs.mkdirSync(path.dirname(coverOutput), { recursive: true });
  const coverProps = {
    ...coverBaseProps,
    showCaptions: false,
    showProgress: false,
    showSafeArea: false,
    callout: "",
    cta: "",
  };
  const coverComposition = await selectComposition({
    serveUrl,
    id: "ReelsUnderKey",
    inputProps: coverProps,
  });
  await renderStill({
    composition: coverComposition,
    serveUrl,
    inputProps: coverProps,
    frame: Math.min(coverFrame, coverComposition.durationInFrames - 1),
    output: coverOutput,
    imageFormat: "png",
  });
  console.log("COVER=" + coverOutput);
}
