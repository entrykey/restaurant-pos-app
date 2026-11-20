/**
 * Utilities for downloading and installing the FilePe LAN Print Bridge
 * on the counter PC / Windows laptop.
 */

/**
 * Trigger dynamic browser download of a generated text or binary file
 */
export function triggerBrowserDownload(filename, content, mimeType = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 200);
}

/**
 * Fetch the full pos-print-bridge.js script from public folder (or fallback to bundle)
 */
export async function getBridgeScriptContent(params = {}) {
    const {
        shopId = '',
        branchId = '',
        cloudUrl = 'https://api.filepeapp.com/api',
    } = params;

    let baseScript = '';
    try {
        const res = await fetch('/pos-print-bridge.js');
        if (res.ok) {
            baseScript = await res.text();
        }
    } catch (e) {
        // Fallback handled below
    }

    if (!baseScript || baseScript.length < 500) {
        // Standalone lightweight fallback template
        baseScript = getEmbeddedBridgeFallback();
    }

    // Pre-inject active shop ID, branch ID, and cloud URL
    if (shopId) {
        baseScript = baseScript.replace(
            /shopId:\s*getArg\([^)]+\)/g,
            `shopId: getArg('--shop', process.env.BRIDGE_SHOP_ID || savedConfig.shopId || '${shopId}')`
        );
    }
    if (branchId) {
        baseScript = baseScript.replace(
            /branchId:\s*getArg\([^)]+\)/g,
            `branchId: getArg('--branch', process.env.BRIDGE_BRANCH_ID || savedConfig.branchId || '${branchId}')`
        );
    }
    if (cloudUrl) {
        baseScript = baseScript.replace(
            /cloudUrl:\s*normalizeCloudUrl\([^)]+\)/g,
            `cloudUrl: normalizeCloudUrl(getArg('--cloud', process.env.BRIDGE_CLOUD_URL || savedConfig.cloudUrl || '${cloudUrl}'))`
        );
    }

    return baseScript;
}

/**
 * Generate 1-Click Windows Batch Auto-Installer (.bat)
 */
