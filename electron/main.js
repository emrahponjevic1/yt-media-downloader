import { app, BrowserWindow, ipcMain, dialog, shell, Menu, MenuItem } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, exec, spawnSync } from 'child_process';
import fs from 'fs';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ffmpegPathResolved = app.isPackaged
  ? path.join(process.resourcesPath, 'bin', 'ffmpeg.exe')
  : path.join(__dirname, '../bin/ffmpeg.exe');

let mainWindow;
let splashWindow;
let userYtDlpPath;
let activeAudioProcesses = new Map();
let currentVideoDownloadProcess = null;
let videoDownloadAborted = false;
let oauthProcess = null;
let userDenoPath = null;
let cachedBrowser = null;
let killedAudioProcesses = new Set();
let ytDlpCacheDir;

const logPath = path.join(app.getPath('userData'), 'debug.log');
function logToFile(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  try {
    fs.appendFileSync(logPath, line);
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
}

function getUniqueFilePath(folder, baseName, ext) {
  let counter = 0;
  // Osiguravamo da ekstenzija nema tačku na početku radi lakšeg spajanja
  const cleanExt = ext.startsWith('.') ? ext.slice(1) : ext;

  // Početni pokušaj (bez broja)
  let finalName = `${baseName}.${cleanExt}`;
  let fullPath = path.join(folder, finalName);

  // Petlja koja vrti dok god fs.existsSync javlja da fajl već postoji
  while (fs.existsSync(fullPath)) {
    counter++;
    // Generišemo novo ime sa sufiksom, npr. MojaPjesma(1).mp4
    finalName = `${baseName}(${counter}).${cleanExt}`;
    fullPath = path.join(folder, finalName);
  }

  return fullPath;
}

function cleanupTempFiles(folder, safeTitle) {
  try {
    if (!folder || !fs.existsSync(folder)) return;
    const files = fs.readdirSync(folder);
    const prefix = `temp_${safeTitle}`;
    for (const file of files) {
      if (file.startsWith(prefix)) {
        try {
          fs.unlinkSync(path.join(folder, file));
          logToFile(`[cleanup] Deleted temp file: ${file}`);
        } catch (e) {
          logToFile(`[cleanup] FAILED to delete ${file}: ${e.message}`);
        }
      }
    }
  } catch (e) {
    logToFile(`[cleanup] Error reading dir ${folder}: ${e.message}`);
  }
}

logToFile('--- Application Starting ---');
logToFile(`[startup] App version: ${app.getVersion()}`);
logToFile(`[startup] Platform: ${process.platform} ${process.arch}`);
logToFile(`[startup] Electron: ${process.versions.electron}`);
logToFile(`[startup] ffmpegPathResolved: ${ffmpegPathResolved}`);
logToFile(`[startup] ffmpeg exists: ${fs.existsSync(ffmpegPathResolved)}`);

const iconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'build/icon.ico')
  : path.join(__dirname, '../build/icon.ico');

async function detectBestBrowser() {
  const browserList = [];
  const localAppData = process.env.LOCALAPPDATA || '';
  const appData = process.env.APPDATA || '';

  // Chrome
  browserList.push({
    name: 'chrome',
    cookies: path.join(localAppData, 'Google/Chrome/User Data/Default/Network/Cookies'),
    localState: path.join(localAppData, 'Google/Chrome/User Data/Local State'),
    profileDir: 'Default'
  });
  // Edge
  browserList.push({
    name: 'edge',
    cookies: path.join(localAppData, 'Microsoft/Edge/User Data/Default/Network/Cookies'),
    localState: path.join(localAppData, 'Microsoft/Edge/User Data/Local State'),
    profileDir: 'Default'
  });
  // Brave
  browserList.push({
    name: 'brave',
    cookies: path.join(localAppData, 'BraveSoftware/Brave-Browser/User Data/Default/Network/Cookies'),
    localState: path.join(localAppData, 'BraveSoftware/Brave-Browser/User Data/Local State'),
    profileDir: 'Default'
  });

  let fallbackBrowser = null;

  for (const b of browserList) {
    if (fs.existsSync(b.cookies)) {
      if (!fallbackBrowser) fallbackBrowser = b.name;

      const has4K = await new Promise((resolve) => {
        // Safe Copy Logic using CMD (more robust against locks)
        const tempBrowserDir = path.join(ytDlpCacheDir, 'temp_browser', b.name);
        const tempProfileDir = path.join(tempBrowserDir, b.profileDir, 'Network');
        const tempCookiesPath = path.join(tempProfileDir, 'Cookies');
        const tempLocalStatePath = path.join(tempBrowserDir, 'Local State');

        if (!fs.existsSync(tempProfileDir)) fs.mkdirSync(tempProfileDir, { recursive: true });

        // Use shell copy instead of fs.copyFileSync to bypass EBUSY
        const copyCmd = `copy /y "${b.cookies}" "${tempCookiesPath}" & copy /y "${b.localState}" "${tempLocalStatePath}"`;

        exec(copyCmd, async (err) => {
          // Čak i ako copy baci grešku, pokušaćemo, jer možda je bar Local State kopiran
          const checkArgs = [
            '--force-ipv4',
            '--no-check-certificate',
            '--cookies-from-browser', `${b.name}:${tempBrowserDir}`,
            '--extractor-args', 'youtube:player_client=tv,android,web,ios,mweb',
            '-F', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
          ];
          if (userDenoPath) checkArgs.push('--js-runtimes', 'deno');

          const check = spawn(userYtDlpPath, checkArgs, getYtDlpSpawnOptions());
          let output = '';
          check.stdout.on('data', d => output += d.toString());
          check.on('close', (code) => {
            const success = output.includes('2160p') || output.includes('1440p');
            console.log(`[Browser Detection] ${b.name}: exit=${code}, 4K=${success}`);
            resolve(success);
          });
        });
      });

      if (has4K) {
        cachedBrowser = { browser: b.name, has4K: true, tempProfile: path.join(ytDlpCacheDir, 'temp_browser', b.name) };
        console.log(`[Browser Detection] BEST: ${b.name} has 4K access.`);
        return;
      }
    }
  }

  // Firefox Fallback (Doesn't need safe copy usually)
  const firefoxProfilesDir = path.join(appData, 'Mozilla/Firefox/Profiles');
  if (fs.existsSync(firefoxProfilesDir)) {
    try {
      const profiles = fs.readdirSync(firefoxProfilesDir);
      const p = profiles.find(profile => profile.endsWith('.default-release') || profile.endsWith('.default'));
      if (p) {
        const cookiesPath = path.join(firefoxProfilesDir, p, 'cookies.sqlite');
        if (fs.existsSync(cookiesPath)) {
          // Test Firefox...
          cachedBrowser = { browser: 'firefox', has4K: false }; // Simplified for now
        }
      }
    } catch (e) { }
  }

  cachedBrowser = fallbackBrowser ? { browser: fallbackBrowser, has4K: false } : false;
  console.log(`[Browser Detection] Result:`, cachedBrowser);
}

