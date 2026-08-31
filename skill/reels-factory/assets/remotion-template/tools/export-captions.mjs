import fs from "node:fs";
import path from "node:path";
import { createTikTokStyleCaptions } from "@remotion/captions";

const [inputValue, outputValue] = process.argv.slice(2);
if (!inputValue || !outputValue) {
  throw new Error("Использование: node export-captions.mjs input.json output.srt");
}
const input = path.resolve(inputValue);
const output = path.resolve(outputValue);
const body = JSON.parse(fs.readFileSync(input, "utf8"));
const captions = Array.isArray(body) ? body : body.captions;
if (!Array.isArray(captions)) throw new Error("Ожидался Caption[].");

const pad = (value, length = 2) => String(value).padStart(length, "0");
const timestamp = (milliseconds) => {
  const safe = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(safe / 3600000);
  const minutes = Math.floor((safe % 3600000) / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const millis = safe % 1000;
  return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds) + "," + pad(millis, 3);
};

const { pages } = createTikTokStyleCaptions({
  captions,
  combineTokensWithinMilliseconds: 1800,
});
const blocks = pages
  .map((page, index) => {
    const text = page.tokens.map((token) => token.text).join("").trim();
    const end = Math.max(page.startMs + 300, ...page.tokens.map((token) => token.toMs));
    return [
      String(index + 1),
      timestamp(page.startMs) + " --> " + timestamp(end),
      text,
    ].join("\n");
  })
  .filter((block) => block.trim());
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, blocks.join("\n\n") + (blocks.length ? "\n" : ""), "utf8");
console.log("CAPTIONS_SRT=" + output);
