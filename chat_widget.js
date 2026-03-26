(function () {
  const STORAGE_KEY = "manual_chat_history_v1";
  const API_URL = "http://127.0.0.1:8000/api/chat";

  const bubble = document.createElement("button");
  bubble.className = "manual-chat-bubble";
  bubble.type = "button";
  bubble.title = "打开智能客服";
  bubble.textContent = "🤖";

  const panel = document.createElement("div");
  panel.className = "manual-chat-panel";
  panel.innerHTML = `
    <div class="manual-chat-header">智能客服 · 手册问答</div>
    <div class="manual-chat-messages" id="manual-chat-messages"></div>
    <div class="manual-chat-input-wrap">
      <textarea class="manual-chat-input" id="manual-chat-input" placeholder="请输入问题，例如：如何进行视觉标定？"></textarea>
      <button class="manual-chat-send" id="manual-chat-send">发送</button>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector("#manual-chat-messages");
  const inputEl = panel.querySelector("#manual-chat-input");
  const sendEl = panel.querySelector("#manual-chat-send");

  let history = [];

  function isReaderMode() {
    const app = document.querySelector(".manual-app");
    return !!(app && app.classList.contains("manual-app--reader"));
  }

  function syncVisibilityByMode() {
    const visible = isReaderMode();
    bubble.style.display = visible ? "block" : "none";
    if (!visible) {
      panel.classList.remove("is-open");
    }
  }

  function loadHistory() {
    try {
      history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      history = [];
    }
    history.forEach((item) => appendMessage(item.role, item.text, false));
  }

  function saveHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-30)));
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderMarkdown(text) {
    // 仅支持本场景需要的轻量语法：**加粗** + 换行
    const safe = escapeHtml(text);
    const withBold = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return withBold.replace(/\n/g, "<br>");
  }

  function appendMessage(role, text, save = true) {
    const div = document.createElement("div");
    div.className = `manual-chat-msg ${role}`;
    div.innerHTML = renderMarkdown(text);
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    if (save) {
      history.push({ role, text });
      saveHistory();
    }
    return div;
  }

  async function typewriter(el, text, speed = 18) {
    let current = "";
    el.innerHTML = "";
    for (let i = 0; i < text.length; i += 1) {
      current += text[i];
      el.innerHTML = renderMarkdown(current);
      if (i % 2 === 0) {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
      await new Promise((r) => setTimeout(r, speed));
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function sendMessage() {
    const question = inputEl.value.trim();
    if (!question) return;

    inputEl.value = "";
    appendMessage("user", question, true);
    sendEl.disabled = true;

    const botMsg = appendMessage("bot", "正在检索手册，请稍候...", false);

    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const answer = (data && data.answer) ? data.answer : "服务返回为空，请稍后重试。";
      await typewriter(botMsg, answer);
      history.push({ role: "bot", text: answer });
      saveHistory();
    } catch (err) {
      const failText = "服务暂不可用，请确认后端已启动（uvicorn server:app --reload）。";
      await typewriter(botMsg, failText);
      history.push({ role: "bot", text: failText });
      saveHistory();
    } finally {
      sendEl.disabled = false;
      inputEl.focus();
    }
  }

  bubble.addEventListener("click", () => {
    if (!isReaderMode()) return;
    panel.classList.toggle("is-open");
    if (panel.classList.contains("is-open")) {
      inputEl.focus();
    }
  });

  sendEl.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  loadHistory();
  if (!history.length) {
    appendMessage(
      "bot",
      "你好，我是手册智能客服。你可以问我：安装前准备、LLM任务、Blockly编排、安全规则等问题。",
      true
    );
  }

  // 首页封面隐藏，进入阅读模式后显示
  syncVisibilityByMode();
  const appNode = document.querySelector(".manual-app");
  if (appNode) {
    const observer = new MutationObserver(syncVisibilityByMode);
    observer.observe(appNode, { attributes: true, attributeFilter: ["class"] });
  }
})();
