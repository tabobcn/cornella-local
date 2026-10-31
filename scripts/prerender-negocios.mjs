// ============================================================================
// Prerender de fichas de negocio para Google (se ejecuta tras `vite build`)
//
// Genera HTML estático que los buscadores pueden leer sin ejecutar JavaScript:
//   dist/negocio/<slug>-<id>/index.html   ficha pública de cada negocio publicado
//   dist/negocios/index.html               directorio por categorías
//   dist/sitemap.xml                       mapa del sitio
//
// La ficha muestra lo básico (nombre, categoría, barrio, descripción, reseñas)
// y pide crear cuenta para ver dirección, teléfono, horario y ofertas, igual
// que el modo invitado de la app.
//
// Los negocios nuevos aparecen en el siguiente despliegue de Vercel.
// Si Supabase no responde, el build NO falla: se genera el sitemap básico.
// ============================================================================

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { categories as APP_CATEGORIES } from '../src/data/mockData.js';

const SITE = 'https://www.cornellalocal.es';
const DIST = join(process.cwd(), 'dist');
const CITY = 'Cornellà de Llobregat';

const BARRIOS = {
  'centre-riera': 'Centre-Riera',
  almeda: 'Almeda',
  'el-pedro': 'El Pedró',
  'la-gavarra': 'La Gavarra',
  'sant-ildefons': 'Sant Ildefons',
  'fontsanta-fatjo': 'Fontsanta-Fatjó',
};