export async function generateWindowsBatInstaller(params = {}) {
    const {
        shopId = '',
        branchId = '',
        cloudUrl = 'https://api.filepeapp.com/api',
        printerIp = '192.168.1.100',
        printerPort = 9100,
    } = params;

    const bridgeCode = await getBridgeScriptContent(params);
    // Encode the entire script as base64 so the .bat file is 100% self-contained
    const base64Code = typeof window !== 'undefined' && window.btoa
        ? window.btoa(unescape(encodeURIComponent(bridgeCode)))
        : Buffer.from(bridgeCode, 'utf8').toString('base64');

    return `@echo off
setlocal EnableDelayedExpansion
title FilePe LAN Print Bridge Auto-Installer
color 0B

echo ================================================================
echo           FILEPE LAN THERMAL PRINT BRIDGE INSTALLER
echo ================================================================
echo.
echo Target Restaurant Shop ID : ${shopId || 'Auto-Detected'}
echo Target Branch ID          : ${branchId || 'Default'}
echo Cloud API URL             : ${cloudUrl}
echo Default Printer IP        : ${printerIp}:${printerPort}
echo.

:: 1. Verify Node.js runtime
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on your counter PC.
    echo Node.js is required to relay print jobs to your LAN thermal printers.
    echo.
    echo Opening https://nodejs.org in your browser to download Node.js (LTS)...
    start https://nodejs.org
    echo.
    echo Once Node.js installation is complete, run this installer file again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [OK] Node.js runtime detected: !NODE_VER!

:: 2. Target Directory
set "INSTALL_DIR=%USERPROFILE%\\FilepePrintBridge"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
cd /d "%INSTALL_DIR%"

echo [1/4] Writing configuration file...
(
echo {
echo   "cloudUrl": "${cloudUrl}",
echo   "shopId": "${shopId}",
echo   "branchId": "${branchId}",
echo   "pollIntervalMs": 1000
echo }
) > "%INSTALL_DIR%\\.bridge-config.json"

echo [2/4] Deploying bridge script into %INSTALL_DIR%...
powershell -NoProfile -Command "$b64 = '${base64Code}'; $bytes = [System.Convert]::FromBase64String($b64); $text = [System.Text.Encoding]::UTF8.GetString($bytes); [System.IO.File]::WriteAllText('%INSTALL_DIR%\\pos-print-bridge.js', $text, [System.Text.Encoding]::UTF8)"

echo [3/4] Creating background launcher and Windows Startup service...
:: Create silent launcher (runs completely hidden without terminal popup)
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "node """ ^& "%INSTALL_DIR%\\pos-print-bridge.js""" ^& " --shop ${shopId} --branch ${branchId} --cloud ${cloudUrl}", 0, False
) > "%INSTALL_DIR%\\run-silent.vbs"

:: Create visible console launcher for manual testing and checking logs
(
echo @echo off
echo title FilePe LAN Print Bridge (Live Console^)
echo color 0A
echo ========================================================
echo   FilePe Print Bridge Live Console (Close to stop^)
echo ========================================================
echo.
echo node "%INSTALL_DIR%\\pos-print-bridge.js" --shop ${shopId} --branch ${branchId} --cloud ${cloudUrl}
echo pause
) > "%INSTALL_DIR%\\View-Live-Logs.bat"

:: Create stop helper
(
echo @echo off
echo Stopping FilePe Print Bridge...
for /f "tokens=5" %%%%p in ('netstat -ano ^^! findstr :3001'^) do taskkill /F /PID %%%%p 2^>nul
echo Bridge stopped.
echo pause
) > "%INSTALL_DIR%\\Stop-Bridge.bat"

:: Register into Windows Startup Folder so it runs automatically every time PC turns on
set "STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
if exist "%STARTUP_FOLDER%" (
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_FOLDER%\\FilePePrintBridge.lnk'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '""%INSTALL_DIR%\\run-silent.vbs""'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Save()" 2>nul
    echo [OK] Auto-start on Windows boot registered.
)

:: Create Desktop shortcut for View-Live-Logs
set "DESKTOP_FOLDER=%USERPROFILE%\\Desktop"
if exist "%DESKTOP_FOLDER%" (
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP_FOLDER%\\FilePe Print Bridge Logs.lnk'); $s.TargetPath = '%INSTALL_DIR%\\View-Live-Logs.bat'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Save()" 2>nul
)

echo [4/4] Starting FilePe Print Bridge now...
:: Terminate any existing instance on port 3001 to prevent collisions
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3001') do taskkill /F /PID %%p >nul 2>nul
timeout /t 1 /nobreak >nul

:: Launch hidden background process
wscript "%INSTALL_DIR%\\run-silent.vbs"
timeout /t 2 /nobreak >nul

:: Test health check
powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/health' -TimeoutSec 2; if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo   [SUCCESS] FILEPE PRINT BRIDGE IS NOW RUNNING IN BACKGROUND!
    echo ================================================================
    echo.
    echo - Background daemon is active on port 3001.
    echo - It will auto-start every time Windows turns on.
    echo - Switch back to your browser: Status should show "ACTIVE (ONLINE)"!
    echo.
) else (
    echo.
    echo [INFO] Bridge started. Return to your POS browser to verify.
    echo If needed, double-click "FilePe Print Bridge Logs" on your Desktop.
    echo.
)

pause
`;
}

/**
 * Fallback bridge implementation if network fetch is unavailable
 */
