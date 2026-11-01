# Música original para «En Cornellà hay de todo» (síntesis propia, sin derechos de terceros).
# Ukelele, palmas, silbido y glockenspiel a 92,3 BPM: un compás (2,6 s) por cada comercio u oficio del vídeo.
import json, sys, os
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '..', 'maqueta-3d', 'music_fondo.py')).read().split("mus, drums, fx = buf(), buf(), buf()")[0]
src = src.replace("TOTAL = 44.0", "TOTAL = 44.0").replace("STYLE = os.environ.get('STYLE', 'alegre')", "STYLE = 'alegre'")
src = src.replace("BPM = {'alegre': 104.0, 'lofi': 86.0, 'funky': 118.0, 'tropical': 104.0}[STYLE]", "BPM = 60.0 / (2.6 / 4)")
exec(src)
from scipy.io import wavfile
T = json.load(open(os.path.join(HERE, 'times.json')))
G0b, END = T['G0'], T['END']
def reverb(x, secs=2.0, mix=0.25):
    t = tt(secs); out = np.zeros_like(x)
    for ch in range(2):
        ir = lp(rng.normal(0, 1, len(t)) * np.exp(-t * 3.2), 6000); ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = fftconvolve(x[:, ch], ir)[: len(x)]
    return x * (1 - mix) + out * mix * 1.5
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)

mus, drums, fx = buf(), buf(), buf()
kick_times = []
PROG = ['C', 'G', 'Am', 'F']; ROOT = {'C': 36, 'G': 43, 'Am': 45, 'F': 41}
PADN = {'C': [60, 64, 67], 'G': [59, 62, 67], 'Am': [57, 60, 64], 'F': [57, 60, 65]}
# gancho (0 - 3.5): ukelele suelto + campanitas con los iconos que aparecen
for k, tc in enumerate((0.25, 1.1, 1.95, 2.8)): strum(['C', 'G', 'Am', 'F'][k], tc, True, 0.6, mus, 1.2)
for i in range(12): add(mus, bell(mtof([72, 74, 76, 79, 81, 84][i % 6] + (12 if i > 5 else 0)), 0.8), 0.5 + i * 0.12, (i % 3 - 1) * 0.4, 0.38)
add(fx, riser(1.2, 0.05), G0b - 1.2, 0, 1.0)
# groove (un compás por momento)
MEL = [(0, 76), (0.5, 79), (1, 81), (2, 79), (2.5, 76), (3, 74), (4, 76), (4.5, 79), (5, 84), (6, 81), (7, 79)]
b = 0
t0 = G0b
while t0 < END - 0.05:
    ch = PROG[b % 4]
    add(mus, pad([mtof(n) for n in PADN[ch]], BAR + 0.3), t0, 0, 0.8)
    for beat, down in [(0, True), (1, True), (1.5, False), (2.5, False), (3, True), (3.5, False)]:
        strum(ch, t0 + beat * BEAT, down, 0.62, mus, 0.9)
    for beat, d in ((0, 1.2), (1.5, 0.45), (2, 1.0), (3.5, 0.45)): add(mus, bass(mtof(ROOT[ch]), d * BEAT * 1.6), t0 + beat * BEAT, 0, 0.9)
    for beat in (0, 2): kt = t0 + beat * BEAT; add(drums, kick(0.75, True), kt); kick_times.append(kt)
    for beat in (1, 3): add(drums, snap(), t0 + beat * BEAT, 0.15)
    for e in range(8): add(drums, shaker(1.0 if e % 2 else 0.6), t0 + e * BEAT / 2 + (0.02 if e % 2 else 0), -0.3)
    if b % 4 in (2, 3) and b >= 2:
        prev = None; base = 0 if b % 4 == 2 else 4
        for i, (beat, n) in enumerate(MEL):
            if not (base <= beat < base + 4): continue
            nxt = MEL[i + 1][0] if i + 1 < len(MEL) else beat + 1
            add(mus, whistle(mtof(n), (min(nxt, base + 4) - beat) * BEAT * 0.95, prev), t0 + (beat - base) * BEAT, 0.1, 1.0); prev = mtof(n)
    t0 += BAR; b += 1
# efectos: un «pop» en cada cambio de comercio, toque en la pantalla
for i, (a, _) in enumerate(T['beats']):
    add(fx, swish(0.35, 0.06), a - 0.12, 0.2, 1.0)
    add(fx, pop(420 + (i % 5) * 60, 1300 + (i % 5) * 80, 0.13, 0.13), a + 0.05, -0.15, 1.0)
for i, (a, b2) in enumerate(T['beats']):
    for j in range(int(round((b2 - a) / BAR))):
        tc = a + j * BAR + 1.1
        t = tt(0.06); s = np.sin(2 * np.pi * np.cumsum(1500 * np.exp(-t * 20) + 500) / SR) * np.exp(-t * 60) * 0.18
        add(fx, s, tc, 0.1, 1.0)
add(fx, bell(mtof(91), 1.2) * 0.7, T['beats'][10][0] + BAR, 0, 1.0)     # sale el código del cupón
# final
FIN = END
strum('C', FIN, True, 0.9, mus, 3.2); add(mus, bass(mtof(36), 3.0), FIN, 0, 1.0)
add(mus, pad([mtof(n) for n in (60, 64, 67, 72)], TOTAL - FIN, 1800, 0.1, 2.5), FIN, 0, 1.2)
for k, n in enumerate((84, 88, 91, 96)): add(mus, bell(mtof(n), 2.0), FIN + 0.1 + k * 0.12, (k - 1.5) * 0.3, 0.5)
add(drums, kick(0.8, True), FIN); add(fx, ding(88) * 0.6, FIN + 0.3, 0, 1.0)
for k, n in enumerate((72, 76, 79, 84)): add(mus, whistle(mtof(n), 0.35 if k < 3 else 1.2), FIN + 0.9 + k * 0.32, 0.1, 0.9)
# mezcla
duck = np.ones(N)
for kt in kick_times:
    i0 = int(kt * SR); s = tt(0.25); g = 1 - 0.25 * np.exp(-s * 14); i1 = min(N, i0 + len(s)); duck[i0:i1] = np.minimum(duck[i0:i1], g[: i1 - i0])
mus *= duck[:, None]
music = reverb(mus, 2.0, 0.26) + reverb(drums, 1.0, 0.12) * 0.9
music = hp(music.T, 45).T
fade = np.ones(N); nf = int(2.2 * SR); fade[-nf:] = np.linspace(1, 0, nf) ** 1.4; music *= fade[:, None]
music *= 10 ** ((-18.0 - rms_db(music)) / 20)
mix = music + reverb(fx, 1.0, 0.18) * 0.65
mix = np.tanh(mix * 1.2) / np.tanh(1.2); mix *= 0.89 / np.max(np.abs(mix))
print('RMS', round(rms_db(mix), 1), 'dB')
wavfile.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
