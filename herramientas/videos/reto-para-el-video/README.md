# Reto «Para el vídeo» (19 s)

Formato viral: las tarjetas («Te toca… un 2x1 en tu panadería», «Fontanero sin buscar en Google»…) cambian cada
2 fotogramas (15 por segundo), la gente para el vídeo para ver qué le ha tocado y lo comenta. Hay **1 tarjeta
dorada «¡PREMIO!»** que sale un solo fotograma doble (segundo 9,3) y pide comentar PREMIO. Al final la ruleta
frena y cae en «Cornellà Local · Muy pronto en tu barrio · @cornellalocal».

- `stage.html`: las 23 tarjetas (`CARDS`), la del premio (`PRIZE`) y el calendario (`SCHED`): sin repetir dos
  seguidas, frenada en los fotogramas 450-516 y tarjeta final hasta el 570. Iconos de `lucide-static`.
- `render.cjs`: `stills 0,280,500,540` o `video mudo.mp4` (también escribe `sched.json` con los cambios).
- `music.py`: ritmo funky a 128 BPM con los instrumentos de `../maqueta-3d/music_fondo.py`, un tic en cada cambio
  de tarjeta, redoble al frenar y fanfarria al caer en la tarjeta final.

```
cd herramientas/videos/reto-para-el-video && npm install
mkdir -p img fonts && cp ../../../public/logo.png ../../../public/icons/icon-512x512.png img/ && cp ../../../src/assets/fonts/inter-*.woff2 fonts/
node render.cjs video mudo.mp4 && python3 music.py audio.wav
ffmpeg -i mudo.mp4 -i audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest reto.mp4
```
Consejo para publicarlo: pon en la descripción «Para el vídeo y comenta qué te ha tocado 👇» y fija un comentario.
