# «En Cornellà hay de todo» (44 s)

Vídeo vertical (1080x1920, 30 fps) para redes: un compás de música (2,6 s) por cada cosa que un vecino busca en
Cornellà, con la pantalla real de la app dentro de un móvil 3D y el contador «1 / 10».

| Tiempo | Escena |
|---|---|
| 0 – 3,5 s | Gancho: «En Cornellà hay de todo.» con los iconos de las categorías |
| 3,5 – 29,5 s | Carnicería, pescadería, frutería, menú del día, terraza y vermut, peluquería, estética, pintor, fontanero en domingo y limpieza |
| 29,5 – 34,7 s | «Y además… sus ofertas»: lista de ofertas y código del cupón |
| 34,7 – 39,9 s | «¿Tienes negocio?»: alta gratis, panel y visitas/clics |
| 39,9 – 44 s | «Todo Cornellà en una app · Muy pronto · gratis para todos» · @cornellalocal |

- `stage.html`: animación en HTML/CSS; todo depende de `window.draw(t)`. Cada momento está en `BEATS` (icono,
  textos, colores, capturas que pasan por la pantalla y etiquetas). Iconos de `lucide-static`.
- `phone-frame.png` / `.json`: el móvil 3D de `../anuncio-3d` renderizado con la pantalla vacía (transparente) y
  la posición de la pantalla.
- `render.cjs`: `stills 2,6,16.5` o `video mudo.mp4` (también escribe `times.json` con los cambios).
- `music.py`: ukelele, bajo, palmas y silbido a 92,3 BPM (un compás por momento) con los instrumentos de
  `../maqueta-3d/music_fondo.py`, un «pop» en cada cambio y una campanita al salir el código del cupón.

## Cómo se usa
Capturas (con la web en `npx vite preview --port 4173`, ver `../vecino/README.md`):
```
node herramientas/videos/vecino/capture-todo.cjs       # t01…t15: categorías y comercios inventados
node herramientas/videos/vecino/capture-vecino.cjs     # v01-inicio
node herramientas/videos/vecino/capture-viral.cjs      # x05-ofertas, x07-zapas-codigo, x12-panel, x13-stats
```
Vídeo:
```
cd herramientas/videos/hay-de-todo && npm install
mkdir -p img fonts && cp phone-frame.* ../../../public/logo.png ../../../public/icons/icon-512x512.png img/
cp ../vecino/shots/{t*,v01-inicio,x05-ofertas,x07-zapas-codigo,x12-panel,x13-stats}.jpg img/
cp ../../../src/assets/fonts/inter-*.woff2 fonts/
node render.cjs video mudo.mp4 && python3 music.py audio.wav     # unos 10 min
ffmpeg -i mudo.mp4 -i audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest hay-de-todo.mp4
```
