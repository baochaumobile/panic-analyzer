const path = require('path');
const fs = require('fs');
const https = require('https');
const LOCAL_SIGNATURES = path.join(__dirname, '../backend/signatures.json');
const LOCAL_VERSION = path.join(__dirname, '../backend/signatures_version.json');
const REMOTE_VERSION_URL = 'https://baochaumobile.github.io/panic-signatures/version.json';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function updateSignatures() {
  try {
    const remote = await fetchJSON(REMOTE_VERSION_URL);
    let localVer = { version: '0' };
    if (fs.existsSync(LOCAL_VERSION)) localVer = JSON.parse(fs.readFileSync(LOCAL_VERSION, 'utf8'));
    if (remote.version !== localVer.version) {
      const remoteSignatures = await fetchJSON(remote.url);
      fs.writeFileSync(LOCAL_SIGNATURES, JSON.stringify(remoteSignatures, null, 2));
      fs.writeFileSync(LOCAL_VERSION, JSON.stringify(remote, null, 2));
      return { updated: true, version: remote.version, desc: remote.description };
    } else return { updated: false, reason: 'Up to date' };
  } catch (e) { return { updated: false, error: e.message }; }
}

module.exports = { updateSignatures };
