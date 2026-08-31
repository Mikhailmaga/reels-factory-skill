import fs from "node:fs";
import path from "node:path";
import { parseSrt } from "@remotion/captions";

const input = process.argv[2];
const output = process.argv[3] ?? path.join("public", "media", "captions", "captions.json");

if (!input) {
  console.error("Укажи файл: npm run captions:import -- \"C:\\\\путь\\\\subtitles.srt\"");
  process.exit(1);
}

const inputPath = path.resolve(input);
const outputPath = path.resolve(output);

if (!fs.existsSync(inputPath)) {
  console.error(`Файл не найден: ${inputPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf8");
let captions;

if (path.extname(inputPath).toLowerCase() === ".srt") {
  captions = parseSrt({ input: raw }).captions;
} else {
  const parsed = JSON.parse(raw);
  captions = Array.isArray(parsed) ? parsed : parsed.captions;
}

if (!Array.isArray(captions)) {
  console.error("Ожидался SRT или JSON-массив субтитров.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(captions, null, 2)}\n`);
console.log(`Субтитры готовы: ${outputPath}`);
