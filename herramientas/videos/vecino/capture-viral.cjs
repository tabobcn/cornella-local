// Capturas extra para el vídeo «Cornellà sale del móvil»: búsqueda (barrio, categoría, etiqueta),
// oferta de producto, presupuesto de pintor, avisos y panel del negocio (visitas, clics, empleo).
const { makeContext, snap, ST, UID, now, hours, H, BASE, OUT, fs, chromium } = require('./base.cjs');

const other = (n) => `99999999-0000-0000-0000-00000000000${n}`;
const H2 = { ...hours, sunday: { enabled: false, morning: { start: '', end: '' }, afternoon: { start: '', end: '' } } };
const cafeHours = Object.fromEntries(Object.keys(hours).map(d => [d, { enabled: d !== 'monday', morning: { start: '07:00', end: '15:00' }, afternoon: { start: '17:00', end: '21:00' } }]));
const B = (o) => ({ owner_id: other(o.id % 10), verification_status: 'approved', is_published: true, is_verified: true, city: 'Cornellà de Llobregat',
  special_closures: [], website: '', instagram_consent: false, services_contact_consent: false, view_count: 0, click_count: 0,
  created_at: H(-3), verified_at: H(-3), updated_at: now, images: [], ...o });

const businesses = [
  B({ id: 61, name: 'Panadería Sol de Trigo', category_id: 2, subcategory: 'Panadería', neighborhood: 'Centre-Riera', address: 'Carrer Major, 12', phone: '600 123 456',
    description: 'Pan de masa madre hecho cada mañana, cocas, croissants de mantequilla y pasteles por encargo.', opening_hours: hours,
    tags: ['Pan artesanal', 'Masa madre', 'Bollería casera'], cover_photo: `${ST}/sol.jpg`, images: [`${ST}/interior.jpg`, `${ST}/cakes.jpg`], rating: 4.8, review_count: 12, verified_at: H(-1) }),
  B({ id: 62, name: 'Café Brisa', category_id: 3, subcategory: 'Bar y cafetería', neighborhood: 'Almeda', address: 'Passeig del Parc, 5', phone: '611 222 333',
    description: 'Cafetería de barrio con desayunos, bocadillos y terraza tranquila. Café de especialidad y bollería del día.', opening_hours: cafeHours,
    tags: ['Terraza', 'Desayunos', 'Wifi gratis'], cover_photo: `${ST}/cafe.jpg`, images: [`${ST}/of-cafe.jpg`], rating: 4.7, review_count: 3, verified_at: H(-2) }),
  B({ id: 63, name: 'Peluquería Rizos', category_id: 5, subcategory: 'Peluquería', neighborhood: 'Sant Ildefons', address: 'Carrer de les Flors, 14', phone: '622 444 555',
    description: 'Cortes, color y peinados para toda la familia.', opening_hours: H2, tags: ['Cita previa', 'Color', 'Terraza'], cover_photo: `${ST}/pelu.jpg`, rating: 4.9, review_count: 8 }),
  B({ id: 64, name: 'Fontanería Gota Clara', category_id: 1, subcategory: 'Fontanero', neighborhood: 'La Gavarra', address: 'Carrer del Riu, 30', phone: '633 666 777',
    description: 'Reparación de fugas, grifos, cisternas y calentadores.', opening_hours: H2, tags: ['Urgencias', 'Presupuesto gratis'], cover_photo: `${ST}/fonta.jpg`, rating: 4.6, review_count: 5 }),
  B({ id: 66, name: 'Calzados Paso a Paso', category_id: 4, subcategory: 'Calzado', neighborhood: 'Almeda', address: 'Carrer de Rubió i Ors, 40', phone: '655 101 202',
    description: 'Calzado de adulto e infantil, deportivas y plantillas. Te asesoramos con la talla.', opening_hours: H2, tags: ['Deportivas', 'Calzado infantil'], cover_photo: null, rating: 4.7, review_count: 9 }),
  B({ id: 67, name: 'Pintures Llobregat', category_id: 1, subcategory: 'Pintor', neighborhood: 'Sant Ildefons', address: 'Avinguda de Sant Ildefons, 18', phone: '666 303 404',
    description: 'Pintura de pisos y locales, alisado de paredes y pequeñas reformas.', opening_hours: H2, tags: ['Presupuesto gratis', 'Pisos y locales'], cover_photo: `${ST}/llob.jpg`, rating: 4.8, review_count: 14 }),
  B({ id: 68, name: 'Decoracions Fontsanta', category_id: 1, subcategory: 'Pintor', neighborhood: 'Fontsanta-Fatjó', address: 'Carrer de Bellavista, 9', phone: '677 505 606',
    description: 'Pintura decorativa, papel pintado y lacados.', opening_hours: H2, tags: ['Papel pintado'], cover_photo: null, rating: 4.5, review_count: 6 }),
  B({ id: 69, name: 'Pintura i Color Almeda', category_id: 1, subcategory: 'Pintor', neighborhood: 'Almeda', address: 'Carrer de Prat de la Riba, 3', phone: '688 707 808',
    description: 'Pintamos tu piso en 2 o 3 días, con protección de muebles y limpieza final.', opening_hours: H2, tags: ['Presupuesto gratis'], cover_photo: null, rating: 4.6, review_count: 4 }),
  B({ id: 70, name: 'Fruites Mercè', category_id: 2, subcategory: 'Frutería', neighborhood: 'Almeda', address: 'Mercat d\'Almeda, parada 7', phone: '699 909 010',
    description: 'Fruta y verdura de temporada, mucha de productores del Baix Llobregat.', opening_hours: hours, tags: ['Producto local', 'A domicilio'], cover_photo: null, rating: 4.9, review_count: 11 }),
];
const bref = (id) => { const b = businesses.find(x => x.id === id); return { id: b.id, name: b.name, address: b.address, phone: b.phone, logo_url: null }; };

