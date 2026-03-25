// api/chat.js — Vercel Serverless Function
// Proxies chat requests to Google Gemini AI

const https = require("https");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
  }

  const MODEL = "gemini-1.5-flash"; // Stable version
  const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;

  const body = JSON.stringify(req.body);

  return new Promise((resolve) => {
    const geminiReq = https.request(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, (geminiRes) => {
      let data = "";
      geminiRes.on("data", (chunk) => (data += chunk));
      geminiRes.on("end", () => {
        res.status(geminiRes.statusCode).json(JSON.parse(data));
        resolve();
      });
    });

    geminiReq.on("error", (err) => {
      res.status(502).json({ error: err.message });
      resolve();
    });

    geminiReq.write(body);
    geminiReq.end();
  });
}
