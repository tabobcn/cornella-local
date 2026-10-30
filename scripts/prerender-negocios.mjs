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
:root{--primary:#567ac7;--primary-dark:#405b94;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--bg:#f4f6fb}
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
.locked span.l{margin-left:auto;color:#94a3b8;font-size:13px;font-weight:500}
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

const ICON = {
  pin: '📍', phone: '📞', clock: '🕒', tag: '🏷️', star: '⭐', store: '🏪',
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
<meta property="og:image" content="${esc(image || `${SITE}/icons/icon-512x512.png`)}">
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
        addressLocality: CITY,
        addressRegion: 'Barcelona',
        addressCountry: 'ES',
      },
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

  const lockedRows = [
    [ICON.pin, 'Dirección y cómo llegar'],
    [ICON.phone, 'Teléfono y WhatsApp'],
    [ICON.clock, 'Horario y cierres especiales'],
    [ICON.tag, offersCount > 0 ? `${offersCount} ${offersCount === 1 ? 'oferta activa' : 'ofertas activas'} y cupones` : 'Ofertas y cupones'],
    [ICON.star, 'Reseñas de vecinos'],
  ];

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
      <div class="locked">
        ${lockedRows.map(([i, label]) => `<div><span class="i">${i}</span>${esc(label)}<span class="l" aria-label="Requiere cuenta">🔒</span></div>`).join('\n        ')}
      </div>
      <p class="note">Crea tu cuenta gratis en Cornellà Local para ver todos los datos de este comercio, guardar sus ofertas y recibir avisos.</p>
      <div class="cta">
        <a class="btn btn-primary" href="${appLink}">Ver todos los datos</a>
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
        fetchTable(url, key, 'businesses?select=id,name,slug,description,subcategory,neighborhood,cover_photo,images,rating,review_count,category_id,updated_at&verification_status=eq.approved&is_published=eq.true&order=name.asc&limit=5000'),
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