const offers = [
  { id: 'aaaaaaaa-0000-0000-0000-000000000066', business_id: 66, businesses: bref(66), title: 'Zapatillas running -30%', description: 'Modelos de esta temporada en todas las tallas, hasta fin de existencias.',
    discount_type: 'percentage', discount_value: 30, discount_label: '-30%', original_price: 79.9, discounted_price: 55.9, status: 'active', is_visible: true, is_flash: false, max_uses: 40, claimed_count: 12, redemption_count: 7,
    image: `${ST}/of-zapas.jpg`, starts_at: H(-1), expires_at: H(4), created_at: H(0, -3), code_valid_hours: 48, fire_count: 27, view_count: 412 },
  { id: 'aaaaaaaa-0000-0000-0000-000000000061', business_id: 61, businesses: bref(61), title: '2x1 en croissants de mantequilla', description: 'Lleva dos croissants y paga uno. De lunes a viernes por la mañana.',
    discount_type: 'percentage', discount_value: 50, discount_label: '2x1', status: 'active', is_visible: true, is_flash: false, max_uses: 50, claimed_count: 18, redemption_count: 11,
    image: `${ST}/of-croissant.jpg`, starts_at: H(-1), expires_at: H(4), created_at: H(-1), code_valid_hours: 24, fire_count: 14, view_count: 380 },
  { id: 'aaaaaaaa-0000-0000-0000-000000000062', business_id: 62, businesses: bref(62), title: 'Café + tostada por 2 €', description: 'Solo hoy por la mañana. Café con leche o cortado y tostada con tomate.',
    discount_type: 'percentage', discount_value: 43, discount_label: null, original_price: 3.5, discounted_price: 2, status: 'active', is_visible: true, is_flash: true, max_uses: 40, claimed_count: 23, redemption_count: 15,
    image: `${ST}/of-cafe.jpg`, starts_at: H(0, -2), expires_at: H(0, 3.2), created_at: H(0, -2), code_valid_hours: null, fire_count: 31, view_count: 540 },
];
const jobs = [
  { id: 'bbbbbbbb-0000-0000-0000-000000000062', business_id: 62, businesses: bref(62), title: 'Camarero/a fines de semana', type: 'Media', contract: 'Temporal', modality: 'Presencial',
    location: 'Almeda, Cornellà', address: 'Passeig del Parc, 5', salary_min: null, salary_max: null, salary_note: '11 €/hora',
    description: 'Buscamos camarero/a para sábados y domingos por la mañana.', requirements: ['Ganas de aprender', 'Disponibilidad fines de semana'],
    benefits: [{ icon: 'Utensils', title: 'Comida incluida', description: 'En cada turno' }], status: 'active', created_at: H(-1), updated_at: H(-1), view_count: 96 },
  { id: 'bbbbbbbb-0000-0000-0000-000000000063', business_id: 62, businesses: bref(62), title: 'Ayudante de cocina', type: 'Completa', contract: 'Indefinido', modality: 'Presencial',
    location: 'Almeda, Cornellà', address: 'Passeig del Parc, 5', salary_min: 17000, salary_max: 19000, salary_note: null,
    description: 'Preparación de desayunos y bocadillos.', requirements: ['Puntualidad'], benefits: [], status: 'active', created_at: H(-4), updated_at: H(-4), view_count: 58 },
];
const notifications = [
  { id: 811, user_id: UID, type: 'new_offer', icon: 'Tag', title: 'Calzados Paso a Paso tiene una oferta', message: 'Zapatillas running -30% · tu tienda favorita', data: { offer_id: offers[0].id }, is_read: false, created_at: H(0, -0.05) },
  { id: 812, user_id: UID, type: 'new_offer', icon: 'Zap', title: 'Nueva oferta en Café Brisa', message: 'Café + tostada por 2 € · solo hoy', data: { offer_id: offers[2].id }, is_read: false, created_at: H(0, -0.4) },
  { id: 813, user_id: UID, type: 'new_offer', icon: 'Tag', title: 'Panadería Sol de Trigo tiene una oferta', message: '2x1 en croissants de mantequilla', data: { offer_id: offers[1].id }, is_read: false, created_at: H(-1) },
  { id: 814, user_id: UID, type: 'budget_quote_received', icon: 'ClipboardList', title: 'Te han enviado un presupuesto', message: 'Pintures Llobregat: 650 €', data: {}, is_read: true, created_at: H(-1, -3) },
];
const RID = 'cccccccc-0000-0000-0000-000000000009';
const budgetRequests = [
  { id: RID, user_id: UID, category: 'pintor', description: 'Pintar piso de 80 m²: salón, 3 habitaciones y pasillo. Paredes lisas, en blanco roto.',
    photos: [], urgency: 'proxima-semana', address: 'Carrer de la Riera, 20', status: 'open', created_at: H(-1), updated_at: H(-1),
    budget_quotes: [
      { id: 'p1', budget_request_id: RID, business_id: 67, price: 650, description: 'Pintura plástica lavable, 2 manos, protección de suelos y muebles. 3 días.', status: 'pending', estimated_duration: '3 días', created_at: H(0, -20) },
      { id: 'p2', budget_request_id: RID, business_id: 69, price: 690, description: 'Incluye arreglar pequeñas grietas y limpieza final. Empezamos el lunes.', status: 'pending', estimated_duration: '2-3 días', created_at: H(0, -12) },
      { id: 'p3', budget_request_id: RID, business_id: 68, price: 720, description: 'Pintura de primera calidad y techos incluidos.', status: 'pending', estimated_duration: '3 días', created_at: H(0, -6) },
    ] },
];
const cands = [
  ['Lucía R.', 'pending', 0.3], ['Jordi P.', 'reviewed', 5], ['Marta G.', 'shortlisted', 20], ['Aitana M.', 'pending', 26],
].map(([n, s, h], i) => ({ id: `dddddddd-0000-0000-0000-00000000010${i}`, job_id: jobs[0].id, user_id: other(i + 1), full_name: n, email: `${n.split(' ')[0].toLowerCase()}@ejemplo.es`, phone: '600 000 00' + i,
  status: s, cover_letter: 'Vivo en el barrio y tengo experiencia de camarero/a los fines de semana.', created_at: H(0, -h), jobs: { ...jobs[0] } }));

