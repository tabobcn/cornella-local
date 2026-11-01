// node render.cjs stills 1.5,4.6,... | node render.cjs video mudo.mp4
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');
const ROOT = __dirname, FPS = 30;
(async () => {
  const [mode, arg] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('[pageerror]', e.message));
  await p.route('http://stage.local/**', r => r.fulfill({ path: path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname)) }));
  await p.goto('http://stage.local/stage.html'); await p.waitForFunction('window.ready === true');
  await p.evaluate(() => window.load());
  fs.writeFileSync(path.join(ROOT, 'times.json'), JSON.stringify(await p.evaluate(() => window.TIMES)));
  const total = await p.evaluate(() => window.TIMES.TOTAL);
  if (mode === 'stills') {
    fs.mkdirSync(path.join(ROOT, 'stills'), { recursive: true });
    for (const s of arg.split(',')) { const t = +s; await p.evaluate(t => window.draw(t), t); await p.screenshot({ path: path.join(ROOT, 'stills', `t${t.toFixed(2).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 }); }
  } else {
    const out = arg, tmp = out.replace(/\.mp4$/, '.tmp.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', 'noise=alls=3:allf=t,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(total * FPS);
    for (let f = 0; f < n; f++) {
      await p.evaluate(t => window.draw(t), f / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); const code = await new Promise(r => ff.on('close', r));
    if (code !== 0) { console.error('ffmpeg', code); process.exit(1); }
    fs.renameSync(tmp, out); console.log('ok', out);
  }
  await b.close();
})();
