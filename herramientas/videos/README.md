# Vídeos explicativos de Cornellà Local

Herramientas para hacer vídeos verticales (1080x1920, 30 fps) que enseñan cómo funciona la app,
filmando las pantallas reales con datos de ejemplo (un negocio inventado: «Panadería Sol de Trigo»).
El primero es **cómo dar de alta un negocio** (`scenes.cjs`).

## Qué hace cada archivo
- `img/*.html` + `img/render.cjs`: dibujos de ejemplo (fachada, interior, pasteles) → `img/*.jpg`.
- `capture.cjs`: abre la app en local con una sesión y datos simulados y captura cada pantalla
  (`shots/`: vista, página completa sin barras fijas y posición de botones).
- `scenes.cjs`: el guion (textos, desplazamientos, toques, lupas, etiquetas, confeti...).
- `stage.html`: el «escenario» que dibuja cada fotograma (móvil, textos animados, efectos).
- `render.cjs`: `frames` = fotogramas de prueba en `frames/`; `video` = una escena por archivo en `parts/`
  (`video cierre,panel` repite solo esas escenas). También escribe `timeline.json` para el sonido.
- `music.py`: música original sintetizada aquí (sin derechos de terceros) + efectos (toques, transiciones, éxito).
- `montar.sh`: une las escenas, genera la música y monta `video.mp4`.

## Cómo se usa
Necesita Node con Playwright (Chromium), ffmpeg y Python con numpy y scipy.
```
npm run build && npx vite preview --port 4173     # en otra terminal
node herramientas/videos/img/render.cjs
node herramientas/videos/capture.cjs
node herramientas/videos/render.cjs frames         # mirar frames/ antes del render largo
node herramientas/videos/render.cjs video
herramientas/videos/montar.sh
```
Para un vídeo nuevo (ofertas, cupones, presupuestos...): añadir sus capturas en `capture.cjs`
y escribir su guion en otro `scenes-*.cjs` (o cambiar `scenes.cjs`).
Las capturas, escenas, audio y vídeos generados no se suben al repositorio (`.gitignore`).
