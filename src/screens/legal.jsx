// Generado al dividir App.jsx: pantallas "legal" (se cargan bajo demanda con React.lazy)
import { ArrowLeft, ArrowRight, Check, ChevronDown, Shield, X } from 'lucide-react';
import { termsAndConditions } from '../data/mockData';
import { useState } from 'react';
import {
  Icon,
} from '../App.jsx';

// Pantalla de Términos y Condiciones
export const TermsScreen = ({ onNavigate, fromRegister = false }) => {
  const [expandedSection, setExpandedSection] = useState(1);

  const handleAccept = () => {
    if (fromRegister) {
      onNavigate('register');
    } else {
      onNavigate('settings');
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-white">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between bg-blue-50 px-5 py-4 border-b border-primary/10 backdrop-blur-md">
        <div className="w-10" />
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight text-center">
          Términos y Condiciones
        </h2>
        <button aria-label="Cerrar"
          onClick={() => fromRegister ? onNavigate('register') : onNavigate('settings')}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-900 hover:bg-black/5 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* Intro */}
        <div className="px-6 pt-6 pb-2">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider text-center mb-4">
            Última actualización: {termsAndConditions.lastUpdate}
          </p>
          <h3 className="text-slate-900 text-2xl font-bold leading-tight mb-3">
            Bienvenido a Cornellà Local
          </h3>
          <p className="text-gray-700 text-base font-normal leading-relaxed">
            Aquí te explicamos, en lenguaje claro, cómo funciona la plataforma, qué puedes esperar de nosotros y qué esperamos de ti y de los negocios. Toca cada apartado para leerlo.
          </p>
        </div>

        {/* Accordions */}
        <div className="flex flex-col px-4 py-4 gap-4">
          {termsAndConditions.sections.map(section => (
            <details
              key={section.id}
              className="group rounded-xl border border-gray-100 bg-white overflow-hidden transition-all duration-300 open:shadow-md"
              open={expandedSection === section.id}
              onClick={(e) => {
                e.preventDefault();
                setExpandedSection(expandedSection === section.id ? null : section.id);
              }}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 select-none hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                    <Icon name={section.icon} size={20} />
                  </div>
                  <p className="text-slate-900 text-base font-semibold leading-normal">{section.title}</p>
                </div>
                <ChevronDown className={`text-gray-500 transition-transform duration-300 ${
                  expandedSection === section.id ? 'rotate-180' : ''
                }`} size={20} />
              </summary>
              {expandedSection === section.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="pl-11">
                    <p className="text-gray-500 text-sm font-normal leading-relaxed">
                      {section.content}
                    </p>
                    {section.bullets && (
                      <ul className="mt-3 space-y-2">
                        {section.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </details>
          ))}

          <p className="text-xs text-center text-gray-500 px-8 pt-4 pb-2">
            Estos términos se completan con el Aviso legal, la Política de privacidad y la Política de cookies.
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 w-full max-w-md z-30 bg-white/90 backdrop-blur-xl border-t border-gray-100 pb-8 pt-4 px-6 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        <button
          onClick={handleAccept}
          className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 text-white shadow-lg shadow-primary/25"
        >
          <span className="text-base font-bold leading-normal tracking-wide mr-2">{fromRegister ? 'Volver al registro' : 'Entendido'}</span>
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

// Pantalla de Política de Privacidad
export const PrivacyPolicyScreen = ({ onNavigate }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  const privacySections = [
    {
      id: 1,
      icon: 'User',
      title: 'Quién es el responsable',
      content: 'Cornellà Local (cornellalocal.es) es un proyecto personal y sin ánimo de lucro para dar a conocer el comercio de Cornellà de Llobregat. El responsable de tus datos es una persona física, no una empresa:',
      bullets: [
        'Responsable: Carlos Taboada Valencia · NIF 46462083J',
        'Localidad: Cornellà de Llobregat (Barcelona)',
        'Contacto para todo lo relacionado con tus datos: cornellalocal@gmail.com (en castellano, catalán o inglés)',
        'No hay delegado de protección de datos: no es obligatorio para un proyecto de este tamaño.',
      ]
    },
    {
      id: 2,
      icon: 'FileText',
      title: 'Qué datos tratamos y para qué',
      content: 'Solo usamos lo necesario para que la app funcione. Para cada dato te explicamos para qué sirve y en qué se basa (art. 6 del RGPD):',
      bullets: [
        'Tu cuenta — email, nombre y foto de perfil (los tuyos o los de Google si entras con Google): para crear y gestionar tu cuenta. Base: el contrato de uso (art. 6.1.b).',
        'Lo que haces en la app — favoritos, reseñas, 🔥 a ofertas, cupones que pides y avisos: para darte el servicio. Base: contrato.',
        'Solicitudes de presupuesto — oficio, descripción, fotos, dirección, urgencia y teléfono: para que los negocios del oficio te den precio. Los negocios verificados de ese oficio ven la descripción, las fotos y la dirección; tu teléfono solo lo ve el negocio cuyo presupuesto aceptes. Base: medidas previas a un contrato que pides tú (art. 6.1.b).',
        'Candidaturas a empleos — nombre, email, teléfono, carta y CV: para enviarlas al negocio de la oferta. Desde que las recibe, ese negocio es responsable de tus datos para su proceso de selección. Base: medidas previas a un contrato que pides tú.',
        'Si tienes un negocio — los datos de la ficha (nombre, dirección, teléfono, horario, fotos...): para publicarla. La web la pedimos para la verificación, pero no se muestra. Base: contrato.',
        'Documentos de verificación (alta de autónomo o modelo 036/037, factura o recibo a nombre del negocio, licencia...): para comprobar que el negocio es tuyo y evitar suplantaciones. No hace falta el DNI; si lo envías, tapa la foto y el número de soporte. Base: interés legítimo en evitar fraudes (art. 6.1.f).',
        'Difusión en Instagram (@cornella_informa) — solo si marcas la casilla: para anunciar tu negocio con su nombre, categoría, barrio y foto de portada. Base: tu consentimiento (art. 6.1.a), que puedes retirar en Editar negocio; si nos lo pides, borraremos lo publicado.',
        'Notificaciones push — solo si las activas: guardamos la suscripción técnica de tu navegador para enviarte avisos. Base: consentimiento; las desactivas en Ajustes cuando quieras.',
        'Ubicación — solo si pulsas «Más cerca de ti»: se usa en tu móvil para ordenar los negocios por distancia; no se guarda ni nos llega.',
        'Denuncias y mensajes de soporte: para atenderte y moderar la plataforma. Base: interés legítimo y las obligaciones del Reglamento de Servicios Digitales.',
        'Estadísticas — visitas y clics en las fichas, para que cada negocio vea sus números: a los 90 días se quita a qué usuario corresponde cada dato. La analítica de Vercel solo se activa si aceptas en el aviso de cookies. Base: interés legítimo y, para la analítica, consentimiento.',
        'No vendemos tus datos, no hacemos publicidad personalizada ni tomamos decisiones automáticas con efectos sobre ti. El único filtro automático revisa las reseñas (insultos, spam, teléfonos o emails) y solo impide publicarlas: puedes reescribirla o escribirnos.',
      ]
    },
    {
      id: 3,
      icon: 'Clock',
      title: 'Cuánto tiempo los guardamos',
      content: 'Los guardamos solo mientras hacen falta. Cada noche un proceso automático borra lo que ya ha caducado:',
      bullets: [
        'Cuenta y todo su contenido: mientras la tengas. Si la borras en Ajustes, tus datos se eliminan de la app al momento; tus archivos (fotos, CV, documentos) desaparecen como mucho en 7 días, y la página pública de tu negocio, si tenías, como mucho al día siguiente.',
        'Documentos de verificación: 2 días después de aprobar el negocio. Si se rechaza y no se vuelve a enviar, a los 30 días.',
        'CV: 2 días después de que termine el proceso (te contraten, te descarten o se cierre la oferta) y, como máximo, a los 90 días.',
        'Candidaturas, solicitudes de presupuesto (con sus respuestas) y cupones: 12 meses.',
        'Avisos de la app: los leídos, a los 90 días; todos, a los 6 meses.',
        'Denuncias cerradas y mensajes de soporte: 12 meses.',
        'Altas de negocio que se quedan en borrador sin tocar: 6 meses.',
        'Estadísticas de visitas: anónimas a los 90 días; se borran a los 24 meses.',
        'Reseñas: mientras exista el negocio o hasta que las borres.',
        'Fotos que ya no se usan (por ejemplo, una portada que has cambiado): a los 7 días.',
        'Si una ley obliga a conservar algo más tiempo (por ejemplo, ante una reclamación), se guarda solo lo necesario y bloqueado.',
      ]
    },
    {
      id: 4,
      icon: 'Users',
      title: 'Quién más puede ver tus datos',
      content: 'No vendemos ni cedemos tus datos. Solo llegan a:',
      bullets: [
        'Los negocios con los que tú tratas: el de la oferta de empleo a la que te apuntas, los negocios verificados del oficio cuando pides presupuesto (sin tu teléfono hasta que aceptes) y el que valida tu cupón.',
        'Otros usuarios: tu nombre y tus reseñas se ven en la ficha del negocio. Tu perfil no es público.',
        'Supabase (base de datos, cuentas y sus emails, archivos y envío de avisos), con los datos en servidores de Frankfurt (UE).',
        'Vercel (alojamiento de la web y, si la aceptas, analítica).',
        'Google: inicio de sesión con Google y mapas, solo si los usas o los aceptas.',
        'El servicio de notificaciones de tu navegador (Google, Mozilla o Apple, según cuál uses), que recibe el aviso cifrado para entregarlo en tu dispositivo.',
        'Meta (Instagram): solo los datos del negocio que haya dado permiso para la difusión.',
        'Autoridades públicas: solo si una ley nos obliga.',
        'Supabase, Vercel, Google y Meta son empresas de EE. UU. Cuando los datos salen de la UE se aplican las garantías del RGPD (Marco de Privacidad de Datos UE‑EE. UU. o cláusulas contractuales tipo de la Comisión Europea).',
      ]
    },
    {
      id: 5,
      icon: 'Settings',
      title: 'Tus derechos y cómo ejercerlos',
      content: 'Puedes ejercerlos gratis y en cualquier momento. Lo más habitual lo haces tú mismo desde la app:',
      bullets: [
        'Acceso y portabilidad: Ajustes → «Descargar mis datos» te da un archivo con todo lo que guardamos de ti.',
        'Supresión: Ajustes → «Borrar mi cuenta» borra tu cuenta y tus datos (los archivos, en 7 días como máximo). Si tu cuenta está suspendida, pídelo por email y lo valoraremos.',
        'Rectificación: cambia tu nombre y tu foto en Editar perfil, y la ficha de tu negocio en Editar negocio.',
        'Retirar el consentimiento: Instagram (Editar negocio), notificaciones (Ajustes) y cookies (Ajustes → Preferencias de cookies). Retirarlo no afecta a lo que se hizo antes.',
        'Oposición y limitación: por ejemplo, a las estadísticas o a la revisión de documentos.',
        'Para lo demás, escribe a cornellalocal@gmail.com desde el email de tu cuenta. Solo te pediremos algún dato más para identificarte si hay dudas razonables. Respondemos en un mes como máximo.',
        'Si no estás conforme con nuestra respuesta, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).',
      ]
    },
    {
      id: 6,
      icon: 'Baby',
      title: 'Menores de edad',
      content: 'Cornellà Local es para personas de 14 años o más (art. 7 de la Ley Orgánica 3/2018). Al registrarte confirmas que tienes esa edad. Si sabemos que una cuenta es de alguien menor de 14 años, la borraremos.',
    },
    {
      id: 7,
      icon: 'Lock',
      title: 'Cómo protegemos tus datos',
      content: 'Aplicamos medidas razonables para un proyecto de este tamaño:',
      bullets: [
        'Conexión cifrada (HTTPS) en toda la web.',
        'Cada usuario solo puede leer y cambiar sus propios datos (reglas de seguridad en la base de datos).',
        'Los documentos de verificación y los CV están en un almacenamiento privado y solo se abren con enlaces temporales.',
        'Las contraseñas las guarda Supabase Auth de forma irreversible (hash): nadie, tampoco nosotros, puede verlas.',
        'Si hubiera una brecha de seguridad que te afecte, te avisaríamos y lo comunicaríamos a la AEPD en 72 horas cuando corresponda.',
      ]
    },
    {
      id: 8,
      icon: 'Cookie',
      title: 'Cookies',
      content: 'Solo usamos lo imprescindible para que la app funcione. La analítica y los mapas de Google solo se cargan si los aceptas, y la letra de la web está alojada en nuestro propio dominio (sin Google Fonts). Tienes todo el detalle en la Política de cookies.',
    },
    {
      id: 9,
      icon: 'Mail',
      title: 'Cambios en esta política',
      content: 'Si cambiamos algo importante, te avisaremos dentro de la app antes de que se aplique. Última actualización: 31 de octubre de 2026.',
    },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-white">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between bg-blue-50 px-5 py-4 border-b border-primary/10 backdrop-blur-md">
        <button aria-label="Volver"
          onClick={() => onNavigate('settings')}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-900 hover:bg-black/5 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight text-center">
          Política de Privacidad
        </h2>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-8">
        {/* Intro */}
        <div className="px-6 pt-6 pb-2">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider text-center mb-4">
            Última actualización: 31 de octubre de 2026
          </p>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Shield className="text-primary" size={32} />
            </div>
          </div>
          <h3 className="text-slate-900 text-xl font-bold leading-tight mb-3 text-center">
            Tu privacidad es importante
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed text-center">
            Te contamos qué datos usamos, para qué, cuánto tiempo los guardamos y cómo puedes descargarlos o borrarlos tú mismo desde Ajustes.
          </p>
        </div>

        {/* Accordions */}
        <div className="flex flex-col px-4 py-4 gap-3">
          {privacySections.map(section => (
            <details
              key={section.id}
              className="group rounded-xl border border-gray-100 bg-white overflow-hidden transition-all duration-300 open:shadow-md"
              open={expandedSection === section.id}
              onClick={(e) => {
                e.preventDefault();
                setExpandedSection(expandedSection === section.id ? null : section.id);
              }}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 select-none hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                    <Icon name={section.icon} size={20} />
                  </div>
                  <p className="text-slate-900 text-sm font-semibold leading-normal">{section.title}</p>
                </div>
                <ChevronDown className={`text-gray-500 transition-transform duration-300 ${
                  expandedSection === section.id ? 'rotate-180' : ''
                }`} size={20} />
              </summary>
              {expandedSection === section.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="pl-13">
                    <p className="text-gray-500 text-sm leading-relaxed mb-3">
                      {section.content}
                    </p>
                    {section.bullets && (
                      <ul className="space-y-2">
                        {section.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </details>
          ))}
        </div>
      </div>
    </div>
  );
};

// =============================================
// AVISO LEGAL (LSSI-CE Ley 34/2002)
// =============================================
export const LegalNoticeScreen = ({ onNavigate }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  const sections = [
    {
      id: 1,
      icon: 'User',
      title: 'Datos identificativos del titular',
      content: 'Datos del titular de Cornellà Local (artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico):',
      bullets: [
        'Titular: Carlos Taboada Valencia (persona física, no inscrita en el Registro Mercantil)',
        'NIF: 46462083J',
        'Localidad: Cornellà de Llobregat (Barcelona)',
        'Email: cornellalocal@gmail.com',
        'Sitio web: https://www.cornellalocal.es',
        'Naturaleza: proyecto personal, gratuito y sin ánimo de lucro para apoyar al comercio local.',
        'Punto de contacto para usuarios y autoridades (Reglamento (UE) 2022/2065 de Servicios Digitales): cornellalocal@gmail.com, en castellano, catalán o inglés.',
      ]
    },
    {
      id: 2,
      icon: 'FileText',
      title: 'Objeto y condiciones de uso',
      content: 'Cornellà Local es una plataforma que conecta a los vecinos de Cornellà de Llobregat con el comercio local: fichas de negocios, ofertas con cupón, solicitudes de presupuesto y ofertas de empleo.',
      bullets: [
        'El uso de la plataforma implica aceptar este Aviso legal, los Términos y condiciones y la Política de privacidad.',
        'El acceso y la publicación de negocios verificados son gratuitos.',
        'Las normas de uso, las condiciones para negocios y la moderación se explican en los Términos y condiciones.',
      ]
    },
    {
      id: 3,
      icon: 'Shield',
      title: 'Propiedad intelectual e industrial',
      content: 'Los contenidos propios del sitio (textos, diseño, código y logotipo) pertenecen a su titular o a terceros que han autorizado su uso.',
      bullets: [
        'No se permite su reproducción, distribución, comunicación pública o transformación sin autorización expresa.',
        'Las marcas, nombres comerciales, logos y fotos de los negocios pertenecen a cada negocio, que da permiso para mostrarlos en la plataforma mientras estén publicados.',
      ]
    },
    {
      id: 4,
      icon: 'AlertTriangle',
      title: 'Responsabilidad',
      content: 'El titular actúa como intermediario: aloja la información que publican vecinos y negocios y no es parte de los acuerdos que hagan entre ellos.',
      bullets: [
        'No garantiza que la información publicada por los negocios sea exacta, aunque comprueba que cada negocio pertenece a quien lo da de alta.',
        'Las relaciones comerciales (presupuestos, contrataciones, compras) son solo entre el usuario y el negocio, al que deben dirigirse las reclamaciones.',
        'Cuando tenga conocimiento efectivo de que un contenido es ilícito, lo retirará con diligencia (art. 16 LSSI-CE). Puedes avisar con el botón «Reportar problema» o por email.',
        'No responde de los daños causados por un mal uso del servicio ni de interrupciones por mantenimiento, fallos técnicos de proveedores o causas ajenas.',
      ]
    },
    {
      id: 5,
      icon: 'Globe',
      title: 'Enlaces a terceros',
      content: 'La plataforma puede incluir enlaces a sitios de terceros (redes sociales de los negocios, mapas, WhatsApp...). El titular no responde de su contenido ni de cómo tratan los datos.',
      bullets: [
        'Incluir un enlace no supone ninguna relación, recomendación ni respaldo.',
      ]
    },
    {
      id: 6,
      icon: 'Scale',
      title: 'Legislación y jurisdicción',
      content: 'Este sitio se rige por la legislación española.',
      bullets: [
        'Si eres consumidor, serán competentes los juzgados de tu domicilio (art. 90.2 del texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios).',
        'Si no eres consumidor, los juzgados de Barcelona.',
      ]
    },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-white">
      <div className="sticky top-0 z-20 flex items-center justify-between bg-blue-50 px-5 py-4 border-b border-primary/10 backdrop-blur-md">
        <button aria-label="Volver"
          onClick={() => onNavigate('settings')}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-900 hover:bg-black/5 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight text-center">Aviso Legal</h2>
        <div className="w-10" />
      </div>
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="px-6 pt-6 pb-2">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider text-center mb-4">
            Última actualización: 31 de octubre de 2026
          </p>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Icon name="FileText" size={32} className="text-primary" />
            </div>
          </div>
          <h3 className="text-slate-900 text-xl font-bold leading-tight mb-3 text-center">
            Aviso Legal
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed text-center">
            Información obligatoria conforme a la Ley 34/2002 (LSSI-CE).
          </p>
        </div>
        <div className="flex flex-col px-4 py-4 gap-3">
          {sections.map(section => (
            <details
              key={section.id}
              className="group rounded-xl border border-gray-100 bg-white overflow-hidden transition-all duration-300 open:shadow-md"
              open={expandedSection === section.id}
              onClick={(e) => {
                e.preventDefault();
                setExpandedSection(expandedSection === section.id ? null : section.id);
              }}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 select-none hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                    <Icon name={section.icon} size={20} />
                  </div>
                  <p className="text-slate-900 text-sm font-semibold leading-normal">{section.title}</p>
                </div>
                <ChevronDown className={`text-gray-500 transition-transform duration-300 ${expandedSection === section.id ? 'rotate-180' : ''}`} size={20} />
              </summary>
              {expandedSection === section.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="pl-13">
                    <p className="text-gray-500 text-sm leading-relaxed mb-3">{section.content}</p>
                    {section.bullets && (
                      <ul className="space-y-2">
                        {section.bullets.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </details>
          ))}
        </div>
      </div>
    </div>
  );
};

// =============================================
// POLÍTICA DE COOKIES
// =============================================
export const CookiesPolicyScreen = ({ onNavigate, showToast }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  const resetConsent = () => {
    try { localStorage.removeItem('cookie-consent'); } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new Event('cookie-consent-changed'));
    if (showToast) showToast('Elige de nuevo en el aviso de cookies de abajo', 'info');
  };

  const sections = [
    {
      id: 1,
      icon: 'Info',
      title: '¿Qué son las cookies?',
      content: 'Son pequeños archivos que una web guarda en tu navegador para recordar información, como que has iniciado sesión. Junto a ellas existen tecnologías parecidas, como el almacenamiento local del navegador (localStorage), que también te explicamos aquí.',
      bullets: [
        'Propias: las pone Cornellà Local.',
        'De terceros: las ponen servicios externos integrados, como Google Maps o el inicio de sesión con Google.',
      ]
    },
    {
      id: 2,
      icon: 'Shield',
      title: 'Qué usamos exactamente',
      content: 'Usamos lo mínimo. Lo imprescindible no necesita tu permiso; lo demás solo se activa si lo aceptas:',
      bullets: [
        'Imprescindible — sesión: Supabase guarda en el almacenamiento local de tu navegador el identificador de tu sesión para que no tengas que entrar cada vez.',
        'Imprescindible — preferencias: tu elección sobre cookies, las búsquedas recientes, si has visto la bienvenida, si has desactivado las notificaciones y el aviso de instalar la app. Todo se queda en tu navegador.',
        'Solo si aceptas — analítica de Vercel: cuenta visitas de forma anónima y sin cookies. Aun así, solo se activa con «Aceptar todas».',
        'Solo si aceptas — Google Maps: el mapa de cada negocio instala cookies de Google. Se carga si pulsas «Aceptar todas» o si tocas «Mostrar mapa» en esa ficha.',
        'Si usas el inicio de sesión con Google, Google usa sus propias cookies en su página durante el acceso.',
        'Notificaciones push: no usan cookies. Si las activas, el servicio de avisos de tu navegador (Google, Mozilla o Apple) recibe el aviso cifrado para entregarlo.',
        'La letra de la web está alojada en nuestro dominio: no usamos Google Fonts ni publicidad.',
      ]
    },
    {
      id: 3,
      icon: 'Settings',
      title: 'Cómo cambiar tu elección',
      content: 'Puedes cambiar de opinión cuando quieras, igual de fácil que al aceptar:',
      bullets: [
        'En Ajustes → «Preferencias de cookies», o con el botón al final de esta página: vuelve a salir el aviso para que elijas.',
        'En la configuración de tu navegador también puedes borrar o bloquear las cookies y el almacenamiento local (si borras la sesión, tendrás que volver a entrar).',
        'Si rechazas, la app funciona igual; los mapas se cargan solo cuando tú lo pidas.',
      ]
    },
    {
      id: 4,
      icon: 'Globe',
      title: 'Políticas de los terceros',
      content: 'Puedes consultar cómo tratan los datos los servicios externos:',
      bullets: [
        'Google (Maps e inicio de sesión): https://policies.google.com/privacy',
        'Vercel (alojamiento y analítica): https://vercel.com/legal/privacy-policy',
        'Supabase (base de datos y sesión): https://supabase.com/privacy',
      ]
    },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-white">
      <div className="sticky top-0 z-20 flex items-center justify-between bg-blue-50 px-5 py-4 border-b border-primary/10 backdrop-blur-md">
        <button aria-label="Volver"
          onClick={() => onNavigate('settings')}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-900 hover:bg-black/5 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight text-center">Política de Cookies</h2>
        <div className="w-10" />
      </div>
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="px-6 pt-6 pb-2">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider text-center mb-4">
            Última actualización: 31 de octubre de 2026
          </p>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Icon name="Cookie" size={32} className="text-primary" />
            </div>
          </div>
          <h3 className="text-slate-900 text-xl font-bold leading-tight mb-3 text-center">
            Política de Cookies
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed text-center">
            Qué guardamos en tu navegador, para qué y cómo cambiar tu elección.
          </p>
        </div>
        <div className="flex flex-col px-4 py-4 gap-3">
          {sections.map(section => (
            <details
              key={section.id}
              className="group rounded-xl border border-gray-100 bg-white overflow-hidden transition-all duration-300 open:shadow-md"
              open={expandedSection === section.id}
              onClick={(e) => {
                e.preventDefault();
                setExpandedSection(expandedSection === section.id ? null : section.id);
              }}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 select-none hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                    <Icon name={section.icon} size={20} />
                  </div>
                  <p className="text-slate-900 text-sm font-semibold leading-normal">{section.title}</p>
                </div>
                <ChevronDown className={`text-gray-500 transition-transform duration-300 ${expandedSection === section.id ? 'rotate-180' : ''}`} size={20} />
              </summary>
              {expandedSection === section.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="pl-13">
                    <p className="text-gray-500 text-sm leading-relaxed mb-3">{section.content}</p>
                    {section.bullets && (
                      <ul className="space-y-2">
                        {section.bullets.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </details>
          ))}
        </div>
        <div className="px-6 mt-6">
          <button
            onClick={resetConsent}
            className="w-full h-12 bg-gray-100 text-slate-700 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm"
          >
            Cambiar mi elección de cookies
          </button>
        </div>
      </div>
    </div>
  );
};

