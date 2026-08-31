import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureDirectory,
  npmCommand,
  npxCommand,
  nodeCommand,
  option,
  parseArgs,
  run,
  writeJson,
} from "./lib.mjs";

const parsed = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(
  String(option(parsed, "project", path.join(os.homedir(), "Documents", "ReelsFactory"))),
);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.dirname(scriptDirectory);
const templateRoot = path.join(skillRoot, "assets", "remotion-template");
const templatePackage = path.join(templateRoot, "package.json");

if (!fs.existsSync(templatePackage)) {
  throw new Error(`В пакете отсутствует Remotion-шаблон: ${templateRoot}`);
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (!Number.isFinite(nodeMajor) || nodeMajor < 20) {
  throw new Error(`Нужен Node.js 20 или новее. Сейчас: ${process.versions.node}`);
}

run("ffmpeg", ["-version"], { capture: true });
run("ffprobe", ["-version"], { capture: true });

const projectPackage = path.join(projectRoot, "package.json");
const projectAlreadyExists = fs.existsSync(projectPackage);
if (projectAlreadyExists) {
  const existing = JSON.parse(fs.readFileSync(projectPackage, "utf8"));
  if (existing.name !== "reels-factory-studio") {
    throw new Error(`Папка уже содержит другой Node.js-проект: ${projectRoot}`);
  }
  fs.cpSync(templateRoot, projectRoot, {
    recursive: true,
    force: true,
    filter: (source) => !["node_modules", "out"].includes(path.basename(source)),
  });
  console.log(`Видеодвижок обновлён без удаления профиля и готовых работ: ${projectRoot}`);
} else {
  ensureDirectory(projectRoot);
  fs.cpSync(templateRoot, projectRoot, { recursive: true });
  console.log(`Шаблон установлен: ${projectRoot}`);
}

ensureDirectory(path.join(projectRoot, "out", "jobs"));

console.log("Устанавливаю зависимости Remotion…");
run(npmCommand, projectAlreadyExists ? ["install", "--no-audit", "--no-fund"] : ["ci"], {
  cwd: projectRoot,
});

console.log("Скачиваю и проверяю браузерный движок Remotion…");
run(npxCommand, ["remotion", "browser", "ensure"], { cwd: projectRoot });

console.log("Скачиваю и проверяю локальный Whisper…");
run(nodeCommand, [path.join(projectRoot, "tools", "ensure-whisper.mjs")], {
  cwd: projectRoot,
});

console.log("Проверяю проект…");
run(npmCommand, ["run", "lint"], { cwd: projectRoot });

const ffmpegVersion = run("ffmpeg", ["-version"], { capture: true })
  .split(/\r?\n/)[0]
  .trim();
const reportPath = path.join(projectRoot, "INSTALLATION.json");
writeJson(reportPath, {
  schemaVersion: 2,
  status: "ready",
  installedAt: new Date().toISOString(),
  platform: process.platform,
  architecture: process.arch,
  node: process.version,
  ffmpeg: ffmpegVersion,
  projectRoot,
});

console.log(`PROJECT_ROOT=${projectRoot}`);
console.log(`PROFILE_PATH=${path.join(projectRoot, "PROFILE.md")}`);
console.log(`INSTALLATION_REPORT=${reportPath}`);
console.log("Полный видеокомплект установлен. Осталось создать и утвердить личный профиль.");