function parseTargetRes(quality) {
  if (!quality) return '1080';
  const q = quality.toLowerCase();
  if (q.includes('2160') || q.includes('4k')) return '2160';
  if (q.includes('1440') || q.includes('2k')) return '1440';
  if (q.includes('1080')) return '1080';
  if (q.includes('720')) return '720';
  if (q.includes('480')) return '480';
  if (q.includes('360')) return '360';
  if (q.includes('240')) return '240';
  if (q.includes('144')) return '144';
  return '1080';
}

function sanitizeFilename(name) {
  // Keep only alphanumeric characters, spaces, and basic punctuation, then trim
  return name
    .replace(/[^\w\s\d\-_()\[\].]/g, ' ') // Allowed dot back
    .replace(/\s+/g, ' ')               // collapse multiple spaces
    .trim();
}

function ensureYtDlp() {
  const userDataPath = app.getPath('userData');
  const binFolder = path.join(userDataPath, 'bin');
  userYtDlpPath = path.join(binFolder, 'yt-dlp.exe');

  if (!fs.existsSync(binFolder)) fs.mkdirSync(binFolder, { recursive: true });

  const bundledYtDlp = app.isPackaged
    ? path.join(process.resourcesPath, 'bin/yt-dlp.exe')
    : path.join(__dirname, '../bin/yt-dlp.exe');

  if (!fs.existsSync(userYtDlpPath) && fs.existsSync(bundledYtDlp)) {
    fs.copyFileSync(bundledYtDlp, userYtDlpPath);
  } else if (!fs.existsSync(userYtDlpPath) && !fs.existsSync(bundledYtDlp)) {
    // Fallback
    userYtDlpPath = bundledYtDlp;
  }

  ytDlpCacheDir = path.join(app.getPath('userData'), 'yt_dlp_cache');
  if (!fs.existsSync(ytDlpCacheDir)) fs.mkdirSync(ytDlpCacheDir, { recursive: true });

  // 3. Cache invalidacija na osnovu verzije
  if (fs.existsSync(userYtDlpPath)) {
    try {
      const versionPath = path.join(ytDlpCacheDir, 'version.txt');
      const vProcess = spawnSync(userYtDlpPath, ['--version']);
      if (vProcess.status === 0) {
        const currentVersion = vProcess.stdout.toString().trim();
        const lastVersion = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, 'utf-8').trim() : '';

        if (currentVersion !== lastVersion) {
          console.log(`[Cache] yt-dlp version changed (${lastVersion} -> ${currentVersion}). Cleaning internal cache...`);
          const files = fs.readdirSync(ytDlpCacheDir);
          for (const file of files) {
            // NE BRIŠEMO TOKEN
            if (file !== 'youtube-oauth2.token.json' && file !== 'version.txt') {
              try { fs.unlinkSync(path.join(ytDlpCacheDir, file)); } catch (e) { }
            }
          }
          fs.writeFileSync(versionPath, currentVersion);
        }
      }
    } catch (e) {
      console.error('[Cache] Version check failed:', e);
    }
  }
}

function checkDenoRuntime() {
  // First check if deno is in our app data folder
  const userDataPath = app.getPath('userData');
  const binFolder = path.join(userDataPath, 'bin');
  const localDeno = path.join(binFolder, 'deno.exe');

  if (fs.existsSync(localDeno)) {
    userDenoPath = localDeno;
    return;
  }

  // Then check if deno is installed system-wide
  const checkProcess = spawn('where', ['deno'], { shell: true });
  let output = '';
  checkProcess.stdout.on('data', (d) => output += d.toString());
  checkProcess.on('close', (code) => {
    if (code === 0 && output.trim()) {
      userDenoPath = output.trim().split('\n')[0].trim();
    } else {
      // Deno not found anywhere — notify the frontend
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('deno:missing');
      }
    }
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = (reqUrl) => {
      https.get(reqUrl, { headers: { 'User-Agent': 'YT-Downloader' } }, (res) => {
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      }).on('error', (err) => {
        fs.unlink(destPath, () => { });
        reject(err);
      });
    };
    request(url);
  });
}

// Build spawn options that include deno's directory in PATH
// This avoids the Windows colon-in-path issue with --js-runtimes deno:C:\...
function getYtDlpSpawnOptions() {
  if (userDenoPath) {
    const denoDir = path.dirname(userDenoPath);
    return { env: { ...process.env, PATH: `${denoDir};${process.env.PATH}` } };
  }
  return {};
}

function getCookieArgs() {
  const cookieFilePath = path.join(ytDlpCacheDir, 'youtube_cookies.txt');
  if (fs.existsSync(cookieFilePath)) {
    return ['--cookies', cookieFilePath];
  }
  // Fallback to browser cookies is disabled because it often fails due to file locks (EBUSY)
  // or encryption issues, causing the entire download to fail.
  // Instead, we let yt-dlp run without cookies and handle AUTH_REQUIRED via our modal.
  return [];
}

function checkYtDlpUpdate() {
  if (!fs.existsSync(userYtDlpPath)) return;

  // Koristimo sinhronu provjeru sa timeoutom za stabilnost
  const vProcess = spawnSync(userYtDlpPath, ['--version'], { encoding: 'utf-8', timeout: 5000 });
  let localVersion = (vProcess.status === 0) ? vProcess.stdout.trim() : "Staro/Oštećeno";

  https.get({
    hostname: 'api.github.com',
    path: '/repos/yt-dlp/yt-dlp/releases/latest',
    headers: { 'User-Agent': 'YT-Downloader' }
  }, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        // Jednostavno poređenje stringova za datume verzija
        if (json.tag_name && json.tag_name > localVersion) {
          mainWindow.webContents.send('update:yt-dlp-available', {
            local: localVersion === "Staro/Oštećeno" ? "" : localVersion,
            remote: json.tag_name
          });
        }
      } catch (e) { }
    });
  }).on('error', () => { });
}

