import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { downloadWhisperModel, installWhisperCpp } from "@remotion/install-whisper-cpp";

const cacheBase = process.platform === "win32"
  ? (process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"))
  : process.platform === "darwin"
    ? path.join(os.homedir(), "Library", "Caches")
    : path.join(os.homedir(), ".cache");
const runtimeRoot = path.join(cacheBase, "remotion-reels-whisper");
const whisperPath = path.join(runtimeRoot, "whisper.cpp");
const whisperCppVersion = "1.5.5";
const model = process.env.WHISPER_MODEL ?? "base";

fs.mkdirSync(runtimeRoot, { recursive: true });
const originalWorkingDirectory = process.cwd();
try {
  process.chdir(runtimeRoot);
  await installWhisperCpp({ to: whisperPath, version: whisperCppVersion });
  await downloadWhisperModel({ model, folder: whisperPath });
  console.log(`WHISPER_RUNTIME=${whisperPath}`);
  console.log(`WHISPER_MODEL=${model}`);
} finally {
  process.chdir(originalWorkingDirectory);
}