const clone = (x) => JSON.parse(JSON.stringify(x));
const dataset = (over = {}) => ({
  businesses: clone(businesses), offers: clone(offers), jobs: clone(jobs), reviews: [], notifications: clone(notifications),
  favorites: [{ id: 1, user_id: UID, business_id: 66, created_at: H(-2) }, { id: 2, user_id: UID, business_id: 61, created_at: H(-2) }],
  offer_redemptions: [], budget_requests: [], job_applications: [], ...over,
  favorites: [...(over.favorites || [{ id: 1, user_id: UID, business_id: 66, created_at: H(-2) }, { id: 2, user_id: UID, business_id: 61, created_at: H(-2) }]), ...Array.from({ length: 37 }, (_, i) => ({ id: 100 + i, user_id: `77777777-0000-0000-0000-${String(i).padStart(12, '0')}`, business_id: 62, created_at: H(-i) }))],
});
const rpc = {
  get_or_create_redemption: () => ({ code: 'CL-3Z9M', status: 'pending', created_at: now, expires_at: H(0, 48) }),
  can_user_review: { can_review: true }, toggle_offer_fire: { fired: true, fire_count: 28 },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  const want = (k) => !only || only.includes(k);
  const b = await chromium.launch({ args: ['--lang=es-ES'], env: { ...process.env, LANG: 'es_ES.UTF-8', LANGUAGE: 'es_ES:es', LC_ALL: 'es_ES.UTF-8' } });
  let ctx, p;
  const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 92 }); console.log('✓', name); };

  if (want('buscar')) {
    ctx = await makeContext(b, { data: dataset(), rpc });
    p = await ctx.newPage(); await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    await p.getByTitle('Filtrar por barrio').click();
    await shot('x01-barrios');
    await p.locator('div.fixed.inset-0.z-50').getByRole('button', { name: /^Almeda/ }).first().click();
    await shot('x02-almeda');
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: /Moda y complementos/ }).first().click();
    await shot('x03-categoria');
    await p.goto(BASE + '/?negocio=62', { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: 'Terraza', exact: true }).first().click();
    await shot('x04-etiqueta');
    await ctx.close();
  }
  if (want('ofertas')) {
    ctx = await makeContext(b, { data: dataset(), rpc });
    p = await ctx.newPage(); await p.goto(BASE + '/?nav=offers', { waitUntil: 'networkidle' });
    await shot('x05-ofertas');
    await p.goto(BASE + '/?oferta=' + offers[0].id, { waitUntil: 'networkidle' });
    await shot('x06-zapas');
    await p.getByRole('button', { name: 'Obtener mi código' }).click(); await p.waitForTimeout(800);
    await shot('x07-zapas-codigo');
    await p.goto(BASE + '/?nav=notifications', { waitUntil: 'networkidle' });
    await shot('x08-avisos');
    await p.goto(BASE + '/?nav=favorites', { waitUntil: 'networkidle' });
    await shot('x09-favoritos');
    await ctx.close();
  }
  if (want('pres')) {
    ctx = await makeContext(b, { data: dataset(), rpc });
    p = await ctx.newPage(); await p.goto(BASE + '/?nav=budget-request', { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    await p.getByRole('button', { name: /Pintor/ }).first().click();
    await shot('x10-pres-pintor');
    await ctx.close();
    ctx = await makeContext(b, { data: dataset({ budget_requests: clone(budgetRequests) }), rpc });
    p = await ctx.newPage(); await p.goto(BASE + '/?nav=my-budget-requests', { waitUntil: 'networkidle' });
    await p.getByText('Pintor', { exact: false }).first().click().catch(() => {}); await p.waitForTimeout(700);
    await shot('x11-pres-recibidos');
    await ctx.close();
  }
  if (want('negocio')) {
    const own = dataset({ job_applications: clone(cands) });
    const cafe = own.businesses.find(x => x.id === 62); Object.assign(cafe, { owner_id: UID, view_count: 1248, click_count: 316 });
    ctx = await makeContext(b, { data: own, rpc });
    p = await ctx.newPage(); await p.goto(BASE + '/?nav=owner-dashboard', { waitUntil: 'networkidle' });
    await shot('x12-panel');
    await p.goto(BASE + '/?nav=business-stats', { waitUntil: 'networkidle' });
    await snap(p, 'x13-stats', []);
    await p.goto(BASE + '/?nav=business-candidates', { waitUntil: 'networkidle' });
    await shot('x14-candidatos');
    await p.goto(BASE + '/?nav=business-jobs', { waitUntil: 'networkidle' });
    await shot('x15-empleos');
    await ctx.close();
  }
  await b.close();
})();
