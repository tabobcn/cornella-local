const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const items = [['interior', 900, 900], ['cakes', 900, 900], ['sol', 1600, 900], ['cafe', 1600, 900], ['pelu', 1600, 900], ['fonta', 1600, 900], ['nord', 1600, 900], ['of-croissant', 900, 900], ['of-cafe', 900, 900], ['of-pelu', 900, 900], ['llob', 1600, 900], ['of-zapas', 900, 900]];
  for (const [name, w, h] of items) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + __dirname + '/' + name + '.html');
    await p.screenshot({ path: __dirname + '/' + name + '.jpg', type: 'jpeg', quality: 90 });
    await p.close();
  }
  await b.close();
})();
