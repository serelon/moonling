// Minimal headless-Chromium driver for visual checks.
// usage: node dev/cdp.mjs <script.mjs>   (script default-exports async ({page}) => {})
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const envFile = new URL('./.chrome-env', import.meta.url);
const CHROME = process.env.CHROME || (existsSync(envFile) && readFileSync(envFile, 'utf8').match(/CHROME=(\S+)/)?.[1]) || 'chromium';
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-'))}`, '--window-size=900,1000', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const logs = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled') logs.push(`[${m.params.type}] ` + m.params.args.map(a => a.value ?? a.description).join(' '));
  if (m.method === 'Runtime.exceptionThrown') logs.push('[EXCEPTION] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Log.entryAdded') logs.push(`[${m.params.entry.level}] ${m.params.entry.text} ${m.params.entry.url || ''}`);
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, m => m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');

const page = {
  send, sleep, logs,
  async size(w, h, dpr = 1) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: false }); },
  async goto(url, wait = 1500) { await send('Page.navigate', { url }); await sleep(wait); },
  async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; },
  async shot(path, clip) { const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }); writeFileSync(path, Buffer.from(r.data, 'base64')); console.log('saved', path); },
  async click(x, y) { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); },
  async move(x, y) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); },
  async key(key, code = key, type = 'both') { if (type !== 'up') await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: { ArrowLeft: 37, ArrowRight: 39, ' ': 32, ArrowUp: 38 }[key] || key.toUpperCase().charCodeAt(0) }); if (type !== 'down') await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code }); },
  async type(text) { await send('Input.insertText', { text }); },
};

try {
  const mod = await import(resolve(process.argv[2]));
  await mod.default({ page });
} catch (e) { console.error('SCRIPT ERROR', e); }
finally {
  const bad = logs.filter(l => /error|EXCEPTION|warn/i.test(l));
  console.log(`--- console (${logs.length} msgs, ${bad.length} errors/warnings)`); for (const l of logs.slice(-40)) console.log(l);
  ws.close(); proc.kill();
  process.exit(0);
}
