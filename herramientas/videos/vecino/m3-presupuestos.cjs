// Vídeo vecino 3: pedir presupuesto
module.exports = [
  { id: 'intro', intro: true, dur: 3.8, shot: 'v14-pres-recibidos', pill: 'PRESUPUESTOS GRATIS', title: '¿Necesitas un *profesional*?', sub: 'Pide presupuesto a los de tu barrio y compara',
    chips: [
      { text: 'Gratis', icon: '✓', color: '#15803d', x: 40, y: 720, rot: -5, t0: 1.0 },
      { text: 'Sin compromiso', icon: '★', color: '#4b71c3', x: 640, y: 860, rot: 4, t0: 1.2 },
      { text: 'Compara precios', icon: '€', color: '#d97706', x: 30, y: 1220, rot: 3, t0: 1.4 },
      { text: 'De Cornellà', icon: '➜', color: '#e11d48', x: 720, y: 1420, rot: -4, t0: 1.6 },
    ] },
  { id: 'servicio', step: 1, dur: 4.6, shot: 'v10-pres-servicio', pill: 'PASO 1', title: 'Elige el *servicio*', sub: 'Fontanero, electricista, pintor, cerrajero…',
    scroll: [0, 298, 0.6, 1.6], bubbles: [{ target: 'fonta', t0: 1.8, t1: 3.4, zoom: 1.8, w: 900, h: 300 }], taps: [{ target: 'fonta', t: 2.3 }, { target: 'sig', t: 3.9 }] },
  { id: 'detalles', step: 2, dur: 4.2, shot: 'v11-pres-detalles', pill: 'PASO 2', title: 'Cuenta qué *pasa*', sub: 'Describe el trabajo y añade fotos si quieres',
    bubbles: [{ target: { x: 195, y: 385 }, t0: 0.8, t1: 2.8, zoom: 1.45, w: 900, h: 330 }], taps: [{ target: 'sig', t: 3.4 }] },
  { id: 'contacto', step: 3, dur: 5.4, shot: 'v12-pres-contacto', pill: 'PASO 3', title: '¿Cuándo y *dónde*?', sub: 'Tu teléfono solo lo verá el profesional que elijas',
    highlights: [{ x: 12, y: 298, w: 366, h: 70, t0: 0.8, t1: 2.2 }], bubbles: [{ target: 'enviar', t0: 2.4, t1: 3.7, zoom: 2.0, w: 900, h: 240 }], taps: [{ target: 'enviar', t: 3.0 }],
    success: { t: 3.8, text: 'Enviada a 2 empresas' } },
  { id: 'recibidos', step: 4, dur: 5.4, shot: 'v14-pres-recibidos', pill: 'PASO 4', title: 'Compara y *elige*', sub: 'Te llegan los presupuestos y aceptas el que quieras',
    scroll: [0, 95, 0.5, 1.2],
    bubbles: [{ target: 'aceptar', t0: 2.6, t1: 4.3, zoom: 1.9, w: 900, h: 240 }], taps: [{ target: 'aceptar', t: 3.2 }] },
  { id: 'cierre', end: true, dur: 4.6, title: 'Presupuestos gratis y sin compromiso', sub: 'De profesionales verificados de Cornellà',
    how: 'Entra en <b>Presupuesto</b> y cuéntanos qué necesitas' },
];
