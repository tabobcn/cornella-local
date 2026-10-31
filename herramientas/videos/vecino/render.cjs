// Pinta el vídeo: cada escena se codifica en su propio .mp4 (fotogramas JPEG por tubería a ffmpeg)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const FPS = 30;
const SCENES_FILE = path.resolve(process.argv[2]);
const SCENES = require(SCENES_FILE);
const NAME = path.basename(SCENES_FILE).replace(/\.c?js$/, '');
const META = Object.fromEntries(fs.readdirSync(path.join(DIR, 'shots')).filter(f => f.endsWith('.json')).map(f => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(DIR, 'shots', f), 'utf8'))]));
const mode = process.argv[3] || 'frames'; // frames = fotogramas de prueba; video = render completo
const only = process.argv[4] ? process.argv[4].split(',') : null;

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.addInitScript(([m, s]) => { window.__META = m; window.__SCENES = s; }, [META, SCENES]);
  await page.goto('file://' + path.join(DIR, 'stage.html'));
  await page.evaluate(() => document.fonts.ready);
  const srcs = ['../../../public/logo.png', ...new Set(SCENES.filter(s => s.shot).flatMap(s => [`shots/${s.shot}.jpg`, `shots/${s.shot}-full.jpg`]))];
  await page.evaluate((s) => window.preload(s), srcs);

  const starts = []; let acc = 0; for (const sc of SCENES) { starts.push(acc); acc += Math.round(sc.dur * FPS) / FPS; }
  const ev = [];
  SCENES.forEach((sc, i) => {
    const s0 = starts[i];
    if (i > 0) ev.push({ type: 'whoosh', t: s0 });
    (sc.taps || []).forEach(tp => ev.push({ type: 'tap', t: s0 + tp.t }));
    (sc.bubbles || []).forEach(b => ev.push({ type: 'pop', t: s0 + b.t0 }));
    (sc.tags || []).forEach(b => ev.push({ type: 'pop', t: s0 + b.t0 }));
    (sc.highlights || []).forEach(b => ev.push({ type: 'pop', t: s0 + b.t0 }));
    (sc.chips || []).forEach(b => ev.push({ type: 'pop', t: s0 + b.t0 }));
    if (sc.success) ev.push({ type: 'success', t: s0 + sc.success.t });
    if (sc.confetti) ev.push({ type: 'confetti', t: s0 + sc.confetti.t });
  });
  fs.writeFileSync(path.join(DIR, `timeline-${NAME}.json`), JSON.stringify({ total: acc, starts, events: ev }, null, 1));
  if (mode === 'frames') {
    // momentos con más cosas en pantalla
    const picks = process.argv[5] ? JSON.parse(process.argv[5]) : [[0, 0.0], [2, 2.9], [4, 3.0], [6, 2.0], [7, 4.2], [8, 3.0], [10, 1.6], [12, 3.0], [4, 0.2]];
    fs.mkdirSync(path.join(DIR, 'frames', NAME), { recursive: true });
    for (const [i, t] of picks) {
      await page.evaluate(([i, t, T]) => window.draw(i, t, T), [i, t, starts[i] + t]);
      await page.screenshot({ path: path.join(DIR, 'frames', NAME, `f-${i}-${t}.jpg`), type: 'jpeg', quality: 90 });
    }
    console.log('fotogramas listos');
  } else {
    fs.mkdirSync(path.join(DIR, 'parts', NAME), { recursive: true });
    for (let i = 0; i < SCENES.length; i++) {
      const sc = SCENES[i];
      if (only && !only.includes(sc.id)) continue;
      const n = Math.round(sc.dur * FPS);
      const tmp = path.join(DIR, 'parts', NAME, `${String(i).padStart(2, '0')}-${sc.id}.tmp.mp4`);
      const fin = tmp.replace('.tmp.mp4', '.mp4');
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', tmp]);
      let err = ''; ff.stderr.on('data', d => err += d);
      const done = new Promise(res => ff.on('close', res));
      for (let f = 0; f < n; f++) {
        await page.evaluate(([i, t, T]) => window.draw(i, t, T), [i, f / FPS, starts[i] + f / FPS]);
        const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      const code = await done;
      if (code !== 0) { console.error('ffmpeg falló en', sc.id, err); process.exit(1); }
      fs.renameSync(tmp, fin);
      console.log('✓', sc.id, n, 'fotogramas');
    }
  }
  await b.close();
})();
