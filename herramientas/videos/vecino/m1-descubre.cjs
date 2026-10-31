// Vídeo vecino 1: descubre los comercios del barrio
module.exports = [
  { id: 'intro', intro: true, dur: 3.8, shot: 'v01-inicio', pill: 'PARA LOS VECINOS DE CORNELLÀ', title: 'Tu barrio, en el *móvil*', sub: 'Los comercios de Cornellà, sus ofertas y su horario',
    scroll: [0, 1000, 1.3, 3.6],
    chips: [
      { text: 'Gratis', icon: '✓', color: '#15803d', x: 40, y: 700, rot: -5, t0: 1.0 },
      { text: 'Comercios del barrio', icon: '★', color: '#4b71c3', x: 600, y: 840, rot: 4, t0: 1.2 },
      { text: 'Ofertas', icon: '%', color: '#e11d48', x: 60, y: 1200, rot: 3, t0: 1.4 },
      { text: 'Horarios', icon: '➜', color: '#d97706', x: 740, y: 1420, rot: -4, t0: 1.6 },
    ] },
  { id: 'categorias', step: 1, dur: 4.8, shot: 'v01-inicio', pill: 'DESCUBRE', title: 'Busca por *categorías*', sub: 'Y mira los comercios nuevos del barrio',
    scroll: [[0, 330, 0.6, 1.5], [330, 1150, 2.6, 4.4]], highlights: [{ x: 8, y: 498, w: 374, h: 240, t0: 1.6, t1: 2.5 }] },
  { id: 'buscar', step: 2, dur: 3.8, shot: 'v02-buscar', pill: 'BUSCA', title: 'Encuentra lo que *buscas*', sub: 'Escribe «pan», «peluquería» o «fontanero»',
    bubbles: [{ target: { x: 195, y: 300 }, t0: 0.9, t1: 3.3, zoom: 1.8, w: 900, h: 270 }] },
  { id: 'ficha', step: 3, dur: 5.6, shot: 'v03-ficha', pill: 'CADA COMERCIO', title: 'Todo lo que *necesitas*', sub: 'Horario, cómo llegar, teléfono, fotos y reseñas',
    bubbles: [{ target: { x: 195, y: 440 }, t0: 0.8, t1: 2.4, zoom: 1.7, w: 900, h: 300 }], scroll: [0, 520, 2.6, 4.9],
    tags: [{ text: 'Abierto ahora', x: 300, y: 300, t0: 1.0, t1: 2.4, color: '#15803d', rot: 4 }] },
  { id: 'favoritos', step: 4, dur: 4.0, shot: 'v04-favoritos', pill: 'GUARDA', title: 'Tus *favoritos*', sub: 'Guárdalos con ♥ y te avisamos de sus ofertas',
    highlights: [{ x: 300, y: 110, w: 70, h: 340, t0: 0.9 }], tags: [{ text: '♥ Te avisamos', x: 250, y: 470, t0: 1.4, color: '#e11d48', rot: -3 }] },
  { id: 'cierre', end: true, dur: 4.6, title: 'Descubre los comercios de tu barrio', sub: 'Gratis y hecho en Cornellà',
    how: 'Entra y crea tu cuenta: <b>es gratis</b>' },
];
