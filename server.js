// server.js — TapBoT local dev server
// Serves static files AND proxies /api/generate-image to Hugging Face
// Run with: node server.js
// Then open: http://localhost:8080

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const PORT = 8080;

// Load API keys from .env
const envPath = path.join(__dirname, ".env");
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...rest] = trimmed.split("=");
    env[key.trim()] = rest.join("=").trim();
  });
}

const HF_KEY = env.HF_API_KEY || "";
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

const server = http.createServer((req, res) => {
  // CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // ---- PROXY: /api/chat → Google Gemini ----
  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const GEMINI_KEY = env.GEMINI_API_KEY || "";
      const MODEL = "gemini-2.5-flash";
      const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;

      const geminiReq = https.request(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }, (geminiRes) => {
        let data = "";
        geminiRes.on("data", (chunk) => (data += chunk));
        geminiRes.on("end", () => {
          res.writeHead(geminiRes.statusCode, { "Content-Type": "application/json" });
          res.end(data);
        });
      });

      geminiReq.on("error", (err) => {
        console.error("[Gemini Proxy Error]", err.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: err.message }));
      });

      geminiReq.write(body);
      geminiReq.end();
    });
    return;
  }

  // ---- PROXY: /api/generate-image → Hugging Face FLUX.1-schnell ----
  if (req.method === "POST" && req.url === "/api/generate-image") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const options = {
        hostname: "router.huggingface.co",
        path: "/hf-inference/models/black-forest-labs/FLUX.1-schnell",
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_KEY}`,
          "Content-Type": "application/json",
          "x-wait-for-model": "true",
          "Content-Length": Buffer.byteLength(body),
        },
      };

      const hfReq = https.request(options, (hfRes) => {
        const chunks = [];
        hfRes.on("data", (chunk) => chunks.push(chunk));
        hfRes.on("end", () => {
          const data = Buffer.concat(chunks);
          res.writeHead(hfRes.statusCode, {
            "Content-Type": hfRes.headers["content-type"] || "image/jpeg",
            "Content-Length": data.length,
          });
          res.end(data);
        });
      });

      hfReq.on("error", (err) => {
        console.error("[Proxy Error]", err.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: err.message }));
      });

      hfReq.write(body);
      hfReq.end();
    });
    return;
  }

  // ---- STATIC FILE SERVER ----
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);
  // Strip query strings
  filePath = filePath.split("?")[0];

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // fallback: try index.html (SPA)
      filePath = path.join(__dirname, "index.html");
    }
    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 TapBoT running at http://localhost:${PORT}`);
  console.log(`   Gemini : gemini-2.5-flash`);
  console.log(`   Image  : FLUX.1-schnell via HF proxy`);
  console.log(`   Press Ctrl+C to stop\n`);
});
