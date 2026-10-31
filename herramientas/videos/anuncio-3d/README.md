# Anuncio 3D: «Tu barrio, en tu bolsillo»

Vídeo vertical (1080x1920, 30 fps, 43,5 s) con un móvil en 3D realista (marco metálico, cristal, cámaras,
sombras suaves y reflejos) que enseña las pantallas reales de la app con datos de ejemplo:

| Tiempo | Escena |
|---|---|
| 0 – 4,5 s | Oscuro: la luz recorre la parte de atrás del móvil · «Tu barrio, en tu bolsillo.» |
| 4,5 – 10 s | El móvil gira, se encienden las luces y la pantalla (logo → Inicio) |
| 10 – 16 s | Comercios: ficha de Café Brisa + tarjetas «Llamar», «4,7», «Abierto ahora», «Cómo llegar» |
| 16 – 22 s | Ofertas: lista → cupón → código CL-7K4P |
| 22 – 28 s | Presupuestos: dos respuestas (85 € y 110 €) |
| 28 – 33,5 s | Empleo: bolsa de trabajo → oferta de camarero/a |
| 33,5 – 38,5 s | Tres móviles · «Gratis para vecinos y negocios.» |
| 38,5 – 43,5 s | Cierre: logo, «Muy pronto en Cornellà», @cornellalocal |

- `stage.html`: la escena en three.js. Todo depende del tiempo (`window.draw(t)`), así cada fotograma sale igual siempre.
  El móvil es genérico (no imita ninguna marca). La pantalla es un canvas con las capturas, la barra de estado,
  los cambios de pantalla y los toques del dedo.
- `render.cjs`: `stills 2.6,12.6,...` (fotogramas sueltos en `stills/`) o `range desde hasta salida.mp4`.
- `build.sh 0` y `build.sh 1`: reparten las 8 escenas entre dos procesos (`parts/s0.mp4` … `s7.mp4`).
- `music.py`: música original sintetizada (intro oscura en La menor, impacto al encenderse, groove a 120 BPM en
  Do mayor que cambia con cada escena, acorde final) + toques, deslizamientos y «pops» de las tarjetas.

## Cómo se usa
Necesita Node con Playwright (Chromium), ffmpeg y Python con numpy y scipy. Sin tarjeta gráfica funciona igual
(Chromium dibuja con SwiftShader): unos 1,4 s por fotograma con dos procesos.
```
cd herramientas/videos/anuncio-3d
npm install                                   # three.js
mkdir -p img fonts
cp ../vecino/shots/v0{1,3,5,7,8}-*.jpg ../vecino/shots/v1{4,5,6}-*.jpg img/   # capturas de ../vecino
cp ../../../public/logo.png ../../../public/icons/icon-512x512.png img/
cp ../../../src/assets/fonts/inter-*.woff2 fonts/
node render.cjs stills 1.5,6.2,12.6,20.2,26,31.2,36.6,40.6   # mirar antes del render largo
./build.sh 0 & ./build.sh 1 & wait
ls parts/s*.mp4 | sort -V | sed "s/^/file '/;s/$/'/" > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy mudo.mp4
python3 music.py audio.wav
ffmpeg -i mudo.mp4 -i audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest anuncio-3d.mp4
```
