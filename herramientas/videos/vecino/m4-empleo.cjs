// Vídeo vecino 4: trabajo en el barrio
module.exports = [
  { id: 'intro', intro: true, dur: 3.8, shot: 'v15-bolsa', pill: 'EMPLEO EN CORNELLÀ', title: 'Trabaja *cerca de casa*', sub: 'Ofertas de empleo de los comercios del barrio',
    chips: [
      { text: 'Gratis', icon: '✓', color: '#15803d', x: 40, y: 720, rot: -5, t0: 1.0 },
      { text: 'Cerca de casa', icon: '➜', color: '#4b71c3', x: 660, y: 860, rot: 4, t0: 1.2 },
      { text: 'Envía tu CV', icon: '★', color: '#d97706', x: 40, y: 1220, rot: 3, t0: 1.4 },
    ] },
  { id: 'bolsa', step: 1, dur: 4.2, shot: 'v15-bolsa', pill: 'PASO 1', title: 'Mira las *ofertas*', sub: 'En Ofertas → Bolsa de trabajo',
    highlights: [{ x: 16, y: 186, w: 358, h: 200, t0: 0.9, t1: 3.5 }] },
  { id: 'empleo', step: 2, dur: 5.0, shot: 'v16-empleo', pill: 'PASO 2', title: 'Lee los *detalles*', sub: 'Horario, sueldo, requisitos y dónde está',
    scroll: [0, 483, 0.8, 3.0], bubbles: [{ target: 'inscribirme', t0: 3.2, t1: 4.5, zoom: 2.0, w: 900, h: 240 }], taps: [{ target: 'inscribirme', t: 3.7 }] },
  { id: 'inscribirse', step: 3, dur: 5.6, shot: 'v17-inscribirse', pill: 'PASO 3', title: 'Envía tu *CV*', sub: 'Súbelo desde el móvil y preséntate en dos líneas',
    bubbles: [{ target: { x: 195, y: 300 }, t0: 0.7, t1: 2.4, zoom: 1.6, w: 900, h: 300 }, { target: 'enviar', t0: 2.7, t1: 3.9, zoom: 1.9, w: 900, h: 240 }],
    taps: [{ target: 'enviar', t: 3.3 }], success: { t: 4.0, text: '¡Candidatura enviada!' } },
  { id: 'candidaturas', step: 4, dur: 4.8, shot: 'v18-candidaturas', pill: 'PASO 4', title: 'Sigue tu *candidatura*', sub: 'Y confirma la entrevista desde la app',
    scroll: [0, 196, 0.8, 1.8], highlights: [{ x: 36, y: 560, w: 320, h: 150, t0: 2.0 }] },
  { id: 'cierre', end: true, dur: 4.6, title: 'Encuentra trabajo en tu barrio', sub: 'Los comercios de Cornellà buscan gente como tú',
    how: 'Entra en <b>Ofertas → Bolsa de trabajo</b>' },
];
