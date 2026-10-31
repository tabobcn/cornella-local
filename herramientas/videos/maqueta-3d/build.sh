#!/bin/bash
# uso: build.sh <worker 0|1> ; reparte las escenas entre 2 procesos
cd "$(dirname "$0")"
CUTS=(0 7 14 17.3 21 25.4 31 36.9 44)
for i in 0 1 2 3 4 5 6 7; do
  if [ $((i % 2)) -ne "$1" ]; then continue; fi
  out=parts/s$i.mp4
  [ -f "$out" ] && continue
  node render.cjs range ${CUTS[$i]} ${CUTS[$((i+1))]} "$out" || echo "FALLO s$i"
done
echo "worker $1 terminado"