// Variables de entorno: en Vercel vienen del proyecto; en local, de .env / .env.local
function loadEnvFiles() {
  for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    const path = join(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const slugify = (text) => String(text || 'negocio')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60) || 'negocio';

const barrioName = (value) => {
  if (!value) return '';
  const key = String(value).toLowerCase();
  if (BARRIOS[key]) return BARRIOS[key];
  const byName = Object.values(BARRIOS).find(n => n.toLowerCase() === key);
  return byName || String(value).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const truncate = (text, max) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
};

const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

async function fetchTable(baseUrl, key, path) {
  const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${path.split('?')[0]}: HTTP ${res.status}`);
  return res.json();
}

const STYLES = `
:root{--primary:#4b71c3;--primary-dark:#405b94;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--bg:#f4f6fb}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.5}
a{color:var(--primary)}
.top{background:#fff;border-bottom:1px solid var(--line)}
.top-in{max-width:960px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.top img{height:28px;width:auto;display:block}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 18px;border-radius:12px;font-weight:700;text-decoration:none;font-size:15px}
.btn-primary{background:var(--primary);color:#fff;box-shadow:0 8px 20px rgba(86,122,199,.25)}
.btn-primary:hover{background:var(--primary-dark)}
.btn-ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
.wrap{max-width:960px;margin:0 auto;padding:20px 16px 48px}
.crumbs{font-size:13px;color:var(--muted);margin:4px 0 16px}
.crumbs a{color:var(--muted);text-decoration:none}
.crumbs a:hover{text-decoration:underline}
.card{background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden}
.hero{position:relative;height:220px;background:linear-gradient(135deg,var(--primary),var(--primary-dark))}
.hero img{width:100%;height:100%;object-fit:cover;display:block}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.55),rgba(0,0,0,0) 60%)}
.hero-text{position:absolute;left:20px;right:20px;bottom:16px;color:#fff;z-index:1}
.hero h1{margin:0;font-size:28px;line-height:1.15}
.hero p{margin:4px 0 0;opacity:.92}
.body{padding:20px;display:grid;gap:20px}
.rating{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:15px}
.rating b{color:var(--ink)}
.desc{margin:0;color:#334155}
.locked{background:var(--bg);border-radius:16px;padding:14px;display:grid;gap:10px}
.locked div{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;color:#334155}
.locked span.i{width:32px;height:32px;border-radius:10px;background:#fff;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.locked span.l{margin-left:auto;color:#64748b;display:inline-flex}
.locked span.i{color:var(--primary-dark)}
.info{display:grid;gap:14px}
.info-row{display:flex;gap:12px;align-items:flex-start}
.info-row .i{width:36px;height:36px;border-radius:10px;background:var(--bg);color:var(--primary-dark);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.info-row p{margin:0;font-size:15px}
.info-row a.small{font-size:14px;font-weight:600}
.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.btn-sm{height:38px;padding:0 14px;font-size:14px;border-radius:10px}
.btn-wa{background:#15803d;color:#fff}
.hours{width:100%;border-collapse:collapse;font-size:14px;margin-top:4px}
.hours td{padding:3px 0}
.hours td:last-child{text-align:right;color:#334155}
.rating svg{color:#f59e0b;fill:#f59e0b}
.cta{display:flex;flex-wrap:wrap;gap:10px}
.note{font-size:14px;color:var(--muted);margin:0}
h2{font-size:18px;margin:28px 0 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.biz{display:block;background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 16px;text-decoration:none;color:var(--ink)}
.biz:hover{border-color:var(--primary)}
.biz strong{display:block}
.biz small{color:var(--muted)}
.foot{border-top:1px solid var(--line);background:#fff}
.foot-in{max-width:960px;margin:0 auto;padding:20px 16px;font-size:13px;color:var(--muted);display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between}
@media (min-width:768px){.hero{height:280px}.hero h1{font-size:34px}.body{padding:28px}}
`;

// Iconos de línea (los mismos que la app), en SVG para que se vean igual en todos los móviles
const svg = (paths) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICON = {
  pin: svg('<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'),
  phone: svg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'),
  clock: svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  tag: svg('<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>'),
  star: svg('<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'),
  lock: svg('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  chat: svg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
  heart: svg('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
};

// Horario de opening_hours ({ monday: { enabled, morning: {start,end}, afternoon: {...} }, ... })
const DAYS = [['monday', 'Lunes', 'Mo'], ['tuesday', 'Martes', 'Tu'], ['wednesday', 'Miércoles', 'We'], ['thursday', 'Jueves', 'Th'],
  ['friday', 'Viernes', 'Fr'], ['saturday', 'Sábado', 'Sa'], ['sunday', 'Domingo', 'Su']];
const scheduleRows = (hours) => {
  if (!hours || typeof hours !== 'object') return [];
  return DAYS.map(([key, label]) => {
    const d = hours[key];
    const slots = d && d.enabled ? [d.morning, d.afternoon].filter(x => x && x.start && x.end) : [];
    return { label, slots, text: slots.length ? slots.map(x => `${x.start} – ${x.end}`).join(', ') : 'Cerrado' };
  });
};
const openingSpec = (hours) => {
  if (!hours || typeof hours !== 'object') return [];
  const out = [];
  for (const [key, , code] of DAYS) {
    const d = hours[key];
    if (!d || !d.enabled) continue;
    for (const x of [d.morning, d.afternoon]) {
      if (x && x.start && x.end) out.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${key.charAt(0).toUpperCase()}${key.slice(1)}`, opens: x.start, closes: x.end });
    }
  }
  return out;
};
// WhatsApp solo para móviles españoles (6xx / 7xx), igual que en la app; un fijo no tiene WhatsApp
const waNumber = (phone) => {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('0034')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('34')) d = d.slice(2);
  return d.length === 9 && /^[67]/.test(d) ? `34${d}` : '';
};

function layout({ title, description, canonical, image, head = '', body }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Cornellà Local">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image || `${SITE}/og-image.jpg`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#567ac7">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<style>${STYLES}</style>
${head}
</head>
<body>
<header class="top"><div class="top-in">
  <a href="/" aria-label="Cornellà Local, inicio"><img src="/logo.png" alt="Cornellà Local" width="160" height="28"></a>
  <a class="btn btn-primary" href="/">Abrir la app</a>
</div></header>
${body}
<footer class="foot"><div class="foot-in">
  <span>Cornellà Local · El comercio de ${CITY}, más cerca</span>
  <span><a href="/negocios">Directorio de comercios</a> · <a href="/?nav=legal-notice">Aviso legal</a> · <a href="/?nav=privacy-policy">Privacidad</a></span>
</div></footer>
</body>
</html>
`;
}

function businessPage(biz, ctx) {
  const { categoryName, url, related, offersCount } = ctx;
  const barrio = barrioName(biz.neighborhood);
  const kind = biz.subcategory || categoryName || 'Comercio local';
  const place = barrio ? `${barrio}, ${CITY}` : CITY;
  const image = biz.cover_photo || (Array.isArray(biz.images) ? biz.images[0] : null);
  const hasReviews = Number(biz.review_count) > 0;
  const rating = Number(biz.rating || 0);
  const descText = truncate(biz.description, 600);
  const description = truncate(
    biz.description && biz.description.length > 30
      ? biz.description
      : `${biz.name}: ${kind.toLowerCase()} en ${place}. Ofertas, horario y contacto en Cornellà Local.`,
    155,
  );
  const title = `${biz.name} – ${kind} en ${barrio || 'Cornellà'} | Cornellà Local`;
  const appLink = `/?negocio=${biz.id}`;

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: biz.name,
      url,
      ...(image ? { image } : {}),
      ...(descText ? { description: descText } : {}),
      address: {
        '@type': 'PostalAddress',
        ...(biz.address ? { streetAddress: biz.address } : {}),
        addressLocality: CITY,
        addressRegion: 'Barcelona',
        addressCountry: 'ES',
      },
      ...(biz.phone ? { telephone: biz.phone } : {}),
      ...(openingSpec(biz.opening_hours).length ? { openingHoursSpecification: openingSpec(biz.opening_hours) } : {}),
      ...(hasReviews ? {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: rating.toFixed(1),
          reviewCount: Number(biz.review_count),
          bestRating: '5',
          worstRating: '1',
        },
      } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Comercios', item: `${SITE}/negocios` },
        { '@type': 'ListItem', position: 3, name: biz.name, item: url },
      ],
    },
  ];

  // Datos básicos a la vista; la cuenta solo hace falta para cupones, reseñas y favoritos
  const lockedRows = [
    [ICON.tag, offersCount > 0 ? `${offersCount} ${offersCount === 1 ? 'oferta activa' : 'ofertas activas'} y cupones` : 'Ofertas y cupones'],
    [ICON.star, 'Escribir y leer reseñas de vecinos'],
    [ICON.heart, 'Guardar en favoritos y recibir sus ofertas'],
  ];
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${biz.address || biz.name}, ${CITY}`)}`;
  const wa = waNumber(biz.phone);
  const rows = scheduleRows(biz.opening_hours);
  const infoBlock = `<div class="info">
        ${biz.address ? `<div class="info-row"><span class="i">${ICON.pin}</span><div><p>${esc(biz.address)}</p><a class="small" href="${esc(mapsUrl)}" target="_blank" rel="noopener">Cómo llegar</a></div></div>` : ''}
        ${biz.phone ? `<div class="info-row"><span class="i">${ICON.phone}</span><div><p>${esc(biz.phone)}</p><div class="actions"><a class="btn btn-ghost btn-sm" href="tel:${esc(String(biz.phone).replace(/\s/g, ''))}">${ICON.phone} Llamar</a>${wa ? `<a class="btn btn-wa btn-sm" href="https://wa.me/${wa}" target="_blank" rel="noopener">${ICON.chat} WhatsApp</a>` : ''}</div></div></div>` : ''}
        ${rows.length ? `<div class="info-row"><span class="i">${ICON.clock}</span><div style="flex:1"><p><b>Horario</b></p><table class="hours">${rows.map(r => `<tr><td>${esc(r.label)}</td><td>${esc(r.text)}</td></tr>`).join('')}</table></div></div>` : ''}
      </div>`;

  const body = `
<main class="wrap">
  <nav class="crumbs" aria-label="Ruta"><a href="/">Inicio</a> › <a href="/negocios">Comercios</a>${categoryName ? ` › <a href="/negocios#${esc(slugify(categoryName))}">${esc(categoryName)}</a>` : ''} › ${esc(biz.name)}</nav>
  <article class="card">
    <div class="hero">
      ${image ? `<img src="${esc(image)}" alt="${esc(biz.name)}" loading="eager">` : ''}
      <div class="hero-text">
        <h1>${esc(biz.name)}</h1>
        <p>${esc(kind)} · ${esc(place)}</p>
      </div>
    </div>
    <div class="body">
      ${hasReviews ? `<div class="rating">${ICON.star} <b>${rating.toFixed(1)}</b> (${Number(biz.review_count)} ${Number(biz.review_count) === 1 ? 'reseña' : 'reseñas'})</div>` : ''}
      ${descText ? `<p class="desc">${esc(descText)}</p>` : `<p class="desc">${esc(biz.name)} es un negocio de ${esc(kind.toLowerCase())} en ${esc(place)}.</p>`}
      ${infoBlock}
      <div class="locked">
        ${lockedRows.map(([i, label]) => `<div><span class="i">${i}</span>${esc(label)}<span class="l" aria-label="Requiere cuenta">${ICON.lock}</span></div>`).join('\n        ')}
      </div>
      <p class="note">Crea tu cuenta gratis en Cornellà Local para conseguir sus cupones, guardarlo en favoritos y dejar tu reseña.</p>
      <div class="cta">
        <a class="btn btn-primary" href="${appLink}">Abrir en la app</a>
        <a class="btn btn-ghost" href="/?nav=register">Crear cuenta gratis</a>
      </div>
    </div>
  </article>
  ${related.length ? `<h2>Más ${esc((categoryName || 'comercios').toLowerCase())} en Cornellà</h2>
  <div class="grid">${related.map(r => `<a class="biz" href="${esc(r.path)}"><strong>${esc(r.name)}</strong><small>${esc(r.kind)}${r.barrio ? ` · ${esc(r.barrio)}` : ''}</small></a>`).join('')}</div>` : ''}
</main>`;

  return layout({ title, description, canonical: url, image, head: ld.map(jsonLd).join('\n'), body });
}

function directoryPage(groups, total) {
  const title = `Comercios de ${CITY} por categorías | Cornellà Local`;
  const description = total > 0
    ? `Directorio con ${total} comercios y servicios de ${CITY}: bares, tiendas, profesionales y más, organizados por categorías y barrios.`
    : `Directorio de comercios y servicios de ${CITY}.`;
  const body = `
<main class="wrap">
  <nav class="crumbs" aria-label="Ruta"><a href="/">Inicio</a> › Comercios</nav>
  <h1 style="margin:0 0 6px;font-size:30px;line-height:1.15">Comercios de ${CITY}</h1>
  <p class="note" style="margin-bottom:8px">${total > 0 ? `${total} negocios del barrio verificados por Cornellà Local.` : 'Muy pronto encontrarás aquí los comercios del barrio.'}</p>
  ${groups.map(g => `<h2 id="${esc(slugify(g.name))}">${esc(g.name)}</h2>
  <div class="grid">${g.items.map(r => `<a class="biz" href="${esc(r.path)}"><strong>${esc(r.name)}</strong><small>${esc(r.kind)}${r.barrio ? ` · ${esc(r.barrio)}` : ''}</small></a>`).join('')}</div>`).join('\n')}
  <div class="cta" style="margin-top:28px"><a class="btn btn-primary" href="/">Abrir Cornellà Local</a><a class="btn btn-ghost" href="/?nav=register">Dar de alta mi negocio</a></div>
</main>`;
  return layout({
    title,
    description,
    canonical: `${SITE}/negocios`,
    head: jsonLd({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: `${SITE}/negocios`,
      isPartOf: { '@type': 'WebSite', name: 'Cornellà Local', url: `${SITE}/` },
    }),
    body,
  });
}

function sitemap(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => `  <url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('[prerender] No existe dist/. Ejecuta antes `vite build`.');
    process.exit(1);
  }
  loadEnvFiles();
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const today = new Date().toISOString().slice(0, 10);

  let businesses = [];
  let offers = [];
  if (url && key) {
    try {
      [businesses, offers] = await Promise.all([
        fetchTable(url, key, 'businesses?select=id,name,slug,description,subcategory,neighborhood,cover_photo,images,rating,review_count,category_id,updated_at,address,phone,opening_hours&verification_status=eq.approved&is_published=eq.true&order=name.asc&limit=5000'),
        fetchTable(url, key, `offers?select=business_id&status=eq.active&is_visible=eq.true&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&limit=5000`).catch(() => []),
      ]);
    } catch (err) {
      console.warn(`[prerender] No se pudieron leer los negocios (${err.message}). Se genera solo el sitemap básico.`);
      businesses = [];
    }
  } else {
    console.warn('[prerender] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Se genera solo el sitemap básico.');
  }

  // Las categorías son las mismas que usa la app (src/data/mockData.js)
  const catName = new Map(APP_CATEGORIES.map(c => [c.id, c.name]));
  const offersByBiz = offers.reduce((acc, o) => acc.set(o.business_id, (acc.get(o.business_id) || 0) + 1), new Map());

  const cards = businesses.map(b => {
    const path = `/negocio/${slugify(b.slug || b.name)}-${b.id}`;
    return {
      biz: b,
      path,
      name: b.name,
      kind: b.subcategory || catName.get(b.category_id) || 'Comercio local',
      barrio: barrioName(b.neighborhood),
      category: catName.get(b.category_id) || 'Otros comercios',
    };
  });

  for (const card of cards) {
    const related = cards
      .filter(c => c.biz.id !== card.biz.id && c.category === card.category)
      .slice(0, 6);
    const html = businessPage(card.biz, {
      categoryName: catName.get(card.biz.category_id) || '',
      url: `${SITE}${card.path}`,
      related,
      offersCount: offersByBiz.get(card.biz.id) || 0,
    });
    const dir = join(DIST, card.path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
  }

  const groups = [...cards.reduce((acc, c) => {
    if (!acc.has(c.category)) acc.set(c.category, []);
    acc.get(c.category).push(c);
    return acc;
  }, new Map())]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  mkdirSync(join(DIST, 'negocios'), { recursive: true });
  writeFileSync(join(DIST, 'negocios', 'index.html'), directoryPage(groups, cards.length));

  writeFileSync(join(DIST, 'sitemap.xml'), sitemap([
    { loc: `${SITE}/`, lastmod: today },
    { loc: `${SITE}/negocios`, lastmod: today },
    ...cards.map(c => ({ loc: `${SITE}${c.path}`, lastmod: (c.biz.updated_at || '').slice(0, 10) || today })),
  ]));

  console.log(`[prerender] ${cards.length} fichas de negocio, directorio y sitemap generados.`);
}

main().catch(err => {
  // Nunca romper el despliegue por el prerender
  console.warn('[prerender] Error inesperado, se continúa sin fichas:', err);
});
