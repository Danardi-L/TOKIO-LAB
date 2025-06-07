# 🧠 AI Chat App (Electron + Local LLM)

A local chat AI app built with Electron.js and styled like LM Studio. Chat with LLaMA models (GGUF) **fully offline**, with slick UI and tuning options.

---

## ✨ Features
- 🗂️ Model picker (.gguf)
- 🧠 System prompt customization
- 🔧 Adjustable temperature, top-k, top-p
- 📡 Local server start/stop
- 📜 Server logs viewer
- 💬 Chat history & new chat tab
- 🌗 Light/Dark mode toggle
- 🎯 Clean, minimal UI inspired by OpenAI Chat

---

## 🖥️ Tech Stack
- Electron.js
- HTML + TailwindCSS
- Node.js
- Local LLaMA models via `llama-server`

---

## ⚙️ Setup Instructions

### 1. Clone the repo
```bash
git clone https://github.com/MrNuby/ai-chat-electron.git
cd ai-chat-electron

### 2. Install dependencies
```bash
npm install

### 3. Start the app
```bash
npm start

---

## 🧪 How it works
Starts a local llama-server instance (via child_process)

Communicates with the API on http://localhost:11434/v1/chat/completions

Uses streaming to show tokens as they arrive

UI handles model configs, settings modal, and dynamic tabs