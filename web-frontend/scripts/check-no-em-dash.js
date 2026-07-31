#!/usr/bin/env node
// Fails with a non-zero exit code if any tracked source file contains an
// em dash (U+2014). Style preference: use a comma, colon, period, or plain
// hyphen instead.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "playwright-report",
  "test-results",
]);
const EM_DASH = "\u2014";

function walk(dir, hits) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, hits);
      continue;
    }
    let content;
    try {
      content = fs.readFileSync(full, "utf8");
    } catch {
      continue; // binary or unreadable file, skip
    }
    if (content.includes(EM_DASH)) {
      content.split("\n").forEach((line, i) => {
        if (line.includes(EM_DASH)) {
          hits.push({
            file: path.relative(ROOT, full),
            line: i + 1,
            text: line.trim(),
          });
        }
      });
    }
  }
}

const hits = [];
walk(ROOT, hits);

if (hits.length > 0) {
  console.error(`Found ${hits.length} em dash occurrence(s):\n`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  ${h.text}`);
  }
  console.error("\nReplace with a comma, colon, period, or hyphen instead.");
  process.exit(1);
}

console.log("No em dashes found.");
