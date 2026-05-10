import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readLocalEnv = () => {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};

  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const [key, ...valueParts] = line.split('=');
        return [key, valueParts.join('=').replace(/^["']|["']$/g, '')];
      })
  );
};

const localEnv = readLocalEnv();
const supabaseUrl = process.env.VITE_SUPABASE_URL || localEnv.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env o variables de entorno.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const businesses = [
  {
    owner_id: 'd1cc1a18-c216-4831-b17c-921254edbfcb',
    name: 'Café del Barrio',
    description: 'Cafetería acogedora con especialidades de café artesanal, repostería casera y desayunos completos. WiFi gratis y terraza.',
    address: 'Carrer de Sant Ildefons, 45, Cornellà de Llobregat',
    phone: '936 377 100',
    website: 'https://cafedelbarrio.example.com',
    category_id: 3,
    subcategory: 'Cafetería',
    tags: ['café', 'desayunos', 'wifi', 'terraza'],
    latitude: 41.3569,
    longitude: 2.0742,
    opening_hours: {
      monday: { enabled: true, morning: { start: '07:00', end: '13:00' }, afternoon: { start: '16:00', end: '20:00' } },
      tuesday: { enabled: true, morning: { start: '07:00', end: '13:00' }, afternoon: { start: '16:00', end: '20:00' } },
      wednesday: { enabled: true, morning: { start: '07:00', end: '13:00' }, afternoon: { start: '16:00', end: '20:00' } },
      thursday: { enabled: true, morning: { start: '07:00', end: '13:00' }, afternoon: { start: '16:00', end: '20:00' } },
      friday: { enabled: true, morning: { start: '07:00', end: '13:00' }, afternoon: { start: '16:00', end: '20:00' } },
      saturday: { enabled: true, morning: { start: '08:00', end: '14:00' }, afternoon: { start: '17:00', end: '21:00' } },
      sunday: { enabled: false }
    },
    special_closures: null,
    is_verified: true,
    verification_status: 'approved',
    verified_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.5,
    review_count: 28
  },
  {
    owner_id: 'd1cc1a18-c216-4831-b17c-921254edbfcb',
    name: 'Pizzeria Bella Napoli',
    description: 'Auténtica pizza napolitana con horno de leña. Masa madre artesanal e ingredientes italianos importados. Delivery disponible.',
    address: 'Avinguda de Can Boixeres, 12, Cornellà de Llobregat',
    phone: '933 775 234',
    website: null,
    category_id: 3,
    subcategory: 'Restaurante',
    tags: ['pizza', 'italiano', 'delivery', 'terraza'],
    latitude: 41.3601,
    longitude: 2.0789,
    opening_hours: {
      monday: { enabled: false },
      tuesday: { enabled: true, morning: { start: '', end: '' }, afternoon: { start: '13:00', end: '16:00' } },
      wednesday: { enabled: true, morning: { start: '', end: '' }, afternoon: { start: '13:00', end: '16:00' } },
      thursday: { enabled: true, morning: { start: '', end: '' }, afternoon: { start: '13:00', end: '16:00' } },
      friday: { enabled: true, morning: { start: '', end: '' }, afternoon: { start: '13:00', end: '23:00' } },
      saturday: { enabled: true, morning: { start: '', end: '' }, afternoon: { start: '13:00', end: '23:00' } },
      sunday: { enabled: true, morning: { start: '', end: '' }, afternoon: { start: '13:00', end: '16:00' } }
    },
    special_closures: [{ date: '2026-02-06', name: 'Vacaciones personal' }],
    is_verified: true,
    verification_status: 'approved',
    verified_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.7,
    review_count: 42
  },
  {
    owner_id: 'd1cc1a18-c216-4831-b17c-921254edbfcb',
    name: 'El Rincón de Pepe',
    description: 'Bar tradicional de tapas y raciones. Especialidad en jamón ibérico, tortilla española y croquetas caseras.',
    address: 'Carrer de Rubió i Ors, 23, Cornellà de Llobregat',
    phone: '933 771 890',
    website: null,
    category_id: 3,
    subcategory: 'Bar',
    tags: ['tapas', 'jamón', 'vino', 'tradicional'],
    latitude: 41.3545,
    longitude: 2.0701,
    opening_hours: {
      monday: { enabled: true, morning: { start: '08:00', end: '12:00' }, afternoon: { start: '18:00', end: '23:00' } },
      tuesday: { enabled: true, morning: { start: '08:00', end: '12:00' }, afternoon: { start: '18:00', end: '23:00' } },
      wednesday: { enabled: true, morning: { start: '08:00', end: '12:00' }, afternoon: { start: '18:00', end: '23:00' } },
      thursday: { enabled: true, morning: { start: '08:00', end: '12:00' }, afternoon: { start: '18:00', end: '23:00' } },
      friday: { enabled: true, morning: { start: '08:00', end: '12:00' }, afternoon: { start: '18:00', end: '01:00' } },
      saturday: { enabled: true, morning: { start: '', end: '' }, afternoon: { start: '18:00', end: '01:00' } },
      sunday: { enabled: false }
    },
    special_closures: null,
    is_verified: true,
    verification_status: 'approved',
    verified_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.3,
    review_count: 67
  },
  {
    owner_id: 'd1cc1a18-c216-4831-b17c-921254edbfcb',
    name: 'Panadería Artesana Cal Miquel',
    description: 'Panadería artesanal con más de 30 años de tradición. Pan de masa madre, bollería casera y pastelería por encargo.',
    address: 'Carrer de Laureà Miró, 78, Cornellà de Llobregat',
    phone: '933 774 567',
    website: null,
    category_id: 2,
    subcategory: 'Panadería',
    tags: ['pan', 'bollería', 'artesanal', 'local'],
    latitude: 41.3578,
    longitude: 2.0735,
    opening_hours: {
      monday: { enabled: true, morning: { start: '07:30', end: '14:00' }, afternoon: { start: '17:00', end: '20:30' } },
      tuesday: { enabled: true, morning: { start: '07:30', end: '14:00' }, afternoon: { start: '17:00', end: '20:30' } },
      wednesday: { enabled: true, morning: { start: '07:30', end: '14:00' }, afternoon: { start: '17:00', end: '20:30' } },
      thursday: { enabled: true, morning: { start: '07:30', end: '14:00' }, afternoon: { start: '17:00', end: '20:30' } },
      friday: { enabled: true, morning: { start: '07:30', end: '14:00' }, afternoon: { start: '17:00', end: '20:30' } },
      saturday: { enabled: true, morning: { start: '08:00', end: '14:30' }, afternoon: { start: '', end: '' } },
      sunday: { enabled: true, morning: { start: '08:00', end: '14:00' }, afternoon: { start: '', end: '' } }
    },
    special_closures: null,
    is_verified: true,
    verification_status: 'approved',
    verified_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.8,
    review_count: 95
  },
  {
    owner_id: 'd1cc1a18-c216-4831-b17c-921254edbfcb',
    name: 'Librería Pages',
    description: 'Librería independiente con amplio catálogo, zona infantil y club de lectura mensual. También papelería y regalos.',
    address: 'Plaça de l\'Església, 5, Cornellà de Llobregat',
    phone: '936 393 456',
    website: 'https://libreriapages.example.com',
    category_id: 2,
    subcategory: 'Librería',
    tags: ['libros', 'papelería', 'regalos', 'infantil'],
    latitude: 41.3590,
    longitude: 2.0750,
    opening_hours: {
      monday: { enabled: true, morning: { start: '09:30', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      tuesday: { enabled: true, morning: { start: '09:30', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      wednesday: { enabled: true, morning: { start: '09:30', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      thursday: { enabled: true, morning: { start: '09:30', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      friday: { enabled: true, morning: { start: '09:30', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      saturday: { enabled: true, morning: { start: '10:00', end: '14:00' }, afternoon: { start: '17:00', end: '20:30' } },
      sunday: { enabled: false }
    },
    special_closures: null,
    is_verified: true,
    verification_status: 'approved',
    verified_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.6,
    review_count: 34
  },
  {
    owner_id: 'd1cc1a18-c216-4831-b17c-921254edbfcb',
    name: 'Floristería Rosa & Lila',
    description: 'Floristería con flores frescas diarias, arreglos florales personalizados y plantas de interior. Servicio a domicilio.',
    address: 'Carrer de Mossèn Jacint Verdaguer, 34, Cornellà de Llobregat',
    phone: '933 770 234',
    website: null,
    category_id: 2,
    subcategory: 'Floristería',
    tags: ['flores', 'plantas', 'ramos', 'delivery'],
    latitude: 41.3558,
    longitude: 2.0728,
    opening_hours: {
      monday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      tuesday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      wednesday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      thursday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      friday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      saturday: { enabled: true, morning: { start: '09:00', end: '14:00' }, afternoon: { start: '', end: '' } },
      sunday: { enabled: false }
    },
    special_closures: [{ date: '2026-02-14', name: 'San Valentín - Solo mañana' }],
    is_verified: true,
    verification_status: 'approved',
    verified_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.4,
    review_count: 18
  },
  {
    owner_id: 'd1cc1a18-c216-4831-b17c-921254edbfcb',
    name: 'Salón Style & Cut',
    description: 'Salón de peluquería unisex. Cortes modernos, coloración, mechas y tratamientos capilares. Pide cita previa.',
    address: 'Avinguda de Sant Ildefons, 156, Cornellà de Llobregat',
    phone: '933 782 345',
    website: null,
    category_id: 4,
    subcategory: 'Peluquería',
    tags: ['peluquería', 'coloración', 'tratamientos', 'unisex'],
    latitude: 41.3612,
    longitude: 2.0695,
    opening_hours: {
      monday: { enabled: false },
      tuesday: { enabled: true, morning: { start: '09:30', end: '13:00' }, afternoon: { start: '16:00', end: '20:00' } },
      wednesday: { enabled: true, morning: { start: '09:30', end: '13:00' }, afternoon: { start: '16:00', end: '20:00' } },
      thursday: { enabled: true, morning: { start: '09:30', end: '13:00' }, afternoon: { start: '16:00', end: '20:00' } },
      friday: { enabled: true, morning: { start: '09:30', end: '13:00' }, afternoon: { start: '16:00', end: '20:00' } },
      saturday: { enabled: true, morning: { start: '09:00', end: '14:00' }, afternoon: { start: '', end: '' } },
      sunday: { enabled: false }
    },
    special_closures: null,
    is_verified: true,
    verification_status: 'approved',
    verified_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.7,
    review_count: 52
  },
  {
    owner_id: 'd1cc1a18-c216-4831-b17c-921254edbfcb',
    name: 'Taller AutoCornellà',
    description: 'Taller mecánico multimarca. Revisiones, ITV, neumáticos y reparaciones en general. Presupuesto sin compromiso.',
    address: 'Carrer de la Fontsanta, 89, Cornellà de Llobregat',
    phone: '933 765 432',
    website: 'https://autocornella.example.com',
    category_id: 4,
    subcategory: 'Taller Mecánico',
    tags: ['mecánica', 'ITV', 'neumáticos', 'revisión'],
    latitude: 41.3524,
    longitude: 2.0698,
    opening_hours: {
      monday: { enabled: true, morning: { start: '08:00', end: '13:00' }, afternoon: { start: '15:00', end: '19:00' } },
      tuesday: { enabled: true, morning: { start: '08:00', end: '13:00' }, afternoon: { start: '15:00', end: '19:00' } },
      wednesday: { enabled: true, morning: { start: '08:00', end: '13:00' }, afternoon: { start: '15:00', end: '19:00' } },
      thursday: { enabled: true, morning: { start: '08:00', end: '13:00' }, afternoon: { start: '15:00', end: '19:00' } },
      friday: { enabled: true, morning: { start: '08:00', end: '13:00' }, afternoon: { start: '15:00', end: '19:00' } },
      saturday: { enabled: true, morning: { start: '08:30', end: '13:00' }, afternoon: { start: '', end: '' } },
      sunday: { enabled: false }
    },
    special_closures: null,
    is_verified: true,
    verification_status: 'approved',
    verified_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.5,
    review_count: 73
  },
  {
    owner_id: 'd1cc1a18-c216-4831-b17c-921254edbfcb',
    name: 'FitZone Cornellà',
    description: 'Centro deportivo con sala de musculación, clases dirigidas, spinning y entrenadores personales. Primera clase gratis.',
    address: 'Carrer del Progrés, 45, Cornellà de Llobregat',
    phone: '936 391 234',
    website: 'https://fitzonecornella.example.com',
    category_id: 5,
    subcategory: 'Gimnasio',
    tags: ['fitness', 'musculación', 'spinning', 'yoga'],
    latitude: 41.3595,
    longitude: 2.0715,
    opening_hours: {
      monday: { enabled: true, morning: { start: '07:00', end: '22:00' }, afternoon: { start: '', end: '' } },
      tuesday: { enabled: true, morning: { start: '07:00', end: '22:00' }, afternoon: { start: '', end: '' } },
      wednesday: { enabled: true, morning: { start: '07:00', end: '22:00' }, afternoon: { start: '', end: '' } },
      thursday: { enabled: true, morning: { start: '07:00', end: '22:00' }, afternoon: { start: '', end: '' } },
      friday: { enabled: true, morning: { start: '07:00', end: '22:00' }, afternoon: { start: '', end: '' } },
      saturday: { enabled: true, morning: { start: '09:00', end: '14:00' }, afternoon: { start: '17:00', end: '20:00' } },
      sunday: { enabled: true, morning: { start: '09:00', end: '14:00' }, afternoon: { start: '', end: '' } }
    },
    special_closures: [{ date: '2026-02-10', name: 'Mantenimiento equipos' }],
    is_verified: true,
    verification_status: 'approved',
    verified_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.6,
    review_count: 89
  },
  {
    owner_id: 'd1cc1a18-c216-4831-b17c-921254edbfcb',
    name: 'Farmàcia Vila',
    description: 'Farmacia de guardia con servicio de análisis, medición de tensión y asesoramiento farmacéutico. Ortopedia disponible.',
    address: 'Plaça dels Països Catalans, 2, Cornellà de Llobregat',
    phone: '933 771 123',
    website: null,
    category_id: 4,
    subcategory: 'Farmacia',
    tags: ['farmacia', 'análisis', 'ortopedia', 'guardia'],
    latitude: 41.3580,
    longitude: 2.0755,
    opening_hours: {
      monday: { enabled: true, morning: { start: '09:00', end: '21:00' }, afternoon: { start: '', end: '' } },
      tuesday: { enabled: true, morning: { start: '09:00', end: '21:00' }, afternoon: { start: '', end: '' } },
      wednesday: { enabled: true, morning: { start: '09:00', end: '21:00' }, afternoon: { start: '', end: '' } },
      thursday: { enabled: true, morning: { start: '09:00', end: '21:00' }, afternoon: { start: '', end: '' } },
      friday: { enabled: true, morning: { start: '09:00', end: '21:00' }, afternoon: { start: '', end: '' } },
      saturday: { enabled: true, morning: { start: '09:30', end: '14:00' }, afternoon: { start: '', end: '' } },
      sunday: { enabled: false }
    },
    special_closures: null,
    is_verified: true,
    verification_status: 'approved',
    verified_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.9,
    review_count: 124
  },
  {
    owner_id: 'd1cc1a18-c216-4831-b17c-921254edbfcb',
    name: 'Moda & Tendencias',
    description: 'Boutique de moda femenina con las últimas tendencias. Ropa, complementos y accesorios de marcas europeas.',
    address: 'Carrer de Sant Ferran, 67, Cornellà de Llobregat',
    phone: '933 778 901',
    website: null,
    category_id: 1,
    subcategory: 'Moda Mujer',
    tags: ['ropa', 'complementos', 'moda', 'tendencias'],
    latitude: 41.3562,
    longitude: 2.0720,
    opening_hours: {
      monday: { enabled: true, morning: { start: '10:00', end: '13:30' }, afternoon: { start: '17:00', end: '20:30' } },
      tuesday: { enabled: true, morning: { start: '10:00', end: '13:30' }, afternoon: { start: '17:00', end: '20:30' } },
      wednesday: { enabled: true, morning: { start: '10:00', end: '13:30' }, afternoon: { start: '17:00', end: '20:30' } },
      thursday: { enabled: true, morning: { start: '10:00', end: '13:30' }, afternoon: { start: '17:00', end: '20:30' } },
      friday: { enabled: true, morning: { start: '10:00', end: '13:30' }, afternoon: { start: '17:00', end: '20:30' } },
      saturday: { enabled: true, morning: { start: '10:00', end: '14:00' }, afternoon: { start: '17:00', end: '21:00' } },
      sunday: { enabled: false }
    },
    special_closures: [
      { date: '2026-02-03', name: 'Inventario anual' },
      { date: '2026-02-04', name: 'Inventario anual' }
    ],
    is_verified: true,
    verification_status: 'approved',
    verified_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.2,
    review_count: 31
  },
  {
    owner_id: 'd1cc1a18-c216-4831-b17c-921254edbfcb',
    name: 'Calzados Martínez',
    description: 'Zapatería familiar con calzado de calidad para toda la familia. Marcas reconocidas y asesoramiento personalizado.',
    address: 'Avinguda de Salvador Allende, 34, Cornellà de Llobregat',
    phone: '933 773 567',
    website: null,
    category_id: 1,
    subcategory: 'Calzado',
    tags: ['zapatos', 'deportivas', 'infantil', 'marcas'],
    latitude: 41.3540,
    longitude: 2.0710,
    opening_hours: {
      monday: { enabled: true, morning: { start: '09:30', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      tuesday: { enabled: true, morning: { start: '09:30', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      wednesday: { enabled: true, morning: { start: '09:30', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      thursday: { enabled: true, morning: { start: '09:30', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      friday: { enabled: true, morning: { start: '09:30', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      saturday: { enabled: true, morning: { start: '10:00', end: '14:00' }, afternoon: { start: '17:00', end: '20:30' } },
      sunday: { enabled: false }
    },
    special_closures: null,
    is_verified: true,
    verification_status: 'approved',
    verified_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.4,
    review_count: 46
  }
];

async function seedBusinesses() {
  console.log('🚀 Iniciando inserción de negocios de ejemplo...\n');

  let successCount = 0;
  const businessesWithClosures = [];

  for (let i = 0; i < businesses.length; i++) {
    const business = businesses[i];
    console.log(`[${i + 1}/${businesses.length}] Insertando: ${business.name}...`);

    // Guardar special_closures para actualizar después
    const specialClosures = business.special_closures;

    // Intentar insertar sin special_closures primero
    const businessWithoutClosures = { ...business };
    delete businessWithoutClosures.special_closures;

    const { data, error } = await supabase
      .from('businesses')
      .insert(businessWithoutClosures)
      .select();

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Insertado correctamente (ID: ${data[0].id})`);
      successCount++;

      // Si tenía special_closures, guardarlo para actualizar después
      if (specialClosures) {
        businessesWithClosures.push({
          id: data[0].id,
          name: business.name,
          closures: specialClosures
        });
      }
    }
  }

  console.log('\n✨ Proceso completado!');
  console.log(`📊 Total insertados: ${successCount}/${businesses.length} negocios`);

  if (businessesWithClosures.length > 0) {
    console.log(`\n⚠️  ${businessesWithClosures.length} negocios tienen días especiales de cierre pendientes.`);
    console.log('   Para añadirlos, primero ejecuta en Supabase SQL Editor:');
    console.log('   ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS special_closures jsonb;');
    console.log('\n   Luego ejecuta estos UPDATEs:');
    businessesWithClosures.forEach(b => {
      console.log(`   UPDATE businesses SET special_closures = '${JSON.stringify(b.closures)}'::jsonb WHERE id = '${b.id}'; -- ${b.name}`);
    });
  }

  console.log('\n💡 Para verificar:');
  console.log('   SELECT name, category_id, is_verified FROM businesses;');
  console.log('\n⚠️  Para eliminar antes del lanzamiento:');
  console.log('   DELETE FROM businesses WHERE owner_id = \'d1cc1a18-c216-4831-b17c-921254edbfcb\';');
}

seedBusinesses();
