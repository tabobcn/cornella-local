// Renderiza el vídeo cómic: frames = fotogramas de prueba; video = una escena por archivo (+ timeline.json para el sonido)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const DIR = __dirname, FPS = 30;
const mode = process.argv[2] || 'frames';
const only = process.argv[3] ? process.argv[3].split(',') : null;
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(DIR, 'comic.html'));
  await page.evaluate(async () => { await document.fonts.load('60px Bangers'); await document.fonts.load('700 40px "Comic Neue"'); await document.fonts.ready; });
  // precarga de imágenes
  await page.evaluate(async (srcs) => { await Promise.all(srcs.map(s => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = s; document.body.appendChild(im); im.style.cssText = 'position:absolute;left:-9999px;width:1px'; }))); },
    ['../../../public/logo.png', ...fs.readdirSync(path.join(DIR, 'shots')).map(f => 'shots/' + f)]);
  const SC = await page.evaluate(() => window.SCENES);
  const starts = []; let acc = 0; for (const s of SC) { starts.push(acc); acc += Math.round(s.dur * FPS) / FPS; }
  // efectos de sonido (segundos dentro de cada escena)
  const E = {
    portada: [['pop', .2], ['boom', .9]],
    profesional: [['pop', .15], ['pop', .35], ['plof', 1.1], ['plof', 2.1], ['plof', 3.1], ['whoosh', 1.4], ['pop', 2.0], ['pop', 4.3], ['pop', 2.6], ['pop', 2.9]],
    barrio: [['pop', .15], ['pop', .35], ['pop', 1.3], ['pop', 1.6], ['pop', 1.9], ['pop', 2.4], ['stamp', 4.0]],
    ofertas: [['pop', .15], ['pop', .35], ['whoosh', 1.2], ['stamp', 2.7], ['pop', 3.0], ['stamp', 4.2]],
    pequenos: [['pop', .15], ['pop', .35], ['pop', .6], ['pop', 1.05], ['pop', 1.5], ['pop', 1.95], ['whoosh', 1.4], ['pop', 2.6], ['stamp', 4.2]],
    nace: [['pop', .15], ['success', 1.1], ['confetti', 1.15]],
    soluciones: [0, 1, 2, 3].flatMap(k => [...(k ? [['whoosh', k * 2.6]] : []), ['pop', k * 2.6 + .15], ['pop', k * 2.6 + .3], ['stamp', k * 2.6 + 1.2]]),
    cierre: [['pop', .15], ['pop', .6], ['pop', 1.6]],
  };
  const ev = [];
  SC.forEach((s, i) => { if (i) ev.push({ type: 'whoosh', t: starts[i] }); (E[s.id] || []).forEach(([type, t]) => ev.push({ type, t: starts[i] + t })); });
  const moodT = starts[SC.findIndex(s => s.id === 'nace')];
  fs.writeFileSync(path.join(DIR, 'timeline.json'), JSON.stringify({ total: acc, starts, mood: moodT, events: ev }, null, 1));
  if (mode === 'frames') {
    const picks = process.argv[4] ? JSON.parse(process.argv[4]) : [[0, 2.5], [1, 2.6], [1, 5.6], [2, 3.4], [3, 3.6], [4, 3.6], [5, 2.0], [6, 1.8], [6, 6.9], [7, 3.0]];
    fs.mkdirSync(path.join(DIR, 'frames'), { recursive: true });
    for (const [i, t] of picks) { await page.evaluate(([i, t]) => window.draw(i, t), [i, t]); await page.screenshot({ path: path.join(DIR, 'frames', `c-${i}-${t}.jpg`), type: 'jpeg', quality: 88 }); }
    console.log('fotogramas listos');
  } else {
    fs.mkdirSync(path.join(DIR, 'parts'), { recursive: true });
    for (let i = 0; i < SC.length; i++) {
      if (only && !only.includes(SC[i].id)) continue;
      const n = Math.round(SC[i].dur * FPS);
      const tmp = path.join(DIR, 'parts', `${String(i).padStart(2, '0')}-${SC[i].id}.tmp.mp4`), fin = tmp.replace('.tmp.mp4', '.mp4');
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), tmp]);
      let err = ''; ff.stderr.on('data', d => err += d); const done = new Promise(r => ff.on('close', r));
      for (let f = 0; f < n; f++) {
        await page.evaluate(([i, t]) => window.draw(i, t), [i, f / FPS]);
        const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end(); if (await done !== 0) { console.error(err); process.exit(1); }
      fs.renameSync(tmp, fin); console.log('✓', SC[i].id, n);
    }
  }
  await b.close();
})();
