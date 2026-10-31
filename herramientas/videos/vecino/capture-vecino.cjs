// Capturas para los vídeos del vecino: 5 negocios inventados, ofertas, empleos y presupuestos simulados
const { makeContext, snap, ST, UID, now, hours, H, BASE, OUT, fs, chromium } = require('./base.cjs');

const other = (n) => `99999999-0000-0000-0000-00000000000${n}`;
const H2 = { ...hours, sunday: { enabled: false, morning: { start: '', end: '' }, afternoon: { start: '', end: '' } } };
const cafeHours = Object.fromEntries(Object.keys(hours).map(d => [d, { enabled: d !== 'monday', morning: { start: '07:00', end: '15:00' }, afternoon: { start: '17:00', end: '21:00' } }]));
const B = (o) => ({ owner_id: other(o.id % 10), verification_status: 'approved', is_published: true, is_verified: true, city: 'Cornellà de Llobregat',
  special_closures: [], website: '', instagram_consent: false, services_contact_consent: false, view_count: 0, click_count: 0,
  created_at: H(-3), verified_at: H(-3), updated_at: now, ...o });

const businesses = [
  B({ id: 61, name: 'Panadería Sol de Trigo', category_id: 2, subcategory: 'Panadería', neighborhood: 'Centre-Riera', address: 'Carrer Major, 12', phone: '600 123 456',
    description: 'Pan de masa madre hecho cada mañana, cocas, croissants de mantequilla y pasteles por encargo.', opening_hours: hours,
    tags: ['Pan artesanal', 'Masa madre', 'Bollería casera'], cover_photo: `${ST}/sol.jpg`, images: [`${ST}/interior.jpg`, `${ST}/cakes.jpg`], rating: 4.8, review_count: 12, verified_at: H(-1) }),
  B({ id: 62, name: 'Café Brisa', category_id: 3, subcategory: 'Bar y cafetería', neighborhood: 'Almeda', address: 'Passeig del Parc, 5', phone: '611 222 333',
    description: 'Cafetería de barrio con desayunos, bocadillos y terraza tranquila. Café de especialidad y bollería del día.', opening_hours: cafeHours,
    tags: ['Terraza', 'Desayunos', 'Wifi gratis'], cover_photo: `${ST}/cafe.jpg`, images: [`${ST}/of-cafe.jpg`], rating: 4.7, review_count: 3, verified_at: H(-2) }),
  B({ id: 63, name: 'Peluquería Rizos', category_id: 5, subcategory: 'Peluquería', neighborhood: 'Sant Ildefons', address: 'Carrer de les Flors, 14', phone: '622 444 555',
    description: 'Cortes, color y peinados para toda la familia. Pide cita por WhatsApp.', opening_hours: H2,
    tags: ['Cita previa', 'Color'], cover_photo: `${ST}/pelu.jpg`, images: [], rating: 4.9, review_count: 8, verified_at: H(-4) }),
  B({ id: 64, name: 'Fontanería Gota Clara', category_id: 1, subcategory: 'Fontanero', neighborhood: 'La Gavarra', address: 'Carrer del Riu, 30', phone: '633 666 777',
    description: 'Reparación de fugas, grifos, cisternas y calentadores. Urgencias en el día.', opening_hours: H2,
    tags: ['Urgencias', 'Presupuesto gratis'], cover_photo: `${ST}/fonta.jpg`, images: [], rating: 4.6, review_count: 5, verified_at: H(-5) }),
  B({ id: 65, name: 'Instal·lacions Nord', category_id: 1, subcategory: 'Fontanero', neighborhood: 'El Pedró', address: 'Carrer Nou, 7', phone: '644 888 999',
    description: 'Fontanería y calefacción.', opening_hours: H2, tags: [], cover_photo: `${ST}/nord.jpg`, images: [], rating: 4.4, review_count: 3, verified_at: H(-6) }),
];
const bref = (id) => { const b = businesses.find(x => x.id === id); return { id: b.id, name: b.name, address: b.address, phone: b.phone, logo_url: null }; };

