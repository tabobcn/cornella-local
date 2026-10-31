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
            Gracias por confiar en nosotros. Le rogamos que lea atentamente los siguientes términos antes de utilizar nuestros servicios para garantizar una experiencia segura y transparente. Su privacidad y seguridad son nuestra prioridad.
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
            Al continuar, confirma que ha leído y acepta nuestros términos de servicio y política de privacidad.
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 w-full max-w-md z-30 bg-white/90 backdrop-blur-xl border-t border-gray-100 pb-8 pt-4 px-6 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        <button
          onClick={handleAccept}
          className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 text-white shadow-lg shadow-primary/25"
        >
          <span className="text-base font-bold leading-normal tracking-wide mr-2">Aceptar y continuar</span>
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
      title: 'Responsable del tratamiento',
      content: 'CornellaLocal es un proyecto personal sin ánimo de lucro creado para apoyar al comercio local de Cornellà de Llobregat. El responsable del tratamiento de los datos es una persona física, no una empresa.',
      bullets: [
        'Responsable: Carlos Taboada Valencia',
        'NIF: 46462083J',
        'Localidad: Cornellà de Llobregat (Barcelona)',
        'Email de contacto en materia de privacidad: cornellalocal@gmail.com',
        'Web: https://www.cornellalocal.es'
      ]
    },
    {
      id: 2,
      icon: 'FileText',
      title: 'Datos que tratamos y finalidad',
      content: 'Tratamos únicamente los datos imprescindibles para que la aplicación funcione. Cada dato tiene una finalidad concreta y una base jurídica conforme al artículo 6 del RGPD.',
      bullets: [
        'Email, nombre y avatar (de tu cuenta o tu proveedor OAuth como Google) — para crear y gestionar tu cuenta. Base: ejecución de contrato (art. 6.1.b RGPD).',
        'Teléfono — solo si lo proporcionas al solicitar un presupuesto, para que el negocio que aceptes pueda contactarte. Base: ejecución de contrato.',
        'Reseñas, favoritos, candidaturas y solicitudes de presupuesto — para prestar el servicio. Base: ejecución de contrato.',
        'Documentos acreditativos del negocio (si registras un comercio) — para verificar la titularidad. Base: interés legítimo (art. 6.1.f RGPD).',
        'Datos de uso anonimizados (visitas, dispositivo, país) vía Vercel Analytics, que no usa cookies. Por prudencia, CornellaLocal activa Vercel Analytics únicamente si aceptas todas las cookies/preferencias en el banner. Base: consentimiento (art. 6.1.a RGPD).',
        'No realizamos perfilados ni decisiones automatizadas con efectos jurídicos.'
      ]
    },
    {
      id: 3,
      icon: 'Shield',
      title: 'Seguridad y plazos de conservación',
      content: 'Aplicamos medidas técnicas y organizativas razonables para una aplicación de este tamaño. Los datos se conservan únicamente el tiempo necesario para cumplir su finalidad.',
      bullets: [
        'Comunicaciones cifradas con TLS / HTTPS',
        'Almacenamiento en Supabase (UE) con políticas de Row Level Security activadas en todas las tablas',
        'Cuenta de usuario: mientras la mantengas activa. Tras la baja se elimina en 30 días, salvo obligación legal de conservar (p. ej. facturación si la hubiera).',
        'Documentos de verificación de negocio: máximo 30 días tras la aprobación o rechazo definitivo.',
        'Reseñas y comentarios: mientras el negocio reseñado esté activo o hasta que solicites su supresión.',
        'Logs técnicos (errores, accesos): hasta 90 días.'
      ]
    },
    {
      id: 4,
      icon: 'Users',
      title: 'Destinatarios y encargados de tratamiento',
      content: 'CornellaLocal no vende ni cede tus datos a terceros con fines comerciales. Sí los comparte con los proveedores tecnológicos imprescindibles para que la aplicación funcione, todos ellos con sus propias políticas de privacidad RGPD.',
      bullets: [
        'Supabase (Supabase Inc., con servidores EU) — base de datos, autenticación y almacenamiento.',
        'Vercel (Vercel Inc., USA) — alojamiento web. Transferencia internacional amparada en cláusulas contractuales tipo de la Comisión Europea.',
        'Resend (Resend Inc., USA) — envío de notificaciones por email cuando aplica. Misma garantía contractual.',
        'Google (Maps, OAuth, Push notifications vía FCM) — solo si interactúas con esos componentes.',
        'Negocios locales — únicamente cuando tú decides solicitarles un presupuesto o aplicar a una oferta de empleo. Solo los datos que tú facilitas en esa interacción.',
        'Autoridades públicas — únicamente cuando exista una obligación legal.'
      ]
    },
    {
      id: 5,
      icon: 'Settings',
      title: 'Tus derechos (RGPD / LOPDGDD)',
      content: 'Conforme al Reglamento (UE) 2016/679 y a la Ley Orgánica 3/2018, en cualquier momento puedes ejercer los siguientes derechos sobre tus datos personales de forma gratuita.',
      bullets: [
        'Acceso: saber qué datos tuyos tratamos.',
        'Rectificación: corregir datos inexactos.',
        'Supresión ("derecho al olvido"): borrar tus datos cuando ya no sean necesarios.',
        'Oposición: oponerte a un tratamiento basado en interés legítimo.',
        'Limitación: pedir que se restrinja el uso temporalmente.',
        'Portabilidad: recibir tus datos en formato estructurado y reutilizable.',
        'Retirar el consentimiento: cuando el tratamiento se base en él, sin afectar a la licitud previa.',
        'Cómo ejercerlos: escribe a cornellalocal@gmail.com indicando el derecho que quieres ejercer y adjuntando un documento que acredite tu identidad. Responderemos en el plazo máximo de un mes.',
        'Reclamar ante la AEPD: tienes derecho a presentar reclamación ante la Agencia Española de Protección de Datos (www.aepd.es) si consideras que el tratamiento no se ajusta a la normativa.'
      ]
    },
    {
      id: 6,
      icon: 'Cookie',
      title: 'Cookies y tecnologías similares',
      content: 'CornellaLocal utiliza únicamente lo imprescindible. Para el detalle completo consulta la Política de Cookies dedicada.',
      bullets: [
        'No usamos cookies de marketing ni publicitarias propias.',
        'Vercel Analytics no usa cookies — solo tokens efímeros sin identificación personal.',
        'Google Maps (cuando ves un mapa de un negocio) puede instalar cookies propias de Google. Es un servicio de terceros con su propia política.',
        'Inicio de sesión con Google (OAuth) usa cookies de google.com en su flujo de autenticación.',
        'localStorage (no es cookie técnicamente, pero te lo informamos): guardamos tu sesión, búsquedas recientes y preferencias en tu propio navegador. Puedes borrarlo desde los ajustes del navegador.',
        'Más información en la Política de Cookies.'
      ]
    },
    {
      id: 7,
      icon: 'Trash2',
      title: 'Documentos de verificación de negocios',
      content: 'Si registras un negocio, te pedimos un documento que acredite tu vínculo con el comercio (alta de autónomo, recibo del local, factura a nombre del negocio, licencia comercial, etc.). No solicitamos DNI/NIE personal del propietario.',
      bullets: [
        'Almacenados en Supabase Storage privado (no público, no indexable).',
        'Solo accesibles por el equipo de administración durante la verificación.',
        'Plazo máximo de conservación: 30 días tras la aprobación o rechazo definitivo.',
        'En caso de apelación, se conservan hasta resolver y se eliminan en 30 días.',
        'Base jurídica: interés legítimo del titular del negocio en acreditar la titularidad.'
      ]
    },
    {
      id: 8,
      icon: 'Mail',
      title: 'Contacto y modificaciones',
      content: 'Para cualquier asunto relacionado con la privacidad o el ejercicio de tus derechos, escribe a cornellalocal@gmail.com. Esta política puede actualizarse. La fecha de la última versión se muestra al inicio. Si los cambios son sustanciales, te informaremos.',
      bullets: [
        'Email: cornellalocal@gmail.com',
        'Última actualización: mayo 2026'
      ]
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
            Última actualización: Mayo 2026
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
            En Cornellà Local nos comprometemos a proteger tu información personal y ser transparentes sobre cómo la utilizamos.
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
      content: 'En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y Comercio Electrónico (LSSI-CE), se ofrece la siguiente información:',
      bullets: [
        'Titular del sitio web: Carlos Taboada Valencia',
        'NIF: 46462083J',
        'Domicilio: Cornellà de Llobregat (Barcelona)',
        'Email de contacto: cornellalocal@gmail.com',
        'Sitio web: https://www.cornellalocal.es',
        'Naturaleza del proyecto: iniciativa personal sin ánimo de lucro orientada a apoyar al comercio local.'
      ]
    },
    {
      id: 2,
      icon: 'FileText',
      title: 'Objeto y condiciones de uso',
      content: 'CornellaLocal es una plataforma que conecta a vecinos de Cornellà de Llobregat con comercios locales, permitiendo descubrir negocios, ver ofertas, solicitar presupuestos y aplicar a ofertas de empleo locales.',
      bullets: [
        'El uso de la plataforma supone la aceptación plena de las condiciones del Aviso Legal y la Política de Privacidad.',
        'El acceso es gratuito. La publicación de contenido por parte de comercios verificados también es gratuita en esta fase del proyecto.',
        'El usuario se compromete a usar la plataforma conforme a la ley, la moral, el orden público y el respeto a los demás usuarios y comercios.',
        'Quedan prohibidos los contenidos que sean ilícitos, atenten contra derechos de terceros, sean ofensivos, falsos o engañosos.'
      ]
    },
    {
      id: 3,
      icon: 'Shield',
      title: 'Propiedad intelectual e industrial',
      content: 'Los contenidos del sitio (textos, gráficos, código fuente, logotipo) son propiedad del titular o de terceros que han autorizado su uso, y están protegidos por la legislación vigente sobre propiedad intelectual e industrial.',
      bullets: [
        'No se autoriza la reproducción, distribución, comunicación pública o transformación, salvo con autorización expresa del titular.',
        'Las marcas, nombres comerciales y logos de los negocios mostrados son propiedad de sus respectivos titulares.',
        'Las imágenes y contenido aportados por los comercios son propiedad de éstos; al publicarlos en CornellaLocal otorgan licencia no exclusiva para su exhibición en la plataforma.'
      ]
    },
    {
      id: 4,
      icon: 'AlertTriangle',
      title: 'Responsabilidad y exoneración',
      content: 'El titular del sitio actúa como intermediario entre usuarios y comercios y no es parte de las transacciones que entre ellos se acuerden.',
      bullets: [
        'El titular no garantiza la veracidad ni exactitud de la información publicada por los comercios, aunque adopta medidas razonables para verificar su titularidad.',
        'Las relaciones comerciales (presupuestos, contrataciones, compras) se establecen exclusivamente entre el usuario y el comercio. Cualquier reclamación debe dirigirse al comercio implicado.',
        'El titular no se responsabiliza de los daños derivados de un mal uso del servicio o de la imposibilidad de acceso por motivos técnicos, mantenimiento o causas ajenas razonables.',
        'Se reserva el derecho a suspender, modificar o eliminar contenido que infrinja estas condiciones o la legislación vigente.'
      ]
    },
    {
      id: 5,
      icon: 'Globe',
      title: 'Enlaces a terceros',
      content: 'El sitio puede incluir enlaces a webs de terceros (negocios, redes sociales, servicios externos). El titular no se hace responsable del contenido ni del tratamiento de datos que esos terceros realicen.',
      bullets: [
        'Los enlaces externos se abren con atributos noopener/noreferrer.',
        'La inclusión de enlaces no implica relación, recomendación ni respaldo de los contenidos enlazados.'
      ]
    },
    {
      id: 6,
      icon: 'Scale',
      title: 'Legislación y jurisdicción aplicable',
      content: 'Las presentes condiciones se rigen por la legislación española.',
      bullets: [
        'Para cualquier controversia, las partes se someten a los Juzgados y Tribunales del domicilio del usuario consumidor (art. 90.2 TRLGDCU).',
        'Si el usuario no es consumidor, los Juzgados y Tribunales de Cornellà de Llobregat / Barcelona.'
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
            Última actualización: Mayo 2026
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
    localStorage.removeItem('cookie-consent');
    if (showToast) showToast('Preferencia de cookies restablecida. Recarga la página para volver a verla.', 'info');
  };

  const sections = [
    {
      id: 1,
      icon: 'Info',
      title: '¿Qué son las cookies?',
      content: 'Una cookie es un pequeño archivo de texto que un sitio web guarda en tu navegador para recordar información (preferencias, sesión, etc.). Junto a las cookies, los sitios pueden usar otras tecnologías similares como localStorage o tokens de sesión, que también te explicamos aquí.',
      bullets: [
        'Cookies propias: las pone CornellaLocal directamente en tu navegador.',
        'Cookies de terceros: las ponen servicios externos integrados (Google Maps, OAuth de Google).',
        'Sesión: duran hasta que cierras el navegador.',
        'Persistentes: se mantienen hasta una fecha de caducidad.'
      ]
    },
    {
      id: 2,
      icon: 'Shield',
      title: 'Cookies y tecnologías que usamos',
      content: 'CornellaLocal procura usar lo mínimo imprescindible. La mayoría de información persistente se guarda en localStorage del navegador, no en cookies.',
      bullets: [
        '✅ Esenciales (no requieren consentimiento): tokens de sesión de Supabase Auth para mantenerte logueado, almacenados en localStorage.',
        '✅ Preferencias propias en localStorage: búsquedas recientes, opciones de notificación, banner de instalación PWA.',
        '✅ Analítica anónima — Vercel Analytics no usa cookies y no rastrea individualmente. Aunque técnicamente no requeriría consentimiento, CornellaLocal lo activa solo si aceptas todas las cookies/preferencias en el banner.',
        '⚠️ Google Maps (de terceros): si visualizas el mapa de un negocio, Google puede instalar cookies propias (NID, etc.).',
        '⚠️ Google OAuth (de terceros): si inicias sesión con Google, Google gestiona sus propias cookies en su dominio.',
        '⚠️ Push notifications (Firebase Cloud Messaging de Google): si activas notificaciones, se intercambian tokens con servidores de Google.'
      ]
    },
    {
      id: 3,
      icon: 'Settings',
      title: 'Cómo gestionar tus preferencias',
      content: 'Tienes el control sobre las cookies en cualquier momento.',
      bullets: [
        'Puedes aceptar o rechazar las cookies de terceros desde el banner que aparece en tu primera visita.',
        'Puedes restablecer tu preferencia con el botón al final de esta página.',
        'En la mayoría de navegadores puedes bloquear las cookies o eliminarlas desde la configuración. Hazlo desde el menú "Privacidad" o "Historial".',
        'Bloquear cookies de terceros puede afectar a la visualización de mapas de los negocios o al inicio de sesión con Google. La aplicación seguirá funcionando con login por email.'
      ]
    },
    {
      id: 4,
      icon: 'Globe',
      title: 'Información de los terceros',
      content: 'Si tienes dudas sobre cómo gestionan tus datos los servicios de terceros que pueden instalar cookies a través de CornellaLocal, consulta sus políticas:',
      bullets: [
        'Google (Maps, OAuth, FCM): https://policies.google.com/privacy',
        'Vercel (hosting, analytics): https://vercel.com/legal/privacy-policy',
        'Supabase (hosting de datos): https://supabase.com/privacy'
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
            Última actualización: Mayo 2026
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
            Cómo usamos cookies y tecnologías similares en CornellaLocal.
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
            Restablecer preferencia de cookies
          </button>
        </div>
      </div>
    </div>
  );
};

