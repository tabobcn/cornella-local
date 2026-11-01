# «Cornellà sale del móvil» (maqueta 3D)

Vídeo vertical (1080x1920, 30 fps, 44 s) pensado para redes: un móvil sobre una mesa de madera recibe un aviso
y de la pantalla sale **una maqueta 3D de Cornellà** (una isla flotante con calles, plaza, comercios, árboles,
coches y gente). La cámara vuela entre las calles con desenfoque de maqueta (*tilt-shift*) y cada función de la
app pasa en la ciudad, con ventanas que enseñan las pantallas reales:

| Tiempo | Escena |
|---|---|
| 0 – 3,2 s | Gancho: «¿Y si todo Cornellà cupiera en tu móvil?» + aviso de una tienda favorita |
| 3,2 – 8,3 s | La ciudad brota del móvil (edificios y árboles salen con muelle) · logo |
| 8,3 – 14 s | Buscar: chips Moda → Almeda → Terraza; los demás edificios se apagan y salen pines |
| 14 – 21 s | Ofertas: cartel -30 % en la zapatería, 2x1 en la panadería, ventana de la oferta y código |
| 21 – 25,4 s | Avisos: un rayo sale de la panadería favorita y llega al móvil (pantalla bloqueada) |
| 25,4 – 31 s | Presupuestos: «Pintar piso de 80 m²» → 3 pintores responden 650/690/720 € |
| 31 – 37 s | Negocios: gráfico de visitas/clics/favoritos en el tejado y cartel «SE BUSCA camarero/a» |
| 37 – 44 s | La ciudad vuelve al móvil · «Muy pronto en Cornellà» · @cornellalocal |

- `stage.html`: toda la escena (three.js + posprocesado). Todo depende de `window.draw(t)`. Los planos de cámara
  están en `SHOTS` (un corte entre plano y plano); `window.__cam = [x,y,z, mx,my,mz, fov]` y `window.__noTS = true`
  sirven para probar encuadres. Los edificios, sus nombres y colores están en `BLD`.
- `render.cjs`, `build.sh` y `music.py`: igual que en `../anuncio-3d` (8 trozos repartidos en 2 procesos).
- `music_fondo.py`: otras cuatro músicas (`STYLE=alegre` ukelele y silbido, `STYLE=lofi` piano eléctrico,
  `STYLE=funky` guitarra rítmica y metales, `STYLE=tropical` marimba y voz sintética)
  con los efectos más bajos: `STYLE=lofi python3 music_fondo.py audio.wav`.
- Unos 5 s por fotograma en un procesador de 2 núcleos sin GPU (≈ 1 h el vídeo entero).

## Cómo se usa
```
cd herramientas/videos/maqueta-3d && npm install
mkdir -p img fonts && cp ../../../src/assets/fonts/inter-*.woff2 fonts/
cp ../vecino/shots/v01-inicio.jpg ../../../public/logo.png ../../../public/icons/icon-512x512.png img/
# recortes de las capturas de ../vecino (capture-viral.cjs), en píxeles de la captura (1170 de ancho):
#  c-almeda = x02 (45,420)-(1125,1590) · c-zapas = x06 (0,0)-(1170,2230) · c-codigo = x07 (60,1395)-(1110,2085)
#  c-avisos = x08 (0,240)-(1170,1250) · c-pres = x11 (0,1120)-(1170,2460) · c-stats = x13 (0,150)-(1170,1560)
#  c-empleos = x15 (0,720)-(1170,2080) · c-categoria = x03 (0,0)-(1170,1440)
node render.cjs stills 1,7.6,11,15.8,18.6,23,28.9,34.2,36.6,42   # mirar antes del render largo
./build.sh 0 & ./build.sh 1 & wait
ls parts/s*.mp4 | sort -V | sed "s/^/file '/;s/$/'/" > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy mudo.mp4 && python3 music.py audio.wav
ffmpeg -i mudo.mp4 -i audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest maqueta.mp4
```