const offers = [
  { id: 'aaaaaaaa-0000-0000-0000-000000000061', business_id: 61, businesses: bref(61), title: '2x1 en croissants de mantequilla', description: 'Lleva dos croissants y paga uno. De lunes a viernes por la mañana.',
    discount_type: 'percentage', discount_value: 50, discount_label: '2x1', status: 'active', is_visible: true, is_flash: false, max_uses: 50, claimed_count: 18, redemption_count: 11,
    image: `${ST}/of-croissant.jpg`, starts_at: H(-1), expires_at: H(4), created_at: H(-1), code_valid_hours: 24, fire_count: 14 },
  { id: 'aaaaaaaa-0000-0000-0000-000000000062', business_id: 62, businesses: bref(62), title: 'Café + tostada por 2 €', description: 'Solo hoy por la mañana. Café con leche o cortado y tostada con tomate.',
    discount_type: 'percentage', discount_value: 43, discount_label: null, original_price: 3.5, discounted_price: 2, status: 'active', is_visible: true, is_flash: true, max_uses: 40, claimed_count: 23, redemption_count: 15,
    image: `${ST}/of-cafe.jpg`, starts_at: H(0, -2), expires_at: H(0, 3.2), created_at: H(0, -2), code_valid_hours: null, fire_count: 31 },
  { id: 'aaaaaaaa-0000-0000-0000-000000000063', business_id: 63, businesses: bref(63), title: '-20% en corte y peinado', description: 'Para clientes nuevos y de siempre. Pide cita y enseña tu código.',
    discount_type: 'percentage', discount_value: 20, discount_label: '-20%', status: 'active', is_visible: true, is_flash: false, max_uses: 30, claimed_count: 9, redemption_count: 4,
    image: `${ST}/of-pelu.jpg`, starts_at: H(-1), expires_at: H(5), created_at: H(0, -5), code_valid_hours: 72, fire_count: 8 },
];
const jobs = [
  { id: 'bbbbbbbb-0000-0000-0000-000000000062', business_id: 62, businesses: bref(62), title: 'Camarero/a fines de semana', type: 'Media', contract: 'Temporal', modality: 'Presencial',
    location: 'Almeda, Cornellà', address: 'Passeig del Parc, 5', salary_min: null, salary_max: null, salary_note: '11 €/hora',
    description: 'Buscamos camarero/a para sábados y domingos por la mañana. Buen ambiente y equipo joven.', requirements: ['Experiencia en barra (no imprescindible)', 'Ganas de aprender', 'Disponibilidad fines de semana'],
    benefits: [{ icon: 'Utensils', title: 'Comida incluida', description: 'En cada turno' }, { icon: 'Clock', title: 'Horario fijo', description: 'Sábados y domingos de 8 a 15 h' }], status: 'active', created_at: H(-1), updated_at: H(-1), view_count: 52 },
  { id: 'bbbbbbbb-0000-0000-0000-000000000061', business_id: 61, businesses: bref(61), title: 'Ayudante de obrador', type: 'Completa', contract: 'Indefinido', modality: 'Presencial',
    location: 'Centre, Cornellà', address: 'Carrer Major, 12', salary_min: 18000, salary_max: 20000, salary_note: null,
    description: 'Ayudante para elaborar pan y bollería. Turno de mañana.', requirements: ['Puntualidad', 'Trabajo en equipo'], benefits: [{ icon: 'FileText', title: 'Contrato indefinido', description: 'Tras el periodo de prueba' }],
    status: 'active', created_at: H(-3), updated_at: H(-3), view_count: 37 },
];
const reviews = [
  { id: 701, business_id: 62, user_id: other(1), rating: 5, comment: 'El mejor café del barrio y la terraza es muy tranquila. Muy amables.', created_at: H(-6) },
  { id: 702, business_id: 62, user_id: other(2), rating: 5, comment: 'Desayunos buenísimos y a buen precio.', created_at: H(-12) },
  { id: 703, business_id: 62, user_id: other(3), rating: 4, comment: 'Bocadillos muy ricos. A veces hay que esperar un poco.', created_at: H(-20) },
];
const notifications = [
  { id: 801, user_id: UID, type: 'new_offer', icon: 'Zap', title: 'Nueva oferta en Café Brisa', message: 'Café + tostada por 2 € · solo hoy', data: { offer_id: offers[1].id }, is_read: false, created_at: H(0, -0.3) },
  { id: 802, user_id: UID, type: 'new_offer', icon: 'Tag', title: 'Panadería Sol de Trigo tiene una oferta', message: '2x1 en croissants de mantequilla', data: { offer_id: offers[0].id }, is_read: false, created_at: H(-1) },
  { id: 803, user_id: UID, type: 'budget_quote_received', icon: 'ClipboardList', title: 'Te han enviado un presupuesto', message: 'Fontanería Gota Clara: 85 €', data: {}, is_read: true, created_at: H(-2) },
];
const budgetRequests = [
  { id: 'cccccccc-0000-0000-0000-000000000001', user_id: UID, category: 'fontanero', description: 'Gotea el grifo de la cocina y la cisterna del baño no para de cargar.',
    photos: [], urgency: 'esta-semana', address: 'Carrer de la Riera, 20', status: 'open', created_at: H(-1), updated_at: H(-1),
    budget_quotes: [
      { id: 'q1', budget_request_id: 'cccccccc-0000-0000-0000-000000000001', business_id: 64, price: 85, description: 'Cambio el cartucho del grifo y el mecanismo de la cisterna. Material incluido. Puedo ir mañana por la tarde.', status: 'pending', estimated_duration: '2 horas', created_at: H(0, -20) },
      { id: 'q2', budget_request_id: 'cccccccc-0000-0000-0000-000000000001', business_id: 65, price: 110, description: 'Revisión completa de grifo y cisterna con piezas nuevas. Disponible el jueves.', status: 'pending', estimated_duration: '3 horas', created_at: H(0, -10) },
    ] },
];
const applications = [
  { id: 'dddddddd-0000-0000-0000-000000000001', job_id: jobs[0].id, user_id: UID, full_name: 'Marta', status: 'pending', created_at: H(0, -0.05), jobs: { ...jobs[0], businesses: bref(62) } },
  { id: 'dddddddd-0000-0000-0000-000000000002', job_id: jobs[1].id, user_id: UID, full_name: 'Marta', status: 'shortlisted', interview_date: '2026-11-04T10:30:00+01:00', interview_location: 'Carrer Major, 12', created_at: H(-2), jobs: { ...jobs[1], businesses: bref(61) } },
];

