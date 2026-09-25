'use strict';

const dns = require('dns').promises;
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const MAX_RENDERED_HTML_BYTES = 8 * 1024 * 1024;
const DEFAULT_RENDER_TIMEOUT_MS = 45_000;

function isPrivateIp(address) {
  if (!net.isIP(address)) return false;
  const mapped = String(address).match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return isPrivateIp(mapped[1]);
  if (address === '::1' || /^(?:fc|fd|fe80):/i.test(address)) return true;
  const parts = address.split('.').map(Number);
  return parts.length === 4 && (
    parts[0] === 0 || parts[0] === 10 || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
  );
}

async function validateBrowserUrl(input) {
  const url = new URL(String(input || ''));
  if (url.protocol !== 'https:' || url.username || url.password || /^(?:localhost|.+\.localhost)$/i.test(url.hostname)) {
    throw new Error('URL cần mở phải là HTTPS công khai.');
  }
  if (net.isIP(url.hostname) && isPrivateIp(url.hostname)) throw new Error('Không được mở địa chỉ nội bộ.');
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error('Tên miền cần mở trỏ tới địa chỉ không an toàn.');
  }
  return url;
}

function findBrowserExecutable() {
  const candidates = [
    process.env.RESEARCH_BROWSER_PATH,
    process.platform === 'win32' && process.env['ProgramFiles(x86)'] ? path.join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe') : '',
    process.platform === 'win32' && process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : '',
    process.platform === 'win32' && process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
    process.platform === 'win32' && process.env['ProgramFiles(x86)'] ? path.join(process.env['ProgramFiles(x86)'], 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
    process.platform === 'win32' && process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
    '/usr/bin/microsoft-edge',
    '/usr/bin/microsoft-edge-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((candidate) => {
    try { return fs.statSync(candidate).isFile(); } catch (_) { return false; }
  }) || '';
}

async function removeTemporaryProfile(profilePath) {
  if (!profilePath) return;
  const resolvedProfile = path.resolve(profilePath);
  const resolvedTemp = `${path.resolve(os.tmpdir())}${path.sep}`;
  if (!resolvedProfile.startsWith(resolvedTemp)) return;
  try { await fs.promises.rm(resolvedProfile, { recursive: true, force: true, maxRetries: 3 }); } catch (_) { /* Trình duyệt có thể còn giữ tệp trong chốc lát. */ }
}

async function renderPublicPage(input, options = {}) {
  const url = await validateBrowserUrl(input);
  const browserPath = findBrowserExecutable();
  if (!browserPath) throw new Error('Máy chủ chưa có Microsoft Edge, Chrome hoặc Chromium để mở trang động.');

  const waitMs = Math.min(15_000, Math.max(5_000, Number(options.waitMs) || 5_000));
  const timeoutMs = Math.min(90_000, Math.max(15_000, Number(options.timeoutMs) || DEFAULT_RENDER_TIMEOUT_MS));
  const profilePath = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'soldream-browser-'));
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-sync',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--run-all-compositor-stages-before-draw',
    `--user-data-dir=${profilePath}`,
    `--virtual-time-budget=${waitMs}`,
    '--window-size=1440,1200',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    '--dump-dom',
    url.toString(),
  ];

  let child;
  try {
    const html = await new Promise((resolve, reject) => {
      child = spawn(browserPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const stdout = [];
      const stderr = [];
      let outputBytes = 0;
      let settled = false;

      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(value);
      };
      const timer = setTimeout(() => {
        try { child.kill(); } catch (_) { /* Đã thoát. */ }
        finish(reject, new Error(`Trang không hoàn tất tải sau ${Math.round(timeoutMs / 1000)} giây.`));
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        outputBytes += chunk.length;
        if (outputBytes > MAX_RENDERED_HTML_BYTES) {
          try { child.kill(); } catch (_) { /* Đã thoát. */ }
          finish(reject, new Error('Nội dung trang sau khi dựng vượt quá giới hạn an toàn.'));
          return;
        }
        stdout.push(chunk);
      });
      child.stderr.on('data', (chunk) => {
        if (stderr.reduce((sum, entry) => sum + entry.length, 0) < 32_000) stderr.push(chunk);
      });
      child.once('error', (error) => finish(reject, new Error(`Không thể khởi động trình duyệt: ${error.message}`)));
      child.once('close', (code) => {
        const output = Buffer.concat(stdout).toString('utf8').trim();
        if (code !== 0 && !output) {
          const detail = Buffer.concat(stderr).toString('utf8').replace(/\s+/g, ' ').trim().slice(0, 500);
          finish(reject, new Error(`Trình duyệt không đọc được trang${detail ? `: ${detail}` : '.'}`));
          return;
        }
        if (!/<html\b|<!doctype\s+html/i.test(output)) {
          finish(reject, new Error('Trang đã mở nhưng không trả về tài liệu HTML hợp lệ.'));
          return;
        }
        if (/\bERR_(?:CONNECTION|NAME|ADDRESS|TIMED_OUT|TUNNEL|PROXY|SSL|CERT|INTERNET)[A-Z0-9_]*\b/i.test(output)
          || /(?:can't reach this page|site can’t be reached|site can't be reached|took too long to respond)/i.test(output)) {
          finish(reject, new Error('Trình duyệt đã mở nhưng website nguồn không phản hồi hoặc không thể kết nối.'));
          return;
        }
        finish(resolve, output);
      });
    });
    return { url: url.toString(), html };
  } finally {
    if (child && child.exitCode === null) {
      try { child.kill(); } catch (_) { /* Đã thoát. */ }
    }
    await removeTemporaryProfile(profilePath);
  }
}

module.exports = { renderPublicPage, findBrowserExecutable, validateBrowserUrl, isPrivateIp };
