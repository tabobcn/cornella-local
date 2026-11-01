// Capturas para el vídeo «Cornellà tiene de todo»: comercios y oficios por categoría (negocios inventados)
const { makeContext, ST, UID, now, hours, H, BASE, OUT, fs, chromium } = require('./base.cjs');

const other = (n) => `99999999-0000-0000-0000-00000000000${n % 10}`;
const H2 = { ...hours, sunday: { enabled: false, morning: { start: '', end: '' }, afternoon: { start: '', end: '' } } };
const B = (o) => ({ owner_id: other(o.id), verification_status: 'approved', is_published: true, is_verified: true, city: 'Cornellà de Llobregat',
  special_closures: [], website: '', instagram_consent: false, services_contact_consent: false, view_count: 0, click_count: 0,
  created_at: H(-20), verified_at: H(-20), updated_at: now, images: [], opening_hours: H2, cover_photo: null, tags: [], ...o });
const businesses = [
  B({ id: 61, name: 'Panadería Sol de Trigo', category_id: 2, subcategory: 'Panadería', neighborhood: 'Centre-Riera', address: 'Carrer Major, 12', phone: '600 123 456', cover_photo: `${ST}/sol.jpg`, rating: 4.8, review_count: 12, opening_hours: hours, tags: ['Pan artesanal'] }),
  B({ id: 81, name: 'Carnicería Cal Ramon', category_id: 2, subcategory: 'Carnicería y charcutería', neighborhood: 'Centre-Riera', address: 'Carrer de la Riera, 31', phone: '611 300 301', rating: 4.9, review_count: 31, opening_hours: hours, tags: ['Carne de proximidad', 'Embutido casero'] }),
  B({ id: 82, name: 'Carns Germans Puig', category_id: 2, subcategory: 'Carnicería y charcutería', neighborhood: 'Sant Ildefons', address: 'Av. de Sant Ildefons, 9', phone: '611 300 302', rating: 4.7, review_count: 18, tags: ['Pollo de payés'] }),
  B({ id: 83, name: 'Peixos La Marina', category_id: 2, subcategory: 'Pescadería', neighborhood: 'Sant Ildefons', address: 'Carrer de Dr. Arús, 4', phone: '611 300 303', rating: 4.8, review_count: 22, tags: ['Pescado de lonja'] }),
  B({ id: 84, name: 'Peixateria La Mar', category_id: 2, subcategory: 'Pescadería', neighborhood: 'Almeda', address: 'Carrer de Rubió i Ors, 18', phone: '611 300 304', rating: 4.6, review_count: 9, tags: ['Marisco'] }),
  B({ id: 70, name: 'Fruites Mercè', category_id: 2, subcategory: 'Frutería', neighborhood: 'Almeda', address: 'Carrer de Prat de la Riba, 22', phone: '699 909 010', rating: 4.9, review_count: 11, opening_hours: hours, tags: ['Producto local', 'A domicilio'] }),
  B({ id: 85, name: 'Fruites i Verdures Rosa', category_id: 2, subcategory: 'Frutería', neighborhood: 'El Pedró', address: 'Carrer Nou, 15', phone: '611 300 305', rating: 4.5, review_count: 6, tags: ['Temporada'] }),
  B({ id: 62, name: 'Café Brisa', category_id: 3, subcategory: 'Bar y cafetería', neighborhood: 'Almeda', address: 'Passeig del Parc, 5', phone: '611 222 333', cover_photo: `${ST}/cafe.jpg`, rating: 4.7, review_count: 23, opening_hours: hours, tags: ['Terraza', 'Desayunos'] }),
  B({ id: 86, name: 'Bar La Plaça', category_id: 3, subcategory: 'Bar y cafetería', neighborhood: 'Centre-Riera', address: 'Plaça de l\'Església, 2', phone: '611 300 306', rating: 4.6, review_count: 27, opening_hours: hours, tags: ['Tapas', 'Fútbol en la tele'] }),
  B({ id: 87, name: 'Restaurant El Racó', category_id: 3, subcategory: 'Restaurante', neighborhood: 'Almeda', address: 'Carrer de Sant Ferran, 40', phone: '611 300 307', rating: 4.8, review_count: 41, opening_hours: hours, tags: ['Menú del día', 'Terraza'] }),
  B({ id: 88, name: 'Brasa i Vi', category_id: 3, subcategory: 'Restaurante', neighborhood: 'Fontsanta-Fatjó', address: 'Carrer de Bellavista, 3', phone: '611 300 308', rating: 4.5, review_count: 15, opening_hours: hours, tags: ['A la brasa'] }),
  B({ id: 63, name: 'Peluquería Rizos', category_id: 5, subcategory: 'Peluquería', neighborhood: 'Sant Ildefons', address: 'Carrer de les Flors, 14', phone: '622 444 555', cover_photo: `${ST}/pelu.jpg`, rating: 4.9, review_count: 18, tags: ['Cita previa', 'Color'] }),
  B({ id: 89, name: 'Perruqueria Anna', category_id: 5, subcategory: 'Peluquería', neighborhood: 'Centre-Riera', address: 'Carrer de Mossèn Jacint Verdaguer, 7', phone: '611 300 309', rating: 4.7, review_count: 12, tags: ['Mechas'] }),
  B({ id: 90, name: 'Estètica Lluna', category_id: 5, subcategory: 'Estética', neighborhood: 'Almeda', address: 'Carrer de Pablo Picasso, 10', phone: '611 300 310', rating: 4.9, review_count: 16, tags: ['Facial', 'Depilación'] }),
  B({ id: 91, name: 'Centre d\'Estètica Àgata', category_id: 5, subcategory: 'Estética', neighborhood: 'La Gavarra', address: 'Carrer de l\'Indústria, 21', phone: '611 300 311', rating: 4.6, review_count: 8, tags: ['Uñas', 'Masajes'] }),
  B({ id: 64, name: 'Fontanería Gota Clara', category_id: 1, subcategory: 'Fontanero', neighborhood: 'La Gavarra', address: 'Carrer del Riu, 30', phone: '633 666 777', cover_photo: `${ST}/fonta.jpg`, rating: 4.6, review_count: 14, tags: ['Urgencias', 'Presupuesto gratis'] }),
  B({ id: 65, name: 'Instal·lacions Nord', category_id: 1, subcategory: 'Fontanero', neighborhood: 'El Pedró', address: 'Carrer Nou, 7', phone: '644 888 999', cover_photo: `${ST}/nord.jpg`, rating: 4.4, review_count: 6, tags: ['Calefacción'] }),
  B({ id: 67, name: 'Pintures Llobregat', category_id: 1, subcategory: 'Pintor', neighborhood: 'Sant Ildefons', address: 'Av. de Sant Ildefons, 18', phone: '666 303 404', cover_photo: `${ST}/llob.jpg`, rating: 4.8, review_count: 14, tags: ['Presupuesto gratis'] }),
  B({ id: 69, name: 'Pintura i Color Almeda', category_id: 1, subcategory: 'Pintor', neighborhood: 'Almeda', address: 'Carrer de Prat de la Riba, 3', phone: '688 707 808', rating: 4.6, review_count: 4, tags: ['Pisos'] }),
  B({ id: 68, name: 'Decoracions Fontsanta', category_id: 1, subcategory: 'Pintor', neighborhood: 'Fontsanta-Fatjó', address: 'Carrer de Bellavista, 9', phone: '677 505 606', rating: 4.5, review_count: 6, tags: ['Papel pintado'] }),
  B({ id: 92, name: 'Neteges Brillant', category_id: 1, subcategory: 'Limpieza', neighborhood: 'Centre-Riera', address: 'Carrer d\'Enric Prat de la Riba, 50', phone: '611 300 312', rating: 4.8, review_count: 12, tags: ['Pisos', 'Fin de obra'] }),
  B({ id: 93, name: 'Llars Netes', category_id: 1, subcategory: 'Limpieza', neighborhood: 'Sant Ildefons', address: 'Carrer de Federico García Lorca, 2', phone: '611 300 313', rating: 4.6, review_count: 7, tags: ['Comunidades'] }),
  B({ id: 94, name: 'Electricitat Fatjó', category_id: 1, subcategory: 'Electricista', neighborhood: 'Fontsanta-Fatjó', address: 'Carrer de Fatjó, 6', phone: '611 300 314', rating: 4.7, review_count: 10, tags: ['Boletín'] }),
];
const dataset = () => ({ businesses: JSON.parse(JSON.stringify(businesses)), offers: [], jobs: [], reviews: [], notifications: [], favorites: [], offer_redemptions: [], budget_requests: [], job_applications: [] });

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--lang=es-ES'], env: { ...process.env, LANG: 'es_ES.UTF-8', LANGUAGE: 'es_ES:es', LC_ALL: 'es_ES.UTF-8' } });
  const ctx = await makeContext(b, { data: dataset(), rpc: {} });
  const p = await ctx.newPage();
  const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 92 }); console.log('✓', name); };
  const SUBS = [
    ['Alimentación', 't01-alimentacion', [['Carnicería', 't02-carniceria'], ['Pescadería', 't03-pescaderia'], ['Frutería', 't04-fruteria']]],
    ['Restauración', 't05-restauracion', [['Restaurante', 't06-restaurante'], ['Bar y cafetería', 't07-bares']]],
    ['Belleza', 't08-belleza', [['Peluquería', 't09-peluqueria'], ['Estética', 't10-estetica']]],
    ['Oficios', 't11-oficios', [['Pintor', 't12-pintor'], ['Fontanero', 't13-fontanero'], ['Limpieza', 't14-limpieza']]],
  ];
  for (const [cat, catShot, subs] of SUBS) {
    for (let i = 0; i < subs.length; i++) {
      await p.goto(BASE + '/', { waitUntil: 'networkidle' });
      await p.getByRole('button', { name: new RegExp(cat) }).first().click();
      await p.waitForTimeout(800);
      if (i === 0) await shot(catShot);
      await p.getByRole('button', { name: new RegExp('^' + subs[i][0]) }).first().click();
      await shot(subs[i][1]);
    }
  }
  await p.goto(BASE + '/?negocio=81', { waitUntil: 'networkidle' });
  await shot('t15-ficha-carniceria');
  await b.close();
})();