function getEmbeddedBridgeFallback() {
    return `const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const CONFIG_FILE = path.join(__dirname, '.bridge-config.json');

const args = process.argv.slice(2);
function getArg(flag, fallback = '') {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1]) return args[idx + 1];
    return fallback;
}

let savedConfig = {};
try {
    if (fs.existsSync(CONFIG_FILE)) savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
} catch (e) {}

let activeConfig = {
    cloudUrl: getArg('--cloud', process.env.BRIDGE_CLOUD_URL || savedConfig.cloudUrl || 'https://api.filepeapp.com/api'),
    shopId: getArg('--shop', process.env.BRIDGE_SHOP_ID || savedConfig.shopId || ''),
    branchId: getArg('--branch', process.env.BRIDGE_BRANCH_ID || savedConfig.branchId || ''),
    pollIntervalMs: parseInt(getArg('--interval', process.env.BRIDGE_POLL_INTERVAL || savedConfig.pollIntervalMs || 1000), 10),
};

function sendToNetworkPrinter(ip, port = 9100, buffer, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
        if (!ip) return reject(new Error('Printer IP address is required'));
        const client = new net.Socket();
        let isDone = false;
        client.setTimeout(timeoutMs);
        client.on('timeout', () => { if (!isDone) { isDone = true; client.destroy(); reject(new Error('Printer timed out')); } });
        client.connect(port, ip, () => {
            client.write(buffer, (err) => {
                if (err) { if (!isDone) { isDone = true; client.destroy(); reject(err); } return; }
                setTimeout(() => { if (!isDone) { isDone = true; client.destroy(); resolve({ success: true, ip, port }); } }, 300);
            });
        });
        client.on('error', (err) => { if (!isDone) { isDone = true; client.destroy(); reject(err); } });
    });
}

function buildEscPosKot(job) {
    const buffers = [];
    const cols = Number(job.paperWidthMm || 80) === 58 ? 32 : 48;
    const divider = '-'.repeat(cols) + '\\n';
    buffers.push(Buffer.from([0x1B, 0x40])); // init
    if (job.beepBuzzer !== false) buffers.push(Buffer.from([0x1B, 0x42, 0x02, 0x02]));
    buffers.push(Buffer.from([0x1B, 0x61, 0x01, 0x1D, 0x21, 0x11]));
    buffers.push(Buffer.from(\`\${job.kotTitle || job.title || 'KITCHEN ORDER (KOT)'}\\n\`));
    buffers.push(Buffer.from([0x1D, 0x21, 0x00, 0x1B, 0x61, 0x00]));
    buffers.push(Buffer.from(divider));
    const items = job.items || [];
    items.forEach(it => {
        const qty = String(it.quantity || it.qty || 1).padStart(3);
        const name = String(it.name || it.itemName || 'Item');
        buffers.push(Buffer.from(\`\${qty}  \${name}\\n\`));
    });
    buffers.push(Buffer.from(divider));
    buffers.push(Buffer.from([0x1B, 0x61, 0x01]));
    buffers.push(Buffer.from('*** END OF KOT ***\\n\\n\\n\\n\\n'));
    if (job.autoCut !== false) buffers.push(Buffer.from([0x1D, 0x56, 0x00]));
    return Buffer.concat(buffers);
}

function makeRequest(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const transport = parsed.protocol === 'https:' ? https : http;
        const req = transport.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }); } catch (e) { resolve({ status: res.statusCode, data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

async function pollCloudPrintQueue() {
    if (!activeConfig.shopId) return;
    try {
        const baseUrl = activeConfig.cloudUrl.replace(/\\/+$/, '');
        const pollUrl = \`\${baseUrl}/print/bridge/poll?shopId=\${activeConfig.shopId}\`;
        const res = await makeRequest(pollUrl, {
            method: 'GET',
            headers: { 'x-shop-id': activeConfig.shopId, 'x-branch-id': activeConfig.branchId || '' }
        });
        if (res.status === 200 && Array.isArray(res.data?.jobs)) {
            for (const job of res.data.jobs) {
                const ip = job.printerIp || '192.168.1.100';
                const port = parseInt(job.printerPort || 9100, 10);
                const buffer = buildEscPosKot(job);
                await sendToNetworkPrinter(ip, port, buffer);
                await makeRequest(\`\${baseUrl}/print/jobs/\${job._id}/complete\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-shop-id': activeConfig.shopId }
                }, { status: 'COMPLETED' });
            }
        }
    } catch (e) {}
}

setInterval(pollCloudPrintQueue, activeConfig.pollIntervalMs);

http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', online: true }));
    } else {
        res.writeHead(404);
        res.end();
    }
}).listen(PORT, '127.0.0.1', () => {
    console.log(\`FilePe Print Station running on port \${PORT} for shop \${activeConfig.shopId}\`);
});`;
}
