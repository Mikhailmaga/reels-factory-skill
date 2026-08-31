import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  option,
  parseArgs,
  runDetailed,
  writeJson,
} from "./lib.mjs";

const parsed = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(
  String(option(parsed, "project", path.join(os.homedir(), "Documents", "ReelsFactory"))),
);

const commandCheck = (command, args = ["--version"]) => {
  const result = runDetailed(command, args, { allowFailure: true });
  return {
    ready: result.status === 0,
    version: (result.stdout || result.stderr).split(/\r?\n/)[0]?.trim() ?? "",
  };
};

const checks = {
  node: {
    ready: Number(process.versions.node.split(".")[0]) >= 20,
    version: process.version,
  },
  ffmpeg: commandCheck("ffmpeg", ["-version"]),
  ffprobe: commandCheck("ffprobe", ["-version"]),
  installation: { ready: false, version: "" },
  project: { ready: false, version: "" },
  remotion: { ready: false, version: "" },
  profile: { ready: false, version: "" },
};

const installationPath = path.join(projectRoot, "INSTALLATION.json");
if (fs.existsSync(installationPath)) {
  try {
    const installation = JSON.parse(fs.readFileSync(installationPath, "utf8"));
    checks.installation = {
      ready: installation.status === "ready" && Number(installation.factoryVersion) >= 3,
      version: String(installation.factoryVersion ?? installation.schemaVersion ?? ""),
    };
  } catch (error) {
    checks.installation = { ready: false, version: "invalid: " + error.message };
  }
}

const packagePath = path.join(projectRoot, "package.json");
if (fs.existsSync(packagePath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    checks.project = {
      ready: manifest.name === "reels-factory-studio",
      version: String(manifest.version ?? ""),
    };
  } catch (error) {
    checks.project = { ready: false, version: "invalid: " + error.message };
  }
}

if (checks.project.ready) {
  const remotionPackagePath = path.join(projectRoot, "node_modules", "remotion", "package.json");
  if (fs.existsSync(remotionPackagePath)) {
    const projectManifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const installedRemotion = JSON.parse(fs.readFileSync(remotionPackagePath, "utf8"));
    checks.remotion = {
      ready: installedRemotion.version === projectManifest.dependencies?.remotion,
      version: String(installedRemotion.version ?? ""),
    };
  }
}

const profilePath = path.join(projectRoot, "PROFILE.md");
if (fs.existsSync(profilePath)) {
  const profile = fs.readFileSync(profilePath, "utf8");
  checks.profile = {
    ready: /^profile_status:\s*approved\s*$/im.test(profile),
    version: (profile.match(/^profile_version:\s*(.+)$/im)?.[1] ?? "").trim(),
  };
}

const required = ["node", "ffmpeg", "ffprobe", "installation", "project", "remotion"];
const ready = required.every((name) => checks[name].ready);
const report = {
  schemaVersion: 3,
  factoryVersion: 3,
  status: ready ? "ready" : "needs_attention",
  checkedAt: new Date().toISOString(),
  platform: process.platform,
  architecture: process.arch,
  projectRoot,
  checks,
  providers: {
    local: "ready",
    fal: process.env.FAL_KEY ? "configured" : "not configured",
  },
};

if (fs.existsSync(projectRoot)) {
  writeJson(path.join(projectRoot, "DOCTOR.json"), report);
}
console.log(JSON.stringify(report, null, 2));
process.exitCode = ready ? 0 : 1;
