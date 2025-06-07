const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let serverProcess = null;
let currentModelPath = "";

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'js/preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.handle('start-server', async (event, modelPath, ctxSize, gpuLayers) => {
  if (serverProcess) return { error: "Server already running" };
  if (!modelPath) return { error: "No model selected" };

  // Adjust the path to your llama-server.exe as needed
  const serverExe = path.join(__dirname, '../llama-b5474-bin-win-cuda-12.4-x64/llama-server.exe');
  serverProcess = spawn(serverExe, [
    '-m', modelPath,
    '--port', '11434',
    '--host', '127.0.0.1',
    '--ctx-size', ctxSize || '4096',
    '--n-gpu-layers', gpuLayers || '10'
  ]);

  serverProcess.stdout.on('data', data => {
    event.sender.send('server-log', data.toString());
  });
  serverProcess.stderr.on('data', data => {
    event.sender.send('server-log', data.toString());
  });
  serverProcess.on('close', code => {
    serverProcess = null;
    event.sender.send('server-stopped', code);
  });

  return { success: true };
});

ipcMain.handle('stop-server', async () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    return { success: true };
  }
  return { error: "Server not running" };
});

ipcMain.handle('select-model', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'GGUF Models', extensions: ['gguf'] }],
    properties: ['openFile']
  });
  if (result.canceled) return null;
  currentModelPath = result.filePaths[0];
  return currentModelPath;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});