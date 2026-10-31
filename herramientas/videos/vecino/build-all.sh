#!/usr/bin/env bash
# Renderiza los 4 vídeos del vecino, con su música (tono y tempo distintos) y los monta
set -e
cd "$(dirname "$0")"
declare -A BPMS=( [m1-descubre]=112 [m2-ofertas]=116 [m3-presupuestos]=108 [m4-empleo]=118 )
declare -A SHIFTS=( [m1-descubre]=0 [m2-ofertas]=2 [m3-presupuestos]=-3 [m4-empleo]=5 )
for m in m1-descubre m2-ofertas m3-presupuestos m4-empleo; do
  rm -rf "parts/$m"
  node render.cjs "$m.cjs" video
  ls parts/$m/*.mp4 | grep -v '\.tmp\.mp4$' | sort | sed "s|^|file '|; s|$|'|" > "list-$m.txt"
  ffmpeg -loglevel error -y -f concat -safe 0 -i "list-$m.txt" -c copy "mudo-$m.mp4"
  BPM=${BPMS[$m]} SHIFT=${SHIFTS[$m]} python3 music.py "timeline-$m.json" "audio-$m.wav"
  ffmpeg -loglevel error -y -i "mudo-$m.mp4" -i "audio-$m.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$m.tmp.mp4"
  mv "$m.tmp.mp4" "$m.mp4"
  echo "LISTO $m"
done
