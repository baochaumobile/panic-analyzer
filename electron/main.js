const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const { updateSignatures } = require('./updater');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    title: "Panic Analyzer – Bảo Châu Mobile",
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
  try {
    const res = await updateSignatures();
    console.log('Updater result:', res);
  } catch (e) {
    console.log('Updater error', e);
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('get-system-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

ipcMain.handle('analyze-panic', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const tmpJson = path.join(os.tmpdir(), `panic_report_${Date.now()}.json`);
      const platform = process.platform;
      let binPath;
      if (platform === 'win32') {
        binPath = path.join(__dirname, '../backend/dist/panic_analyzer_cli.exe');
      } else {
        binPath = path.join(__dirname, '../backend/dist/panic_analyzer_cli');
      }
      if (!fs.existsSync(binPath)) {
        const py = process.platform === 'win32' ? 'python' : 'python3';
        const args = [path.join(__dirname, '..', 'backend', 'panic_parser_v2.py'), filePath, '--json-out', tmpJson, '--signatures', path.join(__dirname, '..', 'backend', 'signatures.json')];
        const proc = spawn(py, args);
        let stderr = '';
        proc.stderr.on('data', d => stderr += d.toString());
        proc.on('close', (code) => {
          if (code !== 0) return reject(new Error('Python parser exit ' + code + ' ' + stderr));
          try {
            const raw = fs.readFileSync(tmpJson, 'utf8');
            fs.unlinkSync(tmpJson);
            resolve(JSON.parse(raw));
          } catch (e) { reject(e); }
        });
        return;
      }
      const args = [filePath, '--json-out', tmpJson, '--signatures', path.join(__dirname, '..', 'backend', 'signatures.json')];
      const proc = spawn(binPath, args, { windowsHide: true });
      let stderr = '';
      proc.stderr.on('data', d => stderr += d.toString());
      proc.on('close', code => {
        if (code !== 0) return reject(new Error('Backend exit ' + code + ' ' + stderr));
        try {
          const raw = fs.readFileSync(tmpJson, 'utf8');
          fs.unlinkSync(tmpJson);
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) { reject(e); }
  });
});
