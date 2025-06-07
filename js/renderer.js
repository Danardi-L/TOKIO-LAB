async function sendPrompt() {
  const prompt = document.getElementById("prompt").value.trim();
  const systemPrompt = document.getElementById("system-prompt")?.value.trim() || "";
  if (!prompt) return;

  const chatBox = document.getElementById("chat-box");
  const status = document.getElementById("status");

  appendMessage(prompt, "user");

  document.getElementById("prompt").value = "";
  status.classList.remove("hidden");

  // Create AI message row for streaming
  const aiRow = document.createElement("div");
  aiRow.classList.add("flex", "items-start", "gap-3", "mb-4", "justify-start");
  const aiAvatar = document.createElement("div");
  aiAvatar.classList.add("flex-shrink-0", "w-9", "h-9", "rounded-full", "flex", "items-center", "justify-center", "text-xl", "font-bold", "bg-green-700", "text-white");
  aiAvatar.textContent = "🤖";
  const aiMsgElem = document.createElement("div");
  aiMsgElem.classList.add("p-4", "rounded-2xl", "max-w-[75%]", "whitespace-pre-wrap", "shadow", "bg-[#232336]", "text-white", "rounded-bl-md");
  aiRow.appendChild(aiAvatar);
  aiRow.appendChild(aiMsgElem);
  chatBox.appendChild(aiRow);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    // Build messages array with system prompt if provided
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const temperature = document.getElementById('temperature').value;
    const res = await fetch("http://localhost:11434/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        stream: true,
        temperature: parseFloat(temperature),
        cache_prompt: true,
        samplers: "edkypmxt",
        dynatemp_range: 0,
        dynatemp_exponent: 1,
        top_k: 40,
        top_p: 0.95,
        min_p: 0.05,
        typical_p: 1,
        xtc_probability: 0,
        xtc_threshold: 0.1,
        repeat_last_n: 64,
        repeat_penalty: 1,
        presence_penalty: 0,
        frequency_penalty: 0,
        dry_multiplier: 0,
        dry_base: 1.75,
        dry_allowed_length: 2,
        dry_penalty_last_n: -1,
        max_tokens: -1,
        timings_per_token: false,
      }),
    });

    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let aiText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      for (const line of chunk.split("\n")) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line.replace(/^data:\s*/, ""));
          if (
            data.choices &&
            data.choices[0] &&
            data.choices[0].delta &&
            data.choices[0].delta.content
          ) {
            aiText += data.choices[0].delta.content;
            aiMsgElem.textContent = aiText;
            chatBox.scrollTop = chatBox.scrollHeight;
          }
        } catch (e) {
          // Ignore JSON parse errors for incomplete lines
        }
      }
    }

    if (!aiText) {
      aiMsgElem.textContent = "No response.";
    } else {
      currentChat.push({ role: "ai", content: aiText });
    }
  } catch (err) {
    aiMsgElem.classList.remove("bg-green-700");
    aiMsgElem.classList.add("bg-red-500", "text-white");
    aiMsgElem.textContent = "⚠️ Error: " + err.message;
  } finally {
    status.classList.add("hidden");
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// --- Settings Persistence ---
function saveSettings() {
  localStorage.setItem('tokio_settings', JSON.stringify({
    model: selectedModel,
    systemPrompt: document.getElementById('system-prompt').value,
    temperature: document.getElementById('temperature').value,
    ctxSize: document.getElementById('ctx-size').value,
    gpuLayers: document.getElementById('gpu-layers').value
  }));
}

function loadSettings() {
  const s = JSON.parse(localStorage.getItem('tokio_settings') || '{}');
  if (s.model) {
    selectedModel = s.model;
    const chosenModelSpan = document.getElementById('chosen-model');
    if (chosenModelSpan) chosenModelSpan.textContent = selectedModel.split(/[\\/]/).pop();
  }
  if (s.systemPrompt !== undefined) {
    document.getElementById('system-prompt').value = s.systemPrompt;
  }
  if (s.temperature !== undefined) {
    document.getElementById('temperature').value = s.temperature;
    updateSliderValue('temperature', s.temperature);
  }
  if (s.ctxSize !== undefined) {
    document.getElementById('ctx-size').value = s.ctxSize;
    updateSliderValue('ctx-size', s.ctxSize);
  }
  if (s.gpuLayers !== undefined) {
    document.getElementById('gpu-layers').value = s.gpuLayers;
    updateSliderValue('gpu-layers', s.gpuLayers);
  }
}

// Save settings when modal closes or when changed
document.getElementById('close-settings-btn').addEventListener('click', () => {
  saveSettings();
  settingsModal.classList.add('hidden');
});
document.getElementById('system-prompt').addEventListener('input', saveSettings);
document.getElementById('temperature').addEventListener('input', saveSettings);

// Settings modal logic
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('open-settings');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const darkToggle = document.getElementById('toggle-dark');
const newChatBtn = document.getElementById('new-chat');
const chatBox = document.getElementById('chat-box');
const chatHistory = document.getElementById('chat-history');

let selectedModel = "";
let currentChat = [];

settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
darkToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
});

