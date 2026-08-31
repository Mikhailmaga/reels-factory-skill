import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const isWindows = process.platform === "win32";
export const npmCommand = isWindows ? "npm.cmd" : "npm";
export const npxCommand = isWindows ? "npx.cmd" : "npx";
export const nodeCommand = process.execPath;

export const parseArgs = (values) => {
  const positional = [];
  const options = new Map();

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }

    const withoutPrefix = value.slice(2);
    const equalsIndex = withoutPrefix.indexOf("=");
    if (equalsIndex >= 0) {
      options.set(
        withoutPrefix.slice(0, equalsIndex),
        withoutPrefix.slice(equalsIndex + 1),
      );
      continue;
    }

    const next = values[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      options.set(withoutPrefix, next);
      index += 1;
    } else {
      options.set(withoutPrefix, true);
    }
  }

  return { options, positional };
};

export const option = (parsed, name, fallback = "") =>
  parsed.options.has(name) ? parsed.options.get(name) : fallback;

export const hasFlag = (parsed, name) => parsed.options.get(name) === true;

export const run = (command, args, settings = {}) => {
  const capture = settings.capture === true;
  let executable = command;
  let executableArgs = args;
  if (isWindows && ["npm.cmd", "npx.cmd"].includes(command.toLowerCase())) {
    const cliName = command.toLowerCase() === "npm.cmd" ? "npm-cli.js" : "npx-cli.js";
    const cliPath = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", cliName);
    if (!fs.existsSync(cliPath)) {
      throw new Error(`Не найден системный ${cliName}: ${cliPath}`);
    }
    executable = process.execPath;
    executableArgs = [cliPath, ...args];
  }
  const result = spawnSync(executable, executableArgs, {
    cwd: settings.cwd,
    encoding: "utf8",
    env: settings.env ?? process.env,
    shell: false,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const details = capture
      ? `\n${result.stdout ?? ""}${result.stderr ?? ""}`.trimEnd()
      : "";
    throw new Error(
      `Команда завершилась с кодом ${result.status}: ${command} ${args.join(" ")}${details}`,
    );
  }

  return capture ? (result.stdout ?? "").trim() : "";
};

export const ensureDirectory = (directory) => {
  fs.mkdirSync(directory, { recursive: true });
};

export const ensureFile = (filePath, label = "Файл") => {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} не найден: ${resolved}`);
  }
  return resolved;
};

export const writeJson = (filePath, value) => {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

export const sanitizeJobId = (value) => {
  const cleaned = String(value)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/[. ]+$/g, "")
    .slice(0, 100);
  if (!cleaned) {
    throw new Error("Job ID не может быть пустым.");
  }
  return cleaned;
};

export const assertApproved = (filePath, field, label) => {
  const resolved = ensureFile(filePath, label);
  const body = fs.readFileSync(resolved, "utf8");
  const expression = new RegExp(`^${field}:\\s*approved\\s*$`, "im");
  if (!expression.test(body)) {
    throw new Error(`${label} не утверждён: ${resolved}`);
  }
  return resolved;
};
