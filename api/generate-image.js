// api/generate-image.js — Vercel Serverless Function
// Proxies image generation requests to Hugging Face FLUX.1-schnell

const https = require("https");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const HF_KEY = process.env.HF_API_KEY;
  if (!HF_KEY) {
    return res.status(500).json({ error: "HF_API_KEY not configured on server" });
  }

  const body = JSON.stringify(req.body);

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

  return new Promise((resolve) => {
    const hfReq = https.request(options, (hfRes) => {
      const chunks = [];
      hfRes.on("data", (chunk) => chunks.push(chunk));
      hfRes.on("end", () => {
        const data = Buffer.concat(chunks);
        res.setHeader("Content-Type", hfRes.headers["content-type"] || "image/jpeg");
        res.status(hfRes.statusCode).send(data);
        resolve();
      });
    });

    hfReq.on("error", (err) => {
      res.status(502).json({ error: err.message });
      resolve();
    });

    hfReq.write(body);
    hfReq.end();
  });
}