function createWindow() {
  splashWindow = new BrowserWindow({
    title: 'YT Media Downloader',
    width: 450,
    height: 350,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#111827',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  mainWindow = new BrowserWindow({
    title: 'YT Media Downloader',
    width: 900,
    height: 850,
    minWidth: 890,
    minHeight: 810,
    show: false,
    backgroundColor: '#111827',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    },
    frame: false,
    autoHideMenuBar: true,
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:35123');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Omogući desni klik (Copy/Paste) globalno
  mainWindow.webContents.on('context-menu', (e, props) => {
    const menu = new Menu();

    if (props.isEditable) {
      menu.append(new MenuItem({ label: 'Poništi (Undo)', role: 'undo' }));
      menu.append(new MenuItem({ label: 'Ponovi (Redo)', role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Izreži (Cut)', role: 'cut' }));
      menu.append(new MenuItem({ label: 'Kopiraj (Copy)', role: 'copy' }));
      menu.append(new MenuItem({ label: 'Zalijepi (Paste)', role: 'paste' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Odaberi sve', role: 'selectAll' }));
    } else if (props.selectionText && props.selectionText.trim() !== '') {
      menu.append(new MenuItem({ label: 'Kopiraj (Copy)', role: 'copy' }));
    } else {
      return;
    }

    menu.popup(mainWindow);
  });

  // Prevent white flash and show when ready
  let splashClosed = false;
  const closeSplash = () => {
    if (!splashClosed) {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      mainWindow.show();
      splashClosed = true;
    }
  };

  mainWindow.once('ready-to-show', () => {
    // Vite needs an extra second in dev mode to render React
    setTimeout(closeSplash, isDev ? 1500 : 500);
  });
}

app.whenReady().then(() => {
  ensureYtDlp();
  createWindow();

  // Check for updates and deno runtime slightly after UI loads
  setTimeout(checkYtDlpUpdate, 3000);
  setTimeout(checkDenoRuntime, 4000);
  setTimeout(() => detectBestBrowser(), 6000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('app:close', () => {
  app.quit();
});

ipcMain.on('app:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('app:openExternal', (event, url) => {
  shell.openExternal(url);
});

ipcMain.on('app:openFolder', (event, folderPath) => {
  shell.openPath(folderPath);
});

ipcMain.handle('update:yt-dlp-start', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const binFolder = path.join(userDataPath, 'bin');
    const targetPath = path.join(binFolder, 'yt-dlp.exe');
    const tempPath = targetPath + '.new';

    // 1. Dohvatanje info o zadnjem release-u sa GitHub-a
    const releaseData = await new Promise((resolve, reject) => {
      https.get({
        hostname: 'api.github.com',
        path: '/repos/yt-dlp/yt-dlp/releases/latest',
        headers: { 'User-Agent': 'YT-Downloader' }
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        });
      }).on('error', reject);
    });

    const asset = releaseData.assets.find(a => a.name === 'yt-dlp.exe');
    if (!asset) throw new Error('yt-dlp.exe nije pronađen na GitHubu');

    // 2. Preuzimanje novog fajla
    await downloadFile(asset.browser_download_url, tempPath);

    // 3. Zamjena starog fajla novim
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch (e) {
        // Ako je fajl zaključan (Windows), pokušaj ga preimenovati (to obično radi čak i ako je otvoren)
        const oldPath = targetPath + '.old';
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        fs.renameSync(targetPath, oldPath);
      }
    }
    fs.renameSync(tempPath, targetPath);

    return true;
  } catch (e) {
    console.error('yt-dlp update failed:', e);
    return false;
  }
});

ipcMain.handle('deno:install', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const binFolder = path.join(userDataPath, 'bin');
    if (!fs.existsSync(binFolder)) fs.mkdirSync(binFolder, { recursive: true });

    const zipPath = path.join(binFolder, 'deno.zip');
    const denoExePath = path.join(binFolder, 'deno.exe');

    // Get latest deno release download URL
    const releaseData = await new Promise((resolve, reject) => {
      https.get({
        hostname: 'api.github.com',
        path: '/repos/denoland/deno/releases/latest',
        headers: { 'User-Agent': 'YT-Downloader' }
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        });
      }).on('error', reject);
    });

    const asset = releaseData.assets.find(a => a.name.includes('x86_64') && a.name.includes('windows') && a.name.endsWith('.zip'));
    if (!asset) throw new Error('Deno download not found for Windows x64');

    // Download the zip
    await downloadFile(asset.browser_download_url, zipPath);

    // Extract using PowerShell
    await new Promise((resolve, reject) => {
      exec(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${binFolder}' -Force"`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Clean up zip
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    if (fs.existsSync(denoExePath)) {
      userDenoPath = denoExePath;
      return true;
    }
    return false;
  } catch (e) {
    console.error('Deno install failed:', e);
    return false;
  }
});

ipcMain.handle('auth:youtube-login', async () => {
  return new Promise((resolve) => {
    const loginWindow = new BrowserWindow({
      width: 500,
      height: 650,
      title: 'YouTube Prijava',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: 'persist:youtube'
      },
      parent: mainWindow,
      modal: true,
      autoHideMenuBar: true,
      icon: iconPath
    });

    loginWindow.loadURL('https://accounts.google.com/signin/v2/identifier?service=youtube');

    // Provjera da li je korisnik ulogovan - detektujemo redirect na youtube.com
    loginWindow.webContents.on('did-navigate', async (event, url) => {
      if (url.includes('youtube.com') && !url.includes('accounts.google.com')) {
        // Korisnik je ulogovan, exportujemo cookies
        try {
          const cookies = await loginWindow.webContents.session.cookies.get({ domain: '.youtube.com' });
          const googleCookies = await loginWindow.webContents.session.cookies.get({ domain: '.google.com' });
          const allCookies = [...cookies, ...googleCookies];

          const lines = ['# Netscape HTTP Cookie File'];

          for (const c of allCookies) {
            // Netscape format zahtijeva tačno ovaj raspored
            const domain = c.domain.startsWith('.') ? c.domain : '.' + c.domain;
            const httpOnly = c.httpOnly ? '#HttpOnly_' + domain : domain;
            const subdomains = 'TRUE';
            const path = c.path || '/';
            const secure = c.secure ? 'TRUE' : 'FALSE';
            const expiry = c.expirationDate ? Math.floor(c.expirationDate) : Math.floor(Date.now() / 1000) + 86400 * 365;

            // Preskoči cookies čija vrijednost sadrži tab ili newline
            if (c.value.includes('\t') || c.value.includes('\n')) continue;

            lines.push(`${httpOnly}\t${subdomains}\t${path}\t${secure}\t${expiry}\t${c.name}\t${c.value}`);
          }

          const cookieFilePath = path.join(ytDlpCacheDir, 'youtube_cookies.txt');
          fs.writeFileSync(cookieFilePath, lines.join('\n') + '\n');
          console.log(`[Auth] Saved ${lines.length - 1} cookies to ${cookieFilePath}`);

          loginWindow.close();
          resolve({ success: true, cookieCount: allCookies.length });
        } catch (e) {
          console.error('[Auth] Cookie export failed:', e);
          loginWindow.close();
          resolve({ success: false, error: e.message });
        }
      }
    });

    loginWindow.on('closed', () => {
      resolve({ success: false, error: 'Window closed by user' });
    });
  });
});

ipcMain.handle('auth:check-cookie-file', async () => {
  const cookieFilePath = path.join(ytDlpCacheDir, 'youtube_cookies.txt');
  if (fs.existsSync(cookieFilePath)) {
    const content = fs.readFileSync(cookieFilePath, 'utf-8');
    const cookieCount = content.split('\n').filter(l => l && !l.startsWith('#')).length;
    return { exists: true, cookieCount };
  }
  return { exists: false, cookieCount: 0 };
});

ipcMain.handle('auth:check-status', async () => {
  // 1. Provjera Electron WebView cookie fajla (naš novi metod)
  const cookieFilePath = path.join(ytDlpCacheDir, 'youtube_cookies.txt');
  if (fs.existsSync(cookieFilePath)) {
    const content = fs.readFileSync(cookieFilePath, 'utf-8');
    const cookieCount = content.split('\n').filter(l => l && !l.startsWith('#')).length;
    if (cookieCount > 0) {
      return { loggedIn: true, method: 'webview', cookieCount };
    }
  }

  // 2. Provjera OAuth2 tokena na disku
  const tokenPath = path.join(ytDlpCacheDir, 'youtube-oauth2.token.json');
  if (fs.existsSync(tokenPath)) {
    return { loggedIn: true, method: 'oauth2' };
  }

  // 3. Provjera browser cookiesa (ako su ulogovani na YT)
  if (cachedBrowser && cachedBrowser.has4K) {
    return { loggedIn: true, method: 'browser', browserName: cachedBrowser.browser };
  }

  return { loggedIn: false };
});

ipcMain.handle('download:login-oauth', async () => {
  if (oauthProcess) return false;

  return new Promise((resolve) => {
    let codeSent = false;
    const args = [
      '-v',
      '--username', 'oauth2',
      '--password', '',
      '--cache-dir', ytDlpCacheDir,
      'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
    ];

    oauthProcess = spawn(userYtDlpPath, args, getYtDlpSpawnOptions());

    const codePattern = /enter\s+(?:the\s+)?code[:\s]+([A-Z0-9]{4}-[A-Z0-9]{4})/i;
    const fallbackPattern = /code[:\s]+([A-Z0-9]{4}-[A-Z0-9]{4})/i;

    const handleData = (data) => {
      const text = data.toString();
      console.log(`[yt-dlp OAuth raw]: ${text}`); // Debug log

      if (codeSent) return;
      const match = text.match(codePattern) || text.match(fallbackPattern);
      if (match) {
        console.log(`[OAuth] FOUND CODE: ${match[1]}`);
        codeSent = true;
        mainWindow.webContents.send('oauth:code', match[1]);
      }
    };

    oauthProcess.stdout.on('data', handleData);
    oauthProcess.stderr.on('data', handleData);

    oauthProcess.on('close', (code) => {
      oauthProcess = null;
      resolve(code === 0);
    });

    oauthProcess.on('error', () => {
      oauthProcess = null;
      resolve(false);
    });
  });
});

ipcMain.handle('download:cancel-oauth', async () => {
  if (oauthProcess) {
    try {
      exec(`taskkill /pid ${oauthProcess.pid} /T /F`);
      oauthProcess = null;
      return true;
    } catch (e) {
      console.error('Failed to cancel OAuth:', e);
      return false;
    }
  }
  return false;
});

ipcMain.handle('download:logout-oauth', async () => {
  try {
    const tokenPath = path.join(ytDlpCacheDir, 'youtube-oauth2.token.json');
    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
    }
    const cookieFilePath = path.join(ytDlpCacheDir, 'youtube_cookies.txt');
    if (fs.existsSync(cookieFilePath)) {
      fs.unlinkSync(cookieFilePath);
    }

    // Očisti Electron persist:youtube sesiju
    const { session } = await import('electron');
    const ytSession = session.fromPartition('persist:youtube');
    await ytSession.clearStorageData();
    await ytSession.clearCache();

    // Resetujemo detekciju browsera
    cachedBrowser = null;
    return true;
  } catch (e) {
    console.error('Logout failed:', e);
    return false;
  }
});

ipcMain.handle('video:fetch-info', async (event, { url }) => {
  const buildArgs = (withCookies) => {
    const args = [
      '--dump-single-json',
      '--flat-playlist',
      '--force-ipv4',
      '--no-check-certificate'
    ];
    if (userDenoPath) args.push('--js-runtimes', 'deno');
    args.push('--cache-dir', ytDlpCacheDir);
    if (withCookies) {
      const cookieArgs = getCookieArgs();
      if (cookieArgs.length > 0) args.push(...cookieArgs);
    }
    return args;
  };

  const tryFetch = (args) => new Promise((resolve) => {
    let output = '';
    let errorOutput = '';
    console.log(`[video:fetch-info] cookieArgs: ${JSON.stringify(getCookieArgs())}`);
    const proc = spawn(userYtDlpPath, [...args, url], getYtDlpSpawnOptions());
    proc.stdout.on('data', d => output += d.toString());
    proc.stderr.on('data', d => {
      errorOutput += d.toString();
      console.log(`[video:fetch-info stderr]: ${d.toString().trim()}`);
    });
    proc.on('close', code => {
      if (code === 0 && output.trim()) resolve({ output, error: null });
      else resolve({ output: null, error: errorOutput });
    });
  });

  let { output, error } = await tryFetch(buildArgs(true));

  if (!output && error && (error.includes('Could not copy') || error.includes('cookie'))) {
    console.log('[video:fetch-info] Cookie fallback — pokušavam bez cookies');
    const result = await tryFetch(buildArgs(false));
    output = result.output;
    error = result.error;
  }

  if (!output) throw new Error(error || 'Nije moguće dohvatiti info o videu');

  const parsed = JSON.parse(output.trim());

  if (parsed._type === 'playlist' || parsed.entries) {
    throw new Error('Playlist nije podržana u Video tabu. Koristite Audio tab za bulk download.');
  }
  // DIJAGNOSTIKA: loguj SVE audio formate da vidimo šta yt-dlp kaže za acodec
  const audioFormats = (parsed.formats || [])
    .filter(f => f.acodec && f.acodec !== 'none')
    .map(f => `${f.format_id}:${f.acodec}(${f.ext})`)
    .join(', ');
  logToFile(`[video:fetch-info] Audio codecs: ${audioFormats}`);

  return {
    title: parsed.title,
    thumbnail: parsed.thumbnail,
    duration_string: parsed.duration_string,
    url: parsed.webpage_url || url,
    formats: (parsed.formats || [])
      .filter(f => f.height && f.height >= 360 && f.vcodec && f.vcodec !== 'none')
      .map(f => ({
        format_id: f.format_id,
        ext: f.ext,
        height: f.height,
        fps: f.fps,
        vcodec: f.vcodec,
        acodec: f.acodec || 'none',
        filesize: f.filesize || f.filesize_approx || null
      }))
      .sort((a, b) => b.height - a.height)
  };
});

ipcMain.handle('video:download', async (event, { id, url, formatId, hasAudio, savePath, title }) => {
  logToFile(`[video:download] === STARTING NEW DOWNLOAD ===`);
  logToFile(`[video:download] Title: ${title}`);
  logToFile(`[video:download] URL: ${url}`);
  logToFile(`[video:download] Format ID: ${formatId}, hasAudio: ${hasAudio}`);
  logToFile(`[video:download] Save path: ${savePath}`);
  logToFile(`[video:download] yt-dlp path: ${userYtDlpPath}`);
  logToFile(`[video:download] ffmpeg path: ${ffmpegPathResolved}`);
  logToFile(`[video:download] ffmpeg exists: ${fs.existsSync(ffmpegPathResolved)}`);

  videoDownloadAborted = false;

  // Ako format već ima audio, ne trebamo dodavati +bestaudio
  const formatStr = hasAudio ? formatId : `${formatId}+bestaudio/${formatId}/best`;
  logToFile(`[video:download] Format string: ${formatStr}`);

  const args = [
    '--newline', '--force-ipv4', '--no-mtime', '--windows-filenames',
    '--no-overwrites', '--no-check-certificate',
    '-f', formatStr,
    '-S', 'acodec:opus:aac',
    '--merge-output-format', 'mp4',
    '--ffmpeg-location', ffmpegPathResolved,
    // --ppa kao sigurnosna mreža za re-encoding audia ako ipak dođe nepoznat kodek
    '--ppa', 'Merger:-c:a aac -b:a 192k',
    '--ppa', 'ffmpeg:-c:v copy -c:a aac -b:a 192k',
    '--cache-dir', ytDlpCacheDir
  ];

  if (userDenoPath) args.push('--js-runtimes', 'deno');

  const cookieArgs = getCookieArgs();
  if (cookieArgs.length > 0) args.push(...cookieArgs);
  logToFile(`[video:download] Cookie args count: ${cookieArgs.length}`);

  const safeTitle = sanitizeFilename(title || 'video');
  args.push('-o', path.join(savePath, `temp_${safeTitle}-%(height)sp.%(ext)s`));
  args.push(url);

  logToFile(`[video:download] Full command: ${userYtDlpPath} ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(savePath)) {
      logToFile(`[video:download] Creating save directory: ${savePath}`);
      try { fs.mkdirSync(savePath, { recursive: true }); }
      catch (e) {
        logToFile(`[video:download] FAILED to create directory: ${e.message}`);
        return reject(new Error(`Folder ne može biti kreiran: ${savePath}`));
      }
    }

    currentVideoDownloadProcess = spawn(userYtDlpPath, args, getYtDlpSpawnOptions());
    currentVideoDownloadProcess._savePath = savePath;
    currentVideoDownloadProcess._safeTitle = safeTitle;
    logToFile(`[video:download] Process spawned, PID: ${currentVideoDownloadProcess.pid}`);

    currentVideoDownloadProcess.stdout.on('data', (data) => {
      if (videoDownloadAborted) return;
      const text = data.toString().trim();
      const match = text.match(/\[download\]\s+(\d+\.?\d*)%/);
      if (match) {
        mainWindow.webContents.send('video:progress', {
          id, progress: parseFloat(match[1]), status: 'downloading'
        });
      } else if (text.includes('[Merger]') || text.includes('[ExtractAudio]')) {
        logToFile(`[video:download] Stage: MERGING/CONVERTING`);
        mainWindow.webContents.send('video:progress', { id, status: 'converting' });
      } else if (text.includes('[download] Destination:')) {
        logToFile(`[video:download] ${text}`);
      }
    });

    let lastError = '';
    currentVideoDownloadProcess.stderr.on('data', d => {
      const line = d.toString();
      lastError += line;
      logToFile(`[video:download stderr] ${line.trim()}`);
    });

    currentVideoDownloadProcess.on('close', (code) => {
      logToFile(`[video:download] Process closed with code: ${code}`);
      currentVideoDownloadProcess = null;

      if (videoDownloadAborted) {
        logToFile(`[video:download] Download was manually aborted by user`);
        videoDownloadAborted = false;
        // Sačekamo 1000ms da se fajlovi oslobode pa čistimo
        setTimeout(() => cleanupTempFiles(savePath, safeTitle), 1000);
        resolve(false);
        return;
      }

      if (code === 0) {
        logToFile(`[video:download] SUCCESS — download completed`);
        // Pronađi skinuti temp fajl i preimenuj ga (skidamo temp_ prefiks i provjeravamo duplikate)
        try {
          const files = fs.readdirSync(savePath);
          const tempPrefix = `temp_${safeTitle}`;
          const downloadedFile = files.find(f => f.startsWith(tempPrefix) && !f.endsWith('.part') && !f.endsWith('.ytdl'));

          if (downloadedFile) {
            const actualExt = path.extname(downloadedFile).slice(1);
            // Uzimamo ime bez temp_ dijela kao osnovu za provjeru duplikata
            const videoBaseName = downloadedFile.replace('temp_', '').replace(`.${actualExt}`, '');

            const newPath = getUniqueFilePath(savePath, videoBaseName, actualExt);
            fs.renameSync(path.join(savePath, downloadedFile), newPath);
            logToFile(`[video:download] Saved with unique name: ${path.basename(newPath)}`);
          }
        } catch (e) {
          logToFile(`[video:download] Failed to rename final file: ${e.message}`);
        }

        mainWindow.webContents.send('video:progress', { id, progress: 100, status: 'completed' });
        resolve(true);
      } else {
        const isCookieError = lastError.includes('Could not copy') ||
          lastError.includes('does not look like a Netscape');
        const errorMsg = isCookieError ? 'AUTH_REQUIRED' : lastError.trim();

        logToFile(`[video:download] FAILED — Code ${code}`);
        logToFile(`[video:download] Error type: ${isCookieError ? 'COOKIE/AUTH' : 'GENERAL'}`);
        logToFile(`[video:download] Full error: ${lastError.trim()}`);
        mainWindow.webContents.send('video:progress', { id, status: 'error', errorMsg });
        setTimeout(() => cleanupTempFiles(savePath, safeTitle), 1000);
        reject(new Error(lastError.trim()));
      }
    });
  });
});

ipcMain.handle('video:stop-download', async () => {
  logToFile(`[video:stop-download] Stop requested`);
  if (currentVideoDownloadProcess) {
    videoDownloadAborted = true;
    const pid = currentVideoDownloadProcess.pid;
    const savePath = currentVideoDownloadProcess._savePath;
    logToFile(`[video:stop-download] Killing PID ${pid}, savePath: ${savePath}`);
    try {
      exec(`taskkill /pid ${pid} /T /F`);
      currentVideoDownloadProcess = null;
      // Čekamo 500ms da Windows otpusti file lockove pa čistimo .part fajlove
      if (savePath && fs.existsSync(savePath)) {
        setTimeout(() => cleanupTempFiles(savePath, currentVideoDownloadProcess?._safeTitle || ''), 1000);
      }
      logToFile(`[video:stop-download] Stop completed successfully`);
      return true;
    } catch (e) {
      logToFile(`[video:stop-download] FAILED: ${e.message}`);
      return false;
    }
  }
  logToFile(`[video:stop-download] No active process to stop`);
  return false;
});

ipcMain.handle('dialog:selectFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('app:readAudioFiles', async (event, folderPath) => {
  try {
    const files = await fs.promises.readdir(folderPath);
    const audioExts = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.wma'];
    const audioFiles = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return audioExts.includes(ext);
    });
    return audioFiles;
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

ipcMain.handle('app:renameFiles', async (event, folderPath, renameTasks) => {
  try {
    for (const task of renameTasks) {
      const oldPath = path.join(folderPath, task.oldName);
      const newPath = path.join(folderPath, task.newName);
      await fs.promises.rename(oldPath, newPath);
    }
    return true;
  } catch (error) {
    console.error('Error renaming files:', error);
    return false;
  }
});

ipcMain.handle('app:getUsbDrives', () => {
  return new Promise((resolve) => {
    // drivetype=2 znaci Removable disk (USB)
    exec('wmic logicaldisk where drivetype=2 get caption,freespace,size,volumename /format:csv', (error, stdout) => {
      if (error) {
        console.error('Error getting USB drives:', error);
        resolve([]);
        return;
      }
      const lines = stdout.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('Node'));
      const drives = lines.map(l => {
        const parts = l.split(',');
        if (parts.length >= 4) {
          const letter = parts[1];
          const freeSpace = parseInt(parts[2] || '0', 10);
          const totalSize = parseInt(parts[3] || '0', 10);
          const name = parts.slice(4).join(',') || 'USB Disk';
          return { letter, freeSpace, totalSize, name };
        }
        return null;
      }).filter(Boolean);
      resolve(drives);
    });
  });
});

ipcMain.handle('app:copyToUsb', async (event, sourceFolder, destFolder) => {
  try {
    const rawFiles = await fs.promises.readdir(sourceFolder);
    const audioExts = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.wma'];
    const files = rawFiles.filter(f => audioExts.includes(path.extname(f).toLowerCase()));
    files.sort((a, b) => a.localeCompare(b));

    let copied = 0;
    for (const file of files) {
      const srcPath = path.join(sourceFolder, file);
      const destPath = path.join(destFolder, file);

      // Kopiramo jedan po jedan fajl
      await fs.promises.copyFile(srcPath, destPath);
      copied++;

      // Saljemo progres nazad aplikaciji
      if (mainWindow) {
        mainWindow.webContents.send('copy:progress', {
          total: files.length,
          current: copied,
          currentFile: file
        });
      }
    }
    return true;
  } catch (error) {
    console.error('Error copying files:', error);
    return false;
  }
});

ipcMain.handle('app:getFilesSize', async (event, folderPath, files) => {
  try {
    let totalSize = 0;
    for (const file of files) {
      const stat = await fs.promises.stat(path.join(folderPath, file));
      totalSize += stat.size;
    }
    return totalSize;
  } catch (error) {
    console.error('Error calculating size:', error);
    return 0;
  }
});

ipcMain.handle('app:getFreeSpace', async (event, folderPath) => {
  try {
    const stat = await fs.promises.statfs(folderPath);
    return {
      freeSpace: stat.bfree * stat.bsize,
      totalSize: stat.blocks * stat.bsize
    };
  } catch (error) {
    console.error('Error calculating free space:', error);
    return { freeSpace: Number.MAX_SAFE_INTEGER, totalSize: Number.MAX_SAFE_INTEGER };
  }
});

ipcMain.handle('app:formatUsb', async (event, driveLetter, label = '') => {
  return new Promise((resolve) => {
    // driveLetter dolazi kao "E:" ili "E:\", trebamo samo "E"
    const letter = driveLetter.replace(/[^a-zA-Z]/g, '');

    // Čistimo naziv od razmaka i specijalnih znakova
    let cleanLabel = '';
    if (label) {
      cleanLabel = label.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 11).toUpperCase();
    }

    // Koristimo striktni cmd.exe umjesto PowerShell-a jer PowerShell ponekad ignoriše /V argument
    const labelCmd = cleanLabel ? `&& label ${letter}: ${cleanLabel}` : '';
    const cmd = `cmd /c "echo. | format ${letter}: /Q /X /y ${labelCmd}"`;

    exec(cmd, (error) => {
      if (error) {
        console.error('Error formatting USB:', error);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
});

ipcMain.handle('dialog:openTxtFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Text Files', extensions: ['txt'] }]
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  const content = fs.readFileSync(filePaths[0], 'utf-8');
  return content.split('\n').map(line => line.trim()).filter(line => line.length > 0 && line.startsWith('http'));
});

ipcMain.handle('download:fetch-info', async (event, { url }) => {
  if (cachedBrowser === null) await detectBestBrowser();

  const args = ['--dump-json', '--flat-playlist', '--force-ipv4', '--no-check-certificate'];
  if (userDenoPath) args.push('--js-runtimes', 'deno');

  const cookieArgs = getCookieArgs();
  if (cookieArgs.length > 0) args.push(...cookieArgs);

  args.push(url);

  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';
    const process = spawn(userYtDlpPath, args, getYtDlpSpawnOptions());
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    process.on('close', (code) => {
      if (code === 0) {
        try {
          const lines = output.trim().split('\n').filter(l => l);
          const items = lines.map(line => {
            const parsed = JSON.parse(line);
            return {
              title: parsed.title || parsed.id,
              url: parsed.url || `https://www.youtube.com/watch?v=${parsed.id}`
            };
          });
          resolve(items);
        } catch (e) {
          reject(e);
        }
      } else {
        console.error(`[yt-dlp fetch-info error]: ${errorOutput}`);
        reject(new Error('Failed to fetch info: ' + errorOutput.trim()));
      }
    });
  });
});


