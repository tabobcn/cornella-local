// node render.cjs stills 0,4,280,470,530   (fotogramas)
// node render.cjs video salida.mp4         (vídeo mudo + sched.json para el sonido)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');
const ROOT = __dirname;
(async () => {
  const [mode, arg] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('[pageerror]', e.message));
  await p.route('http://stage.local/**', r => r.fulfill({ path: path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname)) }));
  await p.goto('http://stage.local/stage.html'); await p.waitForFunction('window.ready === true');
  await p.evaluate(() => window.load());
  const sched = await p.evaluate(() => window.SCHED);
  fs.writeFileSync(path.join(ROOT, 'sched.json'), JSON.stringify(sched));
  if (mode === 'stills') {
    fs.mkdirSync(path.join(ROOT, 'stills'), { recursive: true });
    for (const s of arg.split(',')) { const fr = +s; await p.evaluate(fr => window.draw(fr), fr); await p.screenshot({ path: path.join(ROOT, 'stills', `f${String(fr).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 90 }); }
  } else {
    const out = arg, tmp = out.replace(/\.mp4$/, '.tmp.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let fr = 0; fr < 570; fr++) {
      await p.evaluate(fr => window.draw(fr), fr);
      const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); const code = await new Promise(r => ff.on('close', r));
    if (code !== 0) { console.error('ffmpeg', code); process.exit(1); }
    fs.renameSync(tmp, out); console.log('ok', out);
  }
  await b.close();
})();
