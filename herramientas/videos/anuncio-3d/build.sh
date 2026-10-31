#!/bin/bash
# uso: build.sh <worker> ; reparte las escenas entre 2 procesos
cd "$(dirname "$0")"
CUTS=(0 4.5 10.2 16.2 22.2 28.2 33.7 38.7 43.5)
for i in 0 1 2 3 4 5 6 7; do
  if [ $((i % 2)) -ne "$1" ]; then continue; fi
  out=parts/s$i.mp4
  [ -f "$out" ] && continue
  node render.cjs range ${CUTS[$i]} ${CUTS[$((i+1))]} "$out" || echo "FALLO s$i"
done
echo "worker $1 terminado"
