// Vídeo vecino 2: ofertas y cupones
module.exports = [
  { id: 'intro', intro: true, dur: 3.8, shot: 'v05-ofertas', pill: 'OFERTAS DEL BARRIO', title: 'Ahorra en tu *barrio*', sub: 'Ofertas y cupones de los comercios de Cornellà',
    chips: [
      { text: '2x1', icon: '%', color: '#e11d48', x: 40, y: 720, rot: -5, t0: 1.0 },
      { text: '-20%', icon: '%', color: '#a21caf', x: 700, y: 860, rot: 4, t0: 1.2 },
      { text: 'Ofertas flash', icon: '⚡', color: '#d97706', x: 40, y: 1220, rot: 3, t0: 1.4 },
      { text: 'Gratis', icon: '✓', color: '#15803d', x: 760, y: 1420, rot: -4, t0: 1.6 },
    ] },
  { id: 'ofertas', step: 1, dur: 4.2, shot: 'v05-ofertas', pill: 'PASO 1', title: 'Mira las *ofertas*', sub: 'Cada comercio publica las suyas',
    highlights: [{ x: 16, y: 200, w: 358, h: 160, t0: 0.9, t1: 3.4 }] },
  { id: 'flash', step: 1, dur: 4.0, shot: 'v06-flash', pill: 'FLASH ⚡', title: 'Ofertas *flash*', sub: 'Duran solo unas horas: ¡no te las pierdas!',
    bubbles: [{ target: { x: 195, y: 232 }, t0: 0.8, t1: 3.4, zoom: 1.6, w: 900, h: 300 }] },
  { id: 'cupon', step: 2, dur: 4.6, shot: 'v07-cupon', pill: 'PASO 2', title: 'Consigue tu *código*', sub: 'Pulsa «Obtener mi código» en la oferta',
    scroll: [0, 300, 0.6, 1.7], bubbles: [{ target: 'obtener', t0: 1.9, t1: 3.9, zoom: 2.0, w: 900, h: 240 }], taps: [{ target: 'obtener', t: 2.6 }] },
  { id: 'codigo', step: 3, dur: 5.2, shot: 'v08-codigo', pill: 'PASO 3', title: 'Enséñalo en la *tienda*', sub: 'Te lo validan y listo. Úsalo antes de que caduque',
    scroll: [0, 280, 0.4, 1.3], bubbles: [{ target: 'codigo', t0: 1.5, t1: 3.5, zoom: 1.6, w: 900, h: 330 }], success: { t: 3.7, text: '¡Descuento aplicado!' } },
  { id: 'avisos', step: 4, dur: 4.0, shot: 'v09-avisos', pill: 'AVISOS', title: 'Te *avisamos*', sub: 'Cuando tus favoritos publican una oferta',
    highlights: [{ x: 4, y: 118, w: 382, h: 168, t0: 0.9 }] },
  { id: 'cierre', end: true, dur: 4.6, title: 'Ahorra en las tiendas de tu barrio', sub: 'Ofertas de verdad de los comercios de Cornellà',
    how: 'Entra en <b>Ofertas</b> y consigue tu código' },
];