const dataset = (over = {}) => ({
  businesses: JSON.parse(JSON.stringify(businesses)), offers: JSON.parse(JSON.stringify(offers)), jobs: JSON.parse(JSON.stringify(jobs)),
  reviews: JSON.parse(JSON.stringify(reviews)), notifications: JSON.parse(JSON.stringify(notifications)),
  favorites: [{ id: 1, user_id: UID, business_id: 61, created_at: H(-2) }, { id: 2, user_id: UID, business_id: 61, created_at: H(-2) }].slice(0, 1),
  offer_redemptions: [], budget_requests: [], job_applications: [], ...over,
});
const rpc = {
  get_or_create_redemption: () => ({ code: 'CL-7K4P', status: 'pending', created_at: now, expires_at: H(0, 24) }),
  can_user_review: { can_review: true }, toggle_offer_fire: { fired: true, fire_count: 15 },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  const want = (k) => !only || only.includes(k);
  const b = await chromium.launch({ args: ['--lang=es-ES'], env: { ...process.env, LANG: 'es_ES.UTF-8', LANGUAGE: 'es_ES:es', LC_ALL: 'es_ES.UTF-8' } });
  let ctx, p;

  // MÓDULO 1 · Descubre tu barrio
  if (want('m1')) {
    ctx = await makeContext(b, { data: dataset(), rpc });
    p = await ctx.newPage(); await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    await snap(p, 'v01-inicio', []);
    await p.getByPlaceholder('Busca un comercio o servicio').fill('pan');
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/v02-buscar.jpg`, type: 'jpeg', quality: 92 });
    fs.writeFileSync(`${OUT}/v02-buscar.json`, JSON.stringify({ headerH: 0, bottomH: 0, fullH: 844, tg: {} }));
    fs.copyFileSync(`${OUT}/v02-buscar.jpg`, `${OUT}/v02-buscar-full.jpg`);
    await p.goto(BASE + '/?negocio=62', { waitUntil: 'networkidle' });
    await snap(p, 'v03-ficha', [['fav', 'button[aria-pressed]'], ['llamar', 'text=Llamar']]);
    await ctx.close();
    ctx = await makeContext(b, { data: dataset({ favorites: [{ id: 1, user_id: UID, business_id: 61 }, { id: 2, user_id: UID, business_id: 62 }, { id: 3, user_id: UID, business_id: 63 }] }), rpc });
    p = await ctx.newPage(); await p.goto(BASE + '/?nav=favorites', { waitUntil: 'networkidle' });
    await snap(p, 'v04-favoritos', []);
    await ctx.close();
  }

  // MÓDULO 2 · Ofertas y cupones
  if (want('m2')) {
    ctx = await makeContext(b, { data: dataset(), rpc });
    p = await ctx.newPage(); await p.goto(BASE + '/?nav=offers', { waitUntil: 'networkidle' });
    await snap(p, 'v05-ofertas', []);
    await p.goto(BASE + '/?nav=flash-offers', { waitUntil: 'networkidle' });
    await snap(p, 'v06-flash', []);
    await p.goto(BASE + '/?oferta=' + offers[0].id, { waitUntil: 'networkidle' });
    await snap(p, 'v07-cupon', [['obtener', 'text=Obtener mi código']]);
    await p.getByRole('button', { name: 'Obtener mi código' }).click();
    await p.waitForTimeout(800);
    await snap(p, 'v08-codigo', [['codigo', 'text=CL-7K4P']]);
    await p.goto(BASE + '/?nav=notifications', { waitUntil: 'networkidle' });
    await snap(p, 'v09-avisos', []);
    await ctx.close();
  }

  // MÓDULO 3 · Pedir presupuesto
  if (want('m3')) {
    ctx = await makeContext(b, { data: dataset(), rpc });
    p = await ctx.newPage(); await p.goto(BASE + '/?nav=budget-request', { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    await p.getByRole('button', { name: /Fontanero/ }).first().click();
    await snap(p, 'v10-pres-servicio', [['fonta', 'text=Fontanero'], ['sig', 'text=Siguiente']]);
    await p.getByRole('button', { name: /Siguiente/ }).click(); await p.waitForTimeout(500);
    await p.getByLabel('Describe el trabajo que necesitas').fill('Gotea el grifo de la cocina y la cisterna del baño no para de cargar. ¿Me podéis dar precio?');
    const urg = p.getByRole('button', { name: /Esta semana/i }); if (await urg.count()) await urg.first().click();
    await snap(p, 'v11-pres-detalles', [['sig', 'text=Siguiente']]);
    await p.getByRole('button', { name: /Siguiente/ }).click(); await p.waitForTimeout(500);
    const urg3 = p.getByRole('button', { name: /Esta semana/i }); if (await urg3.count()) await urg3.first().click();
    await p.getByLabel('Dirección del servicio').fill('Carrer de la Riera, 20');
    await p.getByLabel('Teléfono de contacto').fill('600 000 000');
    await snap(p, 'v12-pres-contacto', [['enviar', 'text=Enviar a']]);
    await ctx.close();
    ctx = await makeContext(b, { data: dataset({ budget_requests: JSON.parse(JSON.stringify(budgetRequests)) }), rpc });
    p = await ctx.newPage(); await p.goto(BASE + '/?nav=my-budget-requests', { waitUntil: 'networkidle' });
    await snap(p, 'v13-pres-lista', []);
    const card = p.getByText('Fontanero', { exact: false }).first();
    await card.click().catch(() => {}); await p.waitForTimeout(700);
    await snap(p, 'v14-pres-recibidos', [['aceptar', 'text=Aceptar']]);
    await ctx.close();
  }

  // MÓDULO 4 · Trabajo en el barrio
  if (want('m4')) {
    ctx = await makeContext(b, { data: dataset(), rpc });
    p = await ctx.newPage(); await p.goto(BASE + '/?nav=offers', { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: /Bolsa de Trabajo/ }).click(); await p.waitForTimeout(700);
    await snap(p, 'v15-bolsa', []);
    await p.goto(BASE + '/?empleo=' + jobs[0].id, { waitUntil: 'networkidle' });
    await snap(p, 'v16-empleo', [['inscribirme', 'text=Inscribirme']]);
    await p.getByRole('button', { name: /Inscribirme/ }).click(); await p.waitForTimeout(600);
    const fcp = p.waitForEvent('filechooser');
    await p.getByText('Subir CV', { exact: true }).last().click();
    const fc = await fcp; await fc.setFiles({ name: 'CV-Marta.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') });
    await p.waitForTimeout(300);
    const ta = p.getByPlaceholder('Hola, me llamo... y me interesa esta oferta porque...');
    if (await ta.count()) await ta.fill('Hola, soy Marta. Vivo en Almeda y tengo experiencia de camarera los fines de semana. ¡Me encantaría trabajar con vosotros!');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/v17-inscribirse.jpg`, type: 'jpeg', quality: 92 });
    const tg17 = await p.evaluate(() => { const el = [...document.querySelectorAll('button')].find(e => e.textContent.includes('Enviar candidatura')); if (!el) return {}; const r = el.getBoundingClientRect(); return { enviar: { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, fixed: true } }; });
    fs.writeFileSync(`${OUT}/v17-inscribirse.json`, JSON.stringify({ headerH: 0, bottomH: 0, fullH: 844, tg: tg17 }));
    fs.copyFileSync(`${OUT}/v17-inscribirse.jpg`, `${OUT}/v17-inscribirse-full.jpg`);
    await ctx.close();
    ctx = await makeContext(b, { data: dataset({ job_applications: JSON.parse(JSON.stringify(applications)) }), rpc });
    p = await ctx.newPage(); await p.goto(BASE + '/?nav=user-jobs', { waitUntil: 'networkidle' });
    await snap(p, 'v18-candidaturas', []);
    await ctx.close();
  }
  await b.close();
})();