// --- Model Selection and Server Control ---
const chooseModelBtn = document.getElementById('choose-model-btn');
const chosenModelSpan = document.getElementById('chosen-model');
const startServerBtn = document.getElementById('start-server-btn');
const stopServerBtn = document.getElementById('stop-server-btn');
const serverLog = document.getElementById('server-log');

chooseModelBtn.addEventListener('click', async () => {
  const model = await window.api.selectModel();
  if (model) {
    selectedModel = model;
    chosenModelSpan.textContent = selectedModel.split(/[\\/]/).pop();
    saveSettings();
  }
});

startServerBtn.addEventListener('click', async () => {
  if (!selectedModel) {
    alert("Please choose a model first!");
    return;
  }
  const ctxSize = document.getElementById('ctx-size').value;
  const gpuLayers = document.getElementById('gpu-layers').value;
  const res = await window.api.startServer(selectedModel, ctxSize, gpuLayers);
  if (res.error) alert(res.error);
});

stopServerBtn.addEventListener('click', async () => {
  await window.api.stopServer();
});

window.api.onServerLog(log => {
  serverLog.textContent += log;
  serverLog.scrollTop = serverLog.scrollHeight;
});
window.api.onServerStopped(code => {
  serverLog.textContent += `\nServer stopped (code ${code})\n`;
});

// --- Chat History Logic ---
function saveCurrentChatToHistory() {
  if (currentChat.length > 0) {
    let history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    history.push({
      title: `Chat ${history.length + 1}`,
      messages: [...currentChat]
    });
    localStorage.setItem('chatHistory', JSON.stringify(history));
    renderChatHistory();
    currentChat = [];
  }
}

function renderChatHistory() {
  chatHistory.innerHTML = '';
  let history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  history.forEach((chat, idx) => {
    const row = document.createElement('div');
    row.className = "flex items-center justify-between group";

    // Chat title button
    const btn = document.createElement('button');
    btn.className = "flex-1 text-left hover:bg-gray-200 dark:hover:bg-gray-800 px-2 py-1 rounded truncate";
    btn.textContent = chat.title || `Chat ${idx + 1}`;
    btn.onclick = () => {
      chatBox.innerHTML = '';
      (chat.messages || []).forEach(msg => appendMessage(msg.content, msg.role));
      currentChat = [];
    };

    // Rename button
    const renameBtn = document.createElement('button');
    renameBtn.className = "ml-2 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition";
    renameBtn.textContent = "✏️";
    renameBtn.title = "Rename chat";
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      let latestHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      const newTitle = prompt("Rename chat:", latestHistory[idx].title || `Chat ${idx + 1}`);
      if (newTitle && newTitle.trim()) {
        latestHistory[idx].title = newTitle.trim();
        localStorage.setItem('chatHistory', JSON.stringify(latestHistory));
        renderChatHistory();
      }
    };

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = "ml-2 text-xs text-red-500 opacity-0 group-hover:opacity-100 transition";
    delBtn.textContent = "🗑️";
    delBtn.title = "Delete chat";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      let latestHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      latestHistory.splice(idx, 1);
      localStorage.setItem('chatHistory', JSON.stringify(latestHistory));
      renderChatHistory();
    };

    row.appendChild(btn);
    row.appendChild(renameBtn);
    row.appendChild(delBtn);
    chatHistory.appendChild(row);
  });
}

