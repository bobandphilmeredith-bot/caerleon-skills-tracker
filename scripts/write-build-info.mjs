import { mkdirSync, writeFileSync } from "node:fs";

const builtAt = new Date().toISOString();
const target = new URL("../lib/buildInfo.ts", import.meta.url);

mkdirSync(new URL("../lib", import.meta.url), { recursive: true });
writeFileSync(
  target,
  `export const buildTimestamp = ${JSON.stringify(builtAt)};\n`,
  "utf8"
);
