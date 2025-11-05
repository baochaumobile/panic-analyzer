// electron/mobile_bridge.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCmd(cmd, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout ? stdout.toString().trim() : '');
    });
  });
}

async function listDevicesViaIDEVICE() {
  try {
    const out = await runCmd('idevice_id -l');
    if (!out) return [];
    return out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function extractPanicViaIDEVICE(outDir) {
  try {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    // -e extracts reports to folder
    await runCmd(`idevicecrashreport -e "${outDir}"`);
    const files = fs.readdirSync(outDir)
      .filter(f => /\.(ips|panic|log|txt)$/i.test(f))
      .map(f => path.join(outDir, f));
    return files;
  } catch (e) {
    throw new Error('extractPanicViaIDEVICE failed: ' + e.message);
  }
}

module.exports = {
  listDevicesViaIDEVICE,
  extractPanicViaIDEVICE
};