function startNewChat() {
  if (currentChat.length > 0) {
    saveCurrentChatToHistory();
  }
  chatBox.innerHTML = '';
  currentChat = [];
}
newChatBtn.addEventListener('click', startNewChat);

// --- Chat Message Append (with history) ---
function appendMessage(message, sender) {
  const chatBox = document.getElementById("chat-box");
  const msgRow = document.createElement("div");
  msgRow.classList.add("flex", "items-start", "gap-3", "mb-4");

  const avatar = document.createElement("div");
  avatar.classList.add("flex-shrink-0", "w-9", "h-9", "rounded-full", "flex", "items-center", "justify-center", "text-xl", "font-bold");

  const msgElem = document.createElement("div");
  msgElem.classList.add(
    "p-4",
    "rounded-2xl",
    "max-w-[75%]",
    "whitespace-pre-wrap",
    "shadow"
  );

  if (sender === "user") {
    msgRow.classList.add("justify-end");
    avatar.textContent = "🧑";
    avatar.classList.add("bg-blue-600", "text-white");
    msgElem.classList.add("bg-blue-600", "text-white", "rounded-br-md");
  } else if (sender === "ai") {
    msgRow.classList.add("justify-start");
    avatar.textContent = "🤖";
    avatar.classList.add("bg-green-700", "text-white");
    msgElem.classList.add("bg-[#232336]", "text-white", "rounded-bl-md");
  } else {
    msgRow.classList.add("justify-start");
    avatar.textContent = "!";
    avatar.classList.add("bg-red-500", "text-white");
    msgElem.classList.add("bg-red-500", "text-white");
  }

  msgElem.textContent = message;

  if (sender === "user") {
    msgRow.appendChild(msgElem);
    msgRow.appendChild(avatar);
  } else {
    msgRow.appendChild(avatar);
    msgRow.appendChild(msgElem);
  }

  chatBox.appendChild(msgRow);
  chatBox.scrollTop = chatBox.scrollHeight;

  // After adding to chatBox, also add to currentChat:
  currentChat.push({ role: sender, content: message });
}

// --- Enter/Shift+Enter logic for textarea ---
const promptInput = document.getElementById("prompt");
promptInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendPrompt();
  }
});

// --- Slider value display logic ---
function updateSliderValue(id, value) {
  document.getElementById(id + '-value').textContent = value;
}

// Initial display
updateSliderValue('temperature', document.getElementById('temperature').value);
updateSliderValue('ctx-size', document.getElementById('ctx-size').value);
updateSliderValue('gpu-layers', document.getElementById('gpu-layers').value);

// On input
document.getElementById('temperature').addEventListener('input', function() {
  updateSliderValue('temperature', this.value);
  saveSettings();
});
document.getElementById('ctx-size').addEventListener('input', function() {
  updateSliderValue('ctx-size', this.value);
  saveSettings();
});
document.getElementById('gpu-layers').addEventListener('input', function() {
  updateSliderValue('gpu-layers', this.value);
  saveSettings();
});

// --- On page load ---
loadSettings();
renderChatHistory();

// --- History Migration ---
function migrateHistoryFormat() {
  let history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  let changed = false;
  history = history.map((item, idx) => {
    if (Array.isArray(item)) {
      changed = true;
      return {
        title: `Chat ${idx + 1}`,
        messages: item.map(msg => typeof msg === 'string' ? { role: 'user', content: msg } : msg)
      };
    }
    return item;
  });
  if (changed) localStorage.setItem('chatHistory', JSON.stringify(history));
}
migrateHistoryFormat();