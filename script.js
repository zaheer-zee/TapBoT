/* ============================================================
   TapBoT — script.js
   Gemini 2.0 Flash (text) + FLUX.1-schnell (image)
   Keys are loaded from config.js via window.__ENV__
   ============================================================ */

(function () {
  "use strict";

  // ------- CONFIG -------
  const ENV = window.__ENV__ || {};
  const GEMINI_KEY = ENV.GEMINI_API_KEY || "";
  const HF_KEY = ENV.HF_API_KEY || "";

  const CHAT_PROXY = "/api/chat";
  const FLUX_PROXY = "/api/generate-image";

  // ------- STATE -------
  let conversationHistory = []; // { role, parts: [{text}] }
  let currentMode = "chat"; // 'chat' | 'image'
  let isGenerating = false;

  // ------- ELEMENTS -------
  const chatArea         = document.getElementById("chatArea");
  const welcomeScreen    = document.getElementById("welcomeScreen");
  const messagesContainer= document.getElementById("messagesContainer");
  const userInput        = document.getElementById("userInput");
  const sendBtn          = document.getElementById("sendBtn");
  const imgGenBtn        = document.getElementById("imgGenBtn");
  const clearBtn         = document.getElementById("clearBtn");
  const charCount        = document.getElementById("charCount");
  const newChatBtn       = document.getElementById("newChatBtn");
  const sidebarToggle    = document.getElementById("sidebarToggle");
  const mobileMenuBtn    = document.getElementById("mobileMenuBtn");
  const sidebar          = document.getElementById("sidebar");
  const topbarTitle      = document.getElementById("topbarTitle");
  const modeChatBtn      = document.getElementById("modeChatBtn");
  const modeImageBtn     = document.getElementById("modeImageBtn");
  const navChat          = document.getElementById("navChat");
  const navImage         = document.getElementById("navImage");
  const chips            = document.querySelectorAll(".chip");

  // ------- HELPERS -------
  function now() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatArea.scrollTop = chatArea.scrollHeight;
    });
  }

  function hideWelcome() {
    if (!welcomeScreen.classList.contains("hidden")) {
      welcomeScreen.classList.add("hidden");
      welcomeScreen.style.display = "none";
    }
  }

  function setGenerating(val) {
    isGenerating = val;
    sendBtn.disabled = val;
    imgGenBtn.disabled = val;
    userInput.disabled = val;
  }

  // ------- CHAR COUNT -------
  userInput.addEventListener("input", () => {
    const len = userInput.value.length;
    charCount.textContent = `${len} / 4000`;
    autoResize();
  });

  function autoResize() {
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 180) + "px";
  }

  // ------- SEND on Enter (Shift+Enter = newline) -------
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating) handleSend();
    }
  });

  sendBtn.addEventListener("click", () => { if (!isGenerating) handleSend(); });
  imgGenBtn.addEventListener("click", () => { if (!isGenerating) handleImageGen(); });

  // ------- CHIP clicks -------
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      userInput.value = chip.dataset.prompt;
      charCount.textContent = `${chip.dataset.prompt.length} / 4000`;
      autoResize();
      handleSend();
    });
  });

  // ------- MODE SWITCH -------
  function setMode(mode) {
    currentMode = mode;
    modeChatBtn.classList.toggle("active", mode === "chat");
    modeImageBtn.classList.toggle("active", mode === "image");
    navChat.classList.toggle("active", mode === "chat");
    navImage.classList.toggle("active", mode === "image");
    topbarTitle.textContent = mode === "chat" ? "AI Chat" : "Image Generation";
    userInput.placeholder = mode === "chat"
      ? "Message TapBoT..."
      : "Describe the image you want to generate...";

    // show/hide banner
    let banner = document.getElementById("modeBanner");
    if (mode === "image") {
      if (!banner) {
        banner = document.createElement("div");
        banner.id = "modeBanner";
        banner.className = "mode-banner visible";
        banner.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          IMAGE MODE — FLUX.1-schnell via Hugging Face`;
        messagesContainer.parentNode.insertBefore(banner, messagesContainer);
      } else {
        banner.classList.add("visible");
      }
    } else {
      if (banner) banner.classList.remove("visible");
    }
  }

  modeChatBtn.addEventListener("click", () => setMode("chat"));
  modeImageBtn.addEventListener("click", () => setMode("image"));
  navChat.addEventListener("click", () => setMode("chat"));
  navImage.addEventListener("click", () => setMode("image"));

  // ------- SIDEBAR TOGGLE -------
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

  mobileMenuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("mobile-open");
  });

  // close sidebar on mobile overlay click
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768 &&
        sidebar.classList.contains("mobile-open") &&
        !sidebar.contains(e.target) &&
        e.target !== mobileMenuBtn) {
      sidebar.classList.remove("mobile-open");
    }
  });

  // ------- CLEAR -------
  clearBtn.addEventListener("click", clearSession);
  newChatBtn.addEventListener("click", clearSession);

  function clearSession() {
    conversationHistory = [];
    messagesContainer.innerHTML = "";
    welcomeScreen.classList.remove("hidden");
    welcomeScreen.style.display = "";
    userInput.value = "";
    charCount.textContent = "0 / 4000";
    autoResize();
  }

  // ------- RENDER MESSAGE -------
  function appendMessage(role, content, time) {
    hideWelcome();

    const isUser = role === "user";
    const row = document.createElement("div");
    row.className = `message-row ${isUser ? "user-row" : "bot-row"}`;

    const avatar = document.createElement("div");
    avatar.className = `avatar ${isUser ? "user-avatar" : "bot-avatar"}`;
    avatar.textContent = isUser ? "YOU" : "BOT";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const header = document.createElement("div");
    header.className = "bubble-header";

    const roleEl = document.createElement("span");
    roleEl.className = "bubble-role";
    roleEl.textContent = isUser ? "You" : "TapBoT";

    const timeEl = document.createElement("span");
    timeEl.className = "bubble-time";
    timeEl.textContent = time || now();

    header.appendChild(roleEl);
    header.appendChild(timeEl);

    const contentEl = document.createElement("div");
    contentEl.className = "bubble-content";

    if (typeof content === "string") {
      contentEl.innerHTML = formatMarkdown(content);
    } else if (content instanceof HTMLElement) {
      contentEl.appendChild(content);
    }

    bubble.appendChild(header);
    bubble.appendChild(contentEl);
    row.appendChild(avatar);
    row.appendChild(bubble);

    messagesContainer.appendChild(row);
    scrollToBottom();
    return contentEl;
  }

  function appendError(message) {
    const div = document.createElement("div");
    div.className = "error-msg";
    div.textContent = "⚠ " + message;
    messagesContainer.appendChild(div);
    scrollToBottom();
  }

  // ------- TYPING INDICATOR -------
  let typingEl = null;
  function showTyping() {
    typingEl = document.createElement("div");
    typingEl.className = "typing-indicator";
    typingEl.innerHTML = "<span></span><span></span><span></span>";
    messagesContainer.appendChild(typingEl);
    scrollToBottom();
  }
  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  // ------- MARKDOWN FORMATTER -------
  function formatMarkdown(text) {
    // Escape HTML first
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks (```)
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`
    );

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Headers
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Bold & italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Unordered lists
    html = html.replace(/^\s*[-*] (.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);

    // Ordered lists
    html = html.replace(/^\s*\d+\. (.+)$/gm, "<li>$1</li>");

    // Line breaks
    html = html.replace(/\n\n/g, "</p><p>");
    html = html.replace(/\n/g, "<br>");
    html = `<p>${html}</p>`;
    html = html.replace(/<p><\/p>/g, "");
    html = html.replace(/<p>(<h[1-3]>)/g, "$1");
    html = html.replace(/(<\/h[1-3]>)<\/p>/g, "$1");
    html = html.replace(/<p>(<ul>)/g, "$1");
    html = html.replace(/(<\/ul>)<\/p>/g, "$1");
    html = html.replace(/<p>(<pre>)/g, "$1");
    html = html.replace(/(<\/pre>)<\/p>/g, "$1");

    return html;
  }

  // ------- SEND MESSAGE (Gemini) -------
  async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    if (currentMode === "image") { handleImageGen(); return; }

    if (!GEMINI_KEY || GEMINI_KEY === "your_gemini_api_key_here") {
      appendError("Gemini API key not configured. Please update config.js.");
      return;
    }

    const t = now();
    userInput.value = "";
    charCount.textContent = "0 / 4000";
    autoResize();

    appendMessage("user", text, t);

    // push to history
    conversationHistory.push({ role: "user", parts: [{ text }] });

    setGenerating(true);
    showTyping();

    try {
      const body = {
        contents: conversationHistory,
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        systemInstruction: {
          parts: [{
            text: "You are TapBoT, a sophisticated and helpful AI assistant. Be concise, accurate, and friendly. Format code properly with markdown."
          }]
        }
      };

      const response = await fetch(CHAT_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!reply) throw new Error("No response received from Gemini.");

      hideTyping();
      appendMessage("bot", reply, now());

      // push bot response to history
      conversationHistory.push({ role: "model", parts: [{ text: reply }] });

    } catch (err) {
      hideTyping();
      appendError(`Gemini Error: ${err.message}`);
      // remove last user message from history on failure
      conversationHistory.pop();
    } finally {
      setGenerating(false);
      userInput.focus();
    }
  }

  // ------- GENERATE IMAGE (FLUX.1-schnell) -------
  async function handleImageGen() {
    const prompt = userInput.value.trim();
    if (!prompt) {
      userInput.placeholder = "Enter a description first...";
      setTimeout(() => {
        userInput.placeholder = currentMode === "image"
          ? "Describe the image you want to generate..."
          : "Message TapBoT...";
      }, 2000);
      return;
    }

    if (!HF_KEY || HF_KEY === "your_huggingface_api_key_here") {
      appendError("Hugging Face API key not configured. Please update config.js with your HF_API_KEY.");
      return;
    }

    const t = now();
    userInput.value = "";
    charCount.textContent = "0 / 4000";
    autoResize();

    appendMessage("user", `🎨 Generate Image: "${prompt}"`, t);

    setGenerating(true);
    showTyping();

    try {
      const response = await fetch(FLUX_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            num_inference_steps: 4,
            guidance_scale: 0,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "Unknown error");
        let errMsg = `HTTP ${response.status}`;
        try { errMsg = JSON.parse(errText)?.error || errMsg; } catch (_) {}
        throw new Error(errMsg);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      hideTyping();

      // Build image element
      const container = document.createElement("div");
      const img = document.createElement("img");
      img.src = imageUrl;
      img.className = "gen-image";
      img.alt = prompt;
      img.loading = "lazy";

      const label = document.createElement("div");
      label.className = "image-label";
      label.textContent = `FLUX.1-schnell · "${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}"`;

      const downloadLink = document.createElement("a");
      downloadLink.href = imageUrl;
      downloadLink.download = `tapbot-${Date.now()}.png`;
      downloadLink.style.cssText =
        "font-size:11px;font-family:var(--font-mono);color:var(--accent-orange);text-decoration:none;margin-top:6px;display:inline-block;border-bottom:1px solid var(--accent-orange);";
      downloadLink.textContent = "↓ Download";

      container.appendChild(img);
      container.appendChild(label);
      container.appendChild(downloadLink);

      appendMessage("bot", container, now());

    } catch (err) {
      hideTyping();
      appendError(`Image Generation Error: ${err.message}`);
    } finally {
      setGenerating(false);
      userInput.focus();
    }
  }

  // ------- API KEY CHECK on load -------
  window.addEventListener("DOMContentLoaded", () => {
    if (!GEMINI_KEY || GEMINI_KEY === "your_gemini_api_key_here") {
      console.warn("[TapBoT] Gemini API key not set in config.js");
    }
    if (!HF_KEY || HF_KEY === "your_huggingface_api_key_here") {
      console.warn("[TapBoT] Hugging Face API key not set in config.js");
    }
    userInput.focus();
  });

})();
