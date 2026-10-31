#!/usr/bin/env bash
# Une las escenas, crea la música y monta el vídeo final (video.mp4) en esta carpeta
set -euo pipefail
cd "$(dirname "$0")"
ls parts/*.mp4 | grep -v '\.tmp\.mp4$' | sort | sed "s|^|file '|; s|$|'|" > list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i list.txt -c copy video-mudo.mp4
python3 music.py timeline.json audio.wav
ffmpeg -loglevel error -y -i video-mudo.mp4 -i audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart video.tmp.mp4
mv video.tmp.mp4 video.mp4
echo "Listo: $(pwd)/video.mp4"
