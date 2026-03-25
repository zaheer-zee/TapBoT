// generate-config.js — run with: node generate-config.js
// Reads .env and writes config.js for browser consumption
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");
const configPath = path.join(__dirname, "config.js");

const lines = fs.readFileSync(envPath, "utf-8").split("\n");
const env = {};
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const [key, ...rest] = trimmed.split("=");
  env[key.trim()] = rest.join("=").trim();
}

const output = `// This file is auto-generated from .env — DO NOT COMMIT
window.__ENV__ = ${JSON.stringify(env, null, 2)};
`;

fs.writeFileSync(configPath, output);
console.log("✅ config.js generated from .env");
