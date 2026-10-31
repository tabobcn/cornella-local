const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h] of [['cover', 1600, 900], ['interior', 900, 900], ['cakes', 900, 900]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + __dirname + '/' + name + '.html');
    await p.screenshot({ path: __dirname + '/' + name + '.jpg', type: 'jpeg', quality: 92 });
    await p.close();
  }
  await b.close();
})();
