# TapBoT — Premium AI Chatbot

TapBoT is a high-fidelity AI chatbot platform designed with a premium fintech aesthetic. It leverages **Google Gemini 1.5/2.0 Flash** for intelligent text processing and **Hugging Face FLUX.1-schnell** for rapid, high-quality image generation.

## 🚀 Features
- **Sophisticated Chat**: Real-time intelligent responses via Gemini.
- **Instant Image Gen**: High-speed image creation via FLUX.1-schnell.
- **Premium UI/UX**: Deep Obsidian & Slate Gray theme with International Orange accents.
- **Privacy-First**: API keys are managed server-side and never exposed to the client.

## 🛠️ Tech Stack
- **Frontend**: Vanilla HTML5, CSS3 (Swiss Design), JavaScript (ES6+).
- **Backend/Proxy**: Node.js (Vercel Serverless Functions).
- **APIs**: Google Generative AI (Gemini), Hugging Face Inference.

## 📦 Deployment on Vercel

### 1. Environment Variables
Add the following keys in your Vercel Project Settings -> Environment Variables:
- `GEMINI_API_KEY`: Your Google AI Studio API key.
- `HF_API_KEY`: Your Hugging Face Access Token.

### 2. Local Development
```bash
# Run the local server:
node server.js
```

### 3. Push to GitHub
```bash
git add .
git commit -m "Initialize TapBoT"
git push origin main
```

---
Built with ⚡ by Antigravity.
