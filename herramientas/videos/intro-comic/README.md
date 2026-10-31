# Vídeo de introducción: «¿Por qué nace Cornellà Local?» (estilo cómic)

Viñetas animadas con una vecina: 4 problemas (¿a quién llamo para la fontanería o pintar?, ¿qué tiendas hay
en mi barrio?, ¿ofertas? nunca me entero, solo salen las grandes cadenas) → «¡Por eso nació…!» → cómo lo
resuelve la app (capturas reales) → cierre. Unos 48 s, vertical 1080x1920.

- `comic.html`: todas las escenas, dibujadas en SVG y animadas por tiempo (`window.draw(escena, t)`).
- `comic-render.cjs`: `frames` (fotogramas de prueba) o `video` (una escena por archivo en `parts/`); escribe
  `timeline.json` con los efectos de sonido y el momento del cambio de música.
- `comic-music.py`: música original sintetizada: tranquila en La menor durante los problemas y alegre en Do mayor
  desde «¡Por eso nació…!», con goteos, golpes, sellos y confeti.
- Tipografías Bangers y Comic Neue (Google Fonts, licencia SIL Open Font License 1.1) en `fonts/`.
- Las capturas de la app (`shots/`) salen de `../vecino` (v01, v03, v05 y v14): cópialas aquí antes de renderizar.

```
node herramientas/videos/intro-comic/comic-render.cjs frames
node herramientas/videos/intro-comic/comic-render.cjs video
# montar: concat de parts/*.mp4 + python3 comic-music.py timeline.json audio.wav (igual que ../montar.sh)
```