ipcMain.handle('download:start', async (event, { id, url, formatType, formatExt, savePath, normalizeVolume, quality, title }) => {
  if (cachedBrowser === null) await detectBestBrowser();

  let args = ['--newline', '--force-ipv4', '--windows-filenames', '--no-mtime', '--no-check-certificate'];
  if (userDenoPath) args.push('--js-runtimes', 'deno');

  const cookieArgs = getCookieArgs();
  if (cookieArgs.length > 0) args.push(...cookieArgs);

  if (formatType === 'audio') {
    let bitrate = '0';
    if (quality && quality.includes('kbps')) {
      bitrate = quality.split(' ')[0] + 'K';
    }
    args.push('-x', '--audio-format', formatExt.toLowerCase(), '--audio-quality', bitrate);
  } else {
    const targetRes = parseTargetRes(quality);


    // Force player clients that are known to provide 4K/high-res without login
    // Prioritize 'tv' for maximum compatibility with high-res
    args.push('--extractor-args', 'youtube:player_client=tv,android,web,ios,mweb');

    const fmt = formatExt.toLowerCase();

    if (fmt === 'webm') {
      args.push('-S', `res:${targetRes},vcodec:vp9,acodec:opus`);
      args.push('--merge-output-format', 'webm');
    } else if (fmt === 'mp4') {
      args.push('-S', `res:${targetRes},vcodec:h264`);
      args.push('--merge-output-format', 'mp4');
    } else if (fmt === 'mkv') {
      args.push('-S', `res:${targetRes}`);
      args.push('--merge-output-format', 'mkv');
    } else if (fmt === 'avi') {
      // AVI usually needs divx/xvid or similar, but for yt-dlp we'll grab best and let ffmpeg convert
      args.push('-S', `res:${targetRes},vcodec:h264`);
      args.push('--merge-output-format', 'avi');
    } else if (fmt === 'mov') {
      args.push('-S', `res:${targetRes},vcodec:h264`);
      args.push('--merge-output-format', 'mov');
    }
  }

  args.push('--ffmpeg-location', ffmpegPathResolved);

  if (formatType === 'audio' && normalizeVolume) {
    args.push('--postprocessor-args', 'ffmpeg:-af loudnorm=I=-14:TP=-1.5:LRA=11');
  } else if (formatType === 'video') {
    const fmt = formatExt.toLowerCase();
    if (fmt === 'avi') {
      // AVI doesn't support VP9/AV1 — must transcode video to h264 + AAC audio
      args.push('--postprocessor-args', 'ffmpeg:-c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k');
    } else if (fmt === 'mp4' || fmt === 'mov') {
      // Copy video stream, convert audio to AAC for universal player compatibility
      args.push('--postprocessor-args', 'ffmpeg:-c:v copy -c:a aac -b:a 192k');
    }
  }

  const safeTitle = sanitizeFilename(title || 'video');

  // Output template — probe and rename happens after download for video
  args.push('-o', path.join(savePath, `temp_${safeTitle}.%(ext)s`));
  args.push(url);

  return new Promise((resolve, reject) => {
    // Final safety: Ensure savePath exists inside the promise
    if (!fs.existsSync(savePath)) {
      try {
        fs.mkdirSync(savePath, { recursive: true });
      } catch (e) {
        return reject(new Error(`Folder does not exist and cannot be created: ${savePath}`));
      }
    }

    console.log(`Executing yt-dlp with args:`, args);
    const process = spawn(userYtDlpPath, args, getYtDlpSpawnOptions());
    process._savePath = savePath;
    process._safeTitle = safeTitle;
    activeAudioProcesses.set(id, process);

    process.stdout.on('data', (data) => {
      const text = data.toString();
      const progressMatch = text.match(/\[download\]\s+(\d+\.\d+)%/);
      if (progressMatch) {
        mainWindow.webContents.send('download:progress', {
          id,
          progress: parseFloat(progressMatch[1]),
          status: 'downloading'
        });
      } else if (text.includes('[ExtractAudio]') || text.includes('[Merger]')) {
        mainWindow.webContents.send('download:progress', {
          id,
          status: 'converting'
        });
      } else if (text.includes('[download] Destination:')) {
        // Optionally extract title
      }
    });

    let lastError = '';
    process.stderr.on('data', (data) => {
      lastError += data.toString();
      console.error(`[yt-dlp stderr]: ${data.toString()}`);
    });

    process.on('close', (code) => {
      const wasKilled = killedAudioProcesses.has(id);
      killedAudioProcesses.delete(id);
      activeAudioProcesses.delete(id);

      if (code === 0 || wasKilled) {
        if (wasKilled) {
          logToFile(`[download:start] Process ${id} was killed manually.`);
          return resolve(true);
        }
        if (formatType === 'video') {
          // Find the downloaded video file — yt-dlp may use a different extension than requested
          const videoExts = [formatExt.toLowerCase(), 'mp4', 'mkv', 'webm', 'avi', 'mov'];
          let downloadedFile = null;
          for (const ext of videoExts) {
            const candidate = path.join(savePath, `${safeTitle}-${targetRes}.${ext}`);
            if (fs.existsSync(candidate)) {
              downloadedFile = candidate;
              break;
            }
          }

          if (downloadedFile) {
            // Use ffmpeg -i to probe actual resolution (outputs to stderr)
            const probe = spawn(ffmpegPathResolved, ['-i', downloadedFile], { windowsHide: true });
            let probeOutput = '';
            probe.stderr.on('data', (d) => probeOutput += d.toString());
            probe.on('close', () => {
              const resMatch = probeOutput.match(/Stream.*Video.*\s(\d{2,5})x(\d{2,5})/);

              // Pronađi trenutni temp fajl (koji može imati rezoluciju u imenu ako ga je yt-dlp dodao)
              // U Video tabu, yt-dlp obično doda rezoluciju ako smo koristili %(height)sp u templatu
              // Ali u Audio tabu (ovaj handler je shared!) on je samo temp_Title.ext

              const files = fs.readdirSync(savePath);
              const tempPrefix = `temp_${safeTitle}`;
              const downloadedFile = files.find(f => f.startsWith(tempPrefix) && !f.endsWith('.part') && !f.endsWith('.ytdl'));

              if (downloadedFile) {
                const fullDownloadedPath = path.join(savePath, downloadedFile);
                if (resMatch) {
                  const w = parseInt(resMatch[1]);
                  const h = parseInt(resMatch[2]);
                  const minDim = Math.min(w, h);
                  let resLabel;
                  if (minDim <= 144) resLabel = '144p';
                  else if (minDim <= 240) resLabel = '240p';
                  else if (minDim <= 360) resLabel = '360p';
                  else if (minDim <= 480) resLabel = '480p';
                  else if (minDim <= 720) resLabel = '720p';
                  else if (minDim <= 1080) resLabel = '1080p';
                  else if (minDim <= 1440) resLabel = '1440p';
                  else resLabel = '2160p';
                  const finalExt = path.extname(downloadedFile).slice(1);
                  const videoBaseName = `${safeTitle}-${resLabel}`;
                  const newPath = getUniqueFilePath(savePath, videoBaseName, finalExt);
                  try {
                    fs.renameSync(fullDownloadedPath, newPath);
                  } catch (e) {
                    logToFile(`[download:start rename error]: ${e.message}`);
                  }
                } else {
                  // Ako probe ne uspije, samo makni temp_ i provjeri duplikate
                  const actualExt = path.extname(downloadedFile).slice(1);
                  const baseName = downloadedFile.replace('temp_', '').replace(`.${actualExt}`, '');
                  const newPath = getUniqueFilePath(savePath, baseName, actualExt);
                  try { fs.renameSync(fullDownloadedPath, newPath); } catch (e) { }
                }
              }
              mainWindow.webContents.send('download:progress', { id, progress: 100, status: 'completed' });
              resolve(true);
            });
          } else {
            logToFile(`[download:start error]: Downloaded file not found (tried to probe ${safeTitle})`);
            mainWindow.webContents.send('download:progress', { id, progress: 100, status: 'completed' });
            resolve(true);
          }
        } else {
          // Audio — no renaming needed beyond removing temp_ and checking duplicates
          try {
            const files = fs.readdirSync(savePath);
            const tempPrefix = `temp_${safeTitle}`;
            const downloadedFile = files.find(f => f.startsWith(tempPrefix) && !f.endsWith('.part') && !f.endsWith('.ytdl'));
            if (downloadedFile) {
              const actualExt = path.extname(downloadedFile).slice(1);
              const newPath = getUniqueFilePath(savePath, safeTitle, actualExt);
              fs.renameSync(path.join(savePath, downloadedFile), newPath);
            }
          } catch (e) { }

          mainWindow.webContents.send('download:progress', { id, progress: 100, status: 'completed' });
          resolve(true);
        }
      } else {
        const isCookieError = lastError.includes('Could not copy') ||
          lastError.includes('does not look like a Netscape');
        const errorMsg = isCookieError ? 'AUTH_REQUIRED' : lastError.trim();

        logToFile(`[download:start error] Code ${code}: ${lastError.trim()}`);
        mainWindow.webContents.send('download:progress', { id, status: 'error', errorMsg });
        setTimeout(() => cleanupTempFiles(savePath, safeTitle), 1000);
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
});

ipcMain.handle('download:stop', async () => {
  if (activeAudioProcesses.size > 0) {
    try {
      for (const [id, process] of activeAudioProcesses) {
        killedAudioProcesses.add(id);
        const savePath = process._savePath;
        const safeTitle = process._safeTitle;
        exec(`taskkill /pid ${process.pid} /T /F`);
        if (savePath && safeTitle) {
          setTimeout(() => cleanupTempFiles(savePath, safeTitle), 1000);
        }
      }
      activeAudioProcesses.clear();
      return true;
    } catch (e) {
      console.error('Failed to stop download processes:', e);
      return false;
    }
  }
  return false;
});
