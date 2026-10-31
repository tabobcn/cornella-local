// Capturas del alta de un negocio de ejemplo (ficticio) con datos simulados
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:4173';
const OUT = path.join(__dirname, 'shots');
const IMG = path.join(__dirname, 'img');
const UID = '11111111-2222-3333-4444-555555555555';
// Hora simulada para las capturas: martes por la mañana (los comercios salen abiertos)
const FAKE_T = Date.parse('2026-11-03T10:20:00+01:00');
const now = new Date(FAKE_T).toISOString();
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
const fakeJwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, exp, role: 'authenticated', aud: 'authenticated', email: 'marta@ejemplo.es' })}.firma`;
const user = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'marta@ejemplo.es', email_confirmed_at: now,
  app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Marta' }, created_at: '2026-09-01T10:00:00Z' };
const session = { access_token: fakeJwt, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'r', user };
const profile = { id: UID, email: 'marta@ejemplo.es', full_name: 'Marta', created_at: '2026-09-01T10:00:00Z', is_admin: false, is_banned: false };
const ST = 'https://zwhlcgckhocdkdxilldo.supabase.co/storage/v1/object/public/business-photos/demo';
const H = (d, h) => new Date(FAKE_T + d * 864e5 + (h || 0) * 36e5).toISOString();

const hours = {
  monday: { enabled: true, morning: { start: '07:30', end: '14:00' }, afternoon: { start: '17:00', end: '20:30' } },
  tuesday: { enabled: true, morning: { start: '07:30', end: '14:00' }, afternoon: { start: '17:00', end: '20:30' } },
  wednesday: { enabled: true, morning: { start: '07:30', end: '14:00' }, afternoon: { start: '17:00', end: '20:30' } },
  thursday: { enabled: true, morning: { start: '07:30', end: '14:00' }, afternoon: { start: '17:00', end: '20:30' } },
  friday: { enabled: true, morning: { start: '07:30', end: '14:00' }, afternoon: { start: '17:00', end: '20:30' } },
  saturday: { enabled: true, morning: { start: '08:00', end: '14:00' }, afternoon: { start: '', end: '' } },
  sunday: { enabled: true, morning: { start: '08:00', end: '13:30' }, afternoon: { start: '', end: '' } },
};
const biz = (over = {}) => ({
  id: 50, owner_id: UID, name: 'Panadería Sol de Trigo', slug: 'panaderia-sol-de-trigo-50', category_id: 2, subcategory: 'Panadería',
  description: 'Pan de masa madre hecho cada mañana, cocas, croissants de mantequilla y pasteles por encargo. Desayunos para llevar.',
  phone: '600 123 456', website: '', address: 'Carrer Major, 12', neighborhood: 'Centre-Riera', city: 'Cornellà de Llobregat',
  opening_hours: hours, special_closures: [], tags: ['Pan artesanal', 'Masa madre', 'Bollería casera'], cover_photo: `${ST}/cover.jpg`, images: [`${ST}/interior.jpg`, `${ST}/cakes.jpg`],
  verification_status: 'draft', is_published: false, is_verified: false, verification_documents: ['demo/alta-autonomo.pdf'],
  instagram_consent: false, services_contact_consent: false, rating: 0, review_count: 0, view_count: 0, click_count: 0,
  created_at: now, updated_at: now, ...over,
});

const applyFilters = (rows, params) => {
  let out = rows;
  for (const [k, v] of params.entries()) {
    if (['select', 'order', 'limit', 'offset', 'or', 'columns', 'on_conflict'].includes(k)) continue;
    if (v.startsWith('eq.')) out = out.filter(r => String(r[k]) === v.slice(3));
    else if (v.startsWith('in.(')) { const list = v.slice(4, -1).split(',').map(x => x.replace(/^"|"$/g, '')); out = out.filter(r => list.includes(String(r[k]))); }
    else if (v === 'is.null') out = out.filter(r => r[k] == null);
    else if (v === 'not.is.null') out = out.filter(r => r[k] != null);
  }
  return out;
};

async function makeContext(browser, { loggedIn = true, data = {}, rpc = {} }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  await ctx.clock.install({ time: new Date(FAKE_T) });
  await ctx.addInitScript(([s, li]) => {
    if (!sessionStorage.getItem('puesta')) {
      if (li) localStorage.setItem('sb-zwhlcgckhocdkdxilldo-auth-token', s);
      localStorage.setItem('cookie-consent', 'rejected');
      localStorage.setItem('push-asked', 'true');
      localStorage.setItem('hasSeenOnboarding', 'true');
      sessionStorage.setItem('puesta', '1');
    }
  }, [JSON.stringify(session), loggedIn]);
  await ctx.route('**/rest/v1/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const table = url.pathname.replace(/^.*\/rest\/v1\//, ''); const method = req.method();
    const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    if (table.startsWith('rpc/')) { const n = table.slice(4); return route.fulfill({ json: n in rpc ? (typeof rpc[n] === 'function' ? rpc[n](req.postDataJSON?.()) : rpc[n]) : null }); }
    if (table === 'profiles') return route.fulfill({ json: single ? profile : [profile] });
    const rows = data[table] || [];
    if (method === 'HEAD') return route.fulfill({ status: 200, headers: { 'content-range': `*/${applyFilters(rows, url.searchParams).length}`, 'access-control-expose-headers': 'content-range', 'access-control-allow-origin': '*' }, body: '' });
    if (method === 'PATCH') { const patch = req.postDataJSON(); const hit = applyFilters(rows, url.searchParams); hit.forEach(r => Object.assign(r, patch)); return route.fulfill({ json: single ? hit[0] || null : hit }); }
    if (method === 'POST') { const body = req.postDataJSON(); const row = { id: 900 + rows.length, created_at: now, ...(Array.isArray(body) ? body[0] : body) }; data[table] = [...rows, row]; return route.fulfill({ status: 201, json: single ? row : [row] }); }
    if (method === 'DELETE') return route.fulfill({ status: 204, body: '' });
    const out = applyFilters(rows, url.searchParams);
    return route.fulfill({ json: single ? (out[0] || null) : out });
  });
  await ctx.route('**/auth/v1/**', (route) => route.request().url().includes('/user') ? route.fulfill({ json: user }) : route.fulfill({ json: {} }));
  await ctx.route('**/realtime/**', (route) => route.abort());
  await ctx.route('**/storage/v1/**', (route) => route.fulfill({ json: {} }));
  await ctx.route('**/storage/v1/object/public/**', (route) => {
    const f = path.join(IMG, path.basename(new URL(route.request().url()).pathname));
    return fs.existsSync(f) ? route.fulfill({ path: f, contentType: 'image/jpeg' }) : route.fulfill({ status: 404, body: '' });
  });
  await ctx.route('**/_vercel/**', (route) => route.fulfill({ status: 204, body: '' }));
  return ctx;
}

// Guarda: vista (con barras fijas), página completa sin barras fijas y la posición de cabecera/pie y de los objetivos
async function snap(page, name, targets = []) {
  await page.waitForTimeout(700);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 92 });
  const meta = await page.evaluate((sels) => {
    const fixedEls = [...document.querySelectorAll('body *')].filter(el => { const p = getComputedStyle(el).position; return p === 'fixed' || p === 'sticky'; })
      .filter(el => el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().height < 400);
    let headerH = 0, bottomH = 0;
    for (const el of fixedEls) { const r = el.getBoundingClientRect(); if (r.top <= 1) headerH = Math.max(headerH, r.bottom); else if (r.bottom >= innerHeight - 1) bottomH = Math.max(bottomH, innerHeight - r.top); }
    const tg = {};
    for (const [k, sel] of Object.entries(sels)) {
      let el = null;
      if (sel.startsWith('text=')) { const t = sel.slice(5); el = [...document.querySelectorAll('button, a, label, h1, h2, h3, h4, span, p')].find(e => e.textContent.trim() === t || e.textContent.trim().startsWith(t)); }
      else el = document.querySelector(sel);
      if (el) { const r = el.getBoundingClientRect(); tg[k] = { x: r.left + r.width / 2, y: r.top + scrollY + r.height / 2, w: r.width, h: r.height, fixed: ['fixed', 'sticky'].includes(getComputedStyle(el.closest('.fixed, .sticky, header') || el).position) }; }
    }
    return { headerH, bottomH, fullH: document.documentElement.scrollHeight, tg };
  }, Object.fromEntries(targets));
  // página completa con las barras fijas escondidas (dejan su hueco)
  // fijos fuera (display:none), pegajosos invisibles (dejan su hueco); se restauran después
  await page.evaluate(() => {
    window.__hidden = [];
    for (const el of document.querySelectorAll('body *')) {
      const pos = getComputedStyle(el).position;
      if (pos === 'fixed') { window.__hidden.push([el, 'display', el.style.display]); el.style.setProperty('display', 'none', 'important'); }
      else if (pos === 'sticky') { window.__hidden.push([el, 'visibility', el.style.visibility]); el.style.setProperty('visibility', 'hidden', 'important'); el.querySelectorAll('*').forEach(c => { window.__hidden.push([c, 'visibility', c.style.visibility]); c.style.setProperty('visibility', 'hidden', 'important'); }); }
    }
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${name}-full.jpg`, type: 'jpeg', quality: 92, fullPage: true });
  await page.evaluate(() => { for (const [el, prop, val] of window.__hidden) { el.style.removeProperty(prop); if (val) el.style[prop] = val; } });
  await page.waitForTimeout(150);
  fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify(meta, null, 1));
  console.log('✓', name, JSON.stringify(meta));
}


module.exports = { makeContext, snap, applyFilters, ST, UID, now, hours, H, BASE, OUT, fs, path, chromium };
