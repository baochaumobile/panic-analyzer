// electron/main.js
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const mobileBridge = require('./mobile_bridge');
const { updateSignatures } = require('./updater'); // giữ updater cũ

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    title: "Panic Analyzer",
    icon: path.join(__dirname, 'icons', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
}

app.whenReady().then(async () => {
  createWindow();
  try { await updateSignatures(); } catch (e) { console.log('Updater error', e.message); }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('get-system-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

ipcMain.handle('analyze-panic', async (event, filePath) => {
  return analyzeFile(filePath);
});

ipcMain.handle('list-devices', async () => {
  // returns array of UDIDs
  return await mobileBridge.listDevicesViaIDEVICE();
});

ipcMain.handle('analyze-from-usb', async () => {
  // 1) list devices
  const devs = await mobileBridge.listDevicesViaIDEVICE();
  if (!devs || devs.length === 0) throw new Error('Không phát hiện iPhone. Hãy cắm iPhone và bấm Trust nếu được hỏi.');

  // 2) extract panic logs to panic_logs folder
  const outDir = path.join(process.cwd(), 'panic_logs');
  let files;
  try {
    files = await mobileBridge.extractPanicViaIDEVICE(outDir);
  } catch (e) {
    throw new Error('Không thể trích panic từ thiết bị: ' + e.message);
  }

  if (!files || files.length === 0) throw new Error('Không tìm thấy file panic sau khi trích xuất.');

  // 3) pick newest
  const latest = files.map(f => ({ f, m: fs.statSync(f).mtimeMs }))
                      .sort((a,b) => b.m - a.m)[0].f;

  // 4) analyze
  return analyzeFile(latest);
});

function analyzeFile(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const tmpJson = path.join(os.tmpdir(), `panic_report_${Date.now()}.json`);
      const py = (os.platform() === 'win32') ? 'python' : 'python3';
      const parserScript = path.join(__dirname, '..', 'backend', 'panic_parser_v2.py');
      const sigPath = path.join(__dirname, '..', 'backend', 'signatures.json');

      const args = [parserScript, filePath, '--json-out', tmpJson, '--signatures', sigPath];
      const proc = spawn(py, args, { windowsHide: true });

      let stderr = '';
      proc.stderr.on('data', d => stderr += d.toString());
      proc.on('close', code => {
        if (code !== 0) return reject(new Error('Parser error: ' + stderr));
        try {
          const raw = fs.readFileSync(tmpJson, 'utf8');
          fs.unlinkSync(tmpJson);
          resolve(JSON.parse(raw));
        } catch (e) { reject(e); }
      });
    } catch (e) {
      reject(e);
    }
  });
}
