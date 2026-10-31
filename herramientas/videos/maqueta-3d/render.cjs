// node render.cjs stills 1.5,7,12 [salida/]
// node render.cjs range <desde_s> <hasta_s> <salida.mp4>
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');
const ROOT = __dirname, FPS = 30;

async function open() {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.route('http://stage.local/**', r => {
    const p = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
    const ct = p.endsWith('.js') ? 'text/javascript' : undefined;
    r.fulfill({ path: p, contentType: ct });
  });
  await page.goto('http://stage.local/stage.html');
  await page.waitForFunction('window.ready === true', null, { timeout: 180000 });
  return { browser, page };
}

(async () => {
  const [mode, a, b, c] = process.argv.slice(2);
  const { browser, page } = await open();
  if (mode === 'stills') {
    const out = b || path.join(ROOT, 'stills'); fs.mkdirSync(out, { recursive: true });
    for (const ts of a.split(',')) {
      const t = parseFloat(ts), t0 = Date.now();
      await page.evaluate(t => window.draw(t), t);
      await page.screenshot({ path: path.join(out, `t${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 92 });
      console.log('still', t, Date.now() - t0, 'ms');
    }
  } else if (mode === 'range') {
    const f0 = Math.round(parseFloat(a) * FPS), f1 = Math.round(parseFloat(b) * FPS);
    const outFile = c, tmp = outFile.replace(/\.mp4$/, '.tmp.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-vf', 'noise=alls=4:allf=t,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p',
      '-r', String(FPS), '-movflags', '+faststart', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    const tStart = Date.now();
    for (let f = f0; f < f1; f++) {
      await page.evaluate(t => window.draw(t), f / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - f0) % 30 === 0) console.log(path.basename(outFile), f - f0, '/', f1 - f0, ((Date.now() - tStart) / (f - f0 + 1)).toFixed(0), 'ms/frame');
    }
    ff.stdin.end();
    const code = await new Promise(r => ff.on('close', r));
    if (code !== 0) { console.error('ffmpeg falló', code); process.exit(1); }
    fs.renameSync(tmp, outFile);
    console.log('ok', outFile, ((Date.now() - tStart) / 1000).toFixed(1), 's');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
