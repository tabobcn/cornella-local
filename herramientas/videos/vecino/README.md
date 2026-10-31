# Vídeos para vecinos (4 módulos)

1. `m1-descubre` — comercios, categorías, buscador, ficha y favoritos.
2. `m2-ofertas` — ofertas, ofertas flash, conseguir el código y avisos.
3. `m3-presupuestos` — pedir presupuesto, recibirlos y aceptar uno.
4. `m4-empleo` — bolsa de trabajo, inscribirse con el CV y seguir la candidatura.

Todo con datos inventados (5 negocios, 3 ofertas, 2 empleos) y la hora simulada a martes por la mañana
para que los comercios salgan abiertos (`base.cjs`).

```
npm run build && npx vite preview --port 4173            # en otra terminal
node herramientas/videos/vecino/img/render.cjs            # dibujos de ejemplo
node herramientas/videos/vecino/capture-vecino.cjs        # capturas (o m1,m2... para solo algunas)
node herramientas/videos/vecino/render.cjs herramientas/videos/vecino/m2-ofertas.cjs frames   # fotogramas de prueba
herramientas/videos/vecino/build-all.sh                   # los 4 vídeos con su música
```
Necesita lo mismo que `../README.md` (Playwright, ffmpeg, Python con numpy y scipy).

`capture-viral.cjs` hace las capturas extra del vídeo «Cornellà sale del móvil» (`../maqueta-3d`): filtros por
barrio, categoría y etiqueta, oferta de producto (zapatillas), presupuesto de pintor, avisos de favoritos y el
panel del negocio (estadísticas, candidaturas y empleos). `node herramientas/videos/vecino/capture-viral.cjs`
(o `buscar,ofertas,pres,negocio` para solo algunas).
