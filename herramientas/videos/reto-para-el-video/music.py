# Música y efectos del reto «Para el vídeo» (síntesis propia, sin derechos de terceros).
# Ritmo animado a 128 BPM desde el primer fotograma, «ruleta» que suena en cada cambio de tarjeta,
# frenada con tensión y final con fanfarria al caer en «Cornellà Local · muy pronto».
import json, sys, os
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '..', 'maqueta-3d', 'music_fondo.py')).read().split("mus, drums, fx = buf(), buf(), buf()")[0]
src = src.replace("TOTAL = 44.0", "TOTAL = 19.0").replace("STYLE = os.environ.get('STYLE', 'alegre')", "STYLE = 'funky'")
src = src.replace("BPM = {'alegre': 104.0, 'lofi': 86.0, 'funky': 118.0, 'tropical': 104.0}[STYLE]", "BPM = 128.0")
exec(src)
from scipy.io import wavfile
def reverb(x, secs=2.0, mix=0.25):
    t = tt(secs); out = np.zeros_like(x)
    for ch in range(2):
        ir = lp(rng.normal(0, 1, len(t)) * np.exp(-t * 3.2), 6000); ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = fftconvolve(x[:, ch], ir)[: len(x)]
    return x * (1 - mix) + out * mix * 1.5
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
sched = json.load(open(os.path.join(HERE, 'sched.json')))
FPS = 30
LAND = sched[-1][0] / FPS            # cuando cae en la tarjeta final
SLOW = 450 / FPS                     # empieza a frenar
mus, drums, fx = buf(), buf(), buf()
kick_times = []
PROG = [(45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (36, [55, 60, 64, 67]), (43, [55, 59, 62, 67])]   # Am F C G
bar = 0
t0 = 0.0
while t0 < SLOW - 0.01:
    root, notes = PROG[bar % 4]
    add(mus, pad([mtof(n) for n in notes], BAR + 0.2, 1800), t0, 0, 0.8)
    for beat in range(4): kt = t0 + beat * BEAT; add(drums, kick(0.9), kt); kick_times.append(kt)
    for beat in (1, 3): add(drums, clap2(), t0 + beat * BEAT, 0.05)
    for e in range(16): add(drums, hat(1.0 if e % 4 == 2 else 0.5), t0 + e * BEAT / 4, 0.3)
    for beat in (0.5, 1.5, 2.5, 3.5): add(drums, ohat(0.5), t0 + beat * BEAT, -0.3)
    for beat, iv, d in ((0, 0, 0.5), (0.75, 12, 0.25), (1.5, 0, 0.4), (2, 7, 0.5), (2.5, 12, 0.25), (3.5, 10, 0.4)):
        add(mus, slap(mtof(root - 12 + iv), d * BEAT * 1.5), t0 + beat * BEAT, 0, 0.9)
    for beat in (0, 1.5, 3): add(mus, stab([n + 12 for n in notes[:3]], 0.22), t0 + beat * BEAT, 0, 0.8)
    if bar >= 2 and bar % 2 == 0:
        for k, (beat, n) in enumerate(((0, 76), (0.5, 79), (1, 81), (2, 79), (2.5, 76), (3, 74), (4, 76), (4.5, 79), (5, 84), (6, 81))):
            add(mus, lead_sq(mtof(n), 0.45 * BEAT * 2), t0 + beat * BEAT, 0.1, 0.9)
    t0 += BAR; bar += 1
# frenada: solo pad que sube + redoble
add(mus, pad([mtof(n) for n in (55, 59, 62, 67)], LAND - SLOW + 0.3, 1200, 0.2, 0.2), SLOW, 0, 1.1)
add(fx, riser(LAND - SLOW, 0.08), SLOW, 0, 1.0)
for i, tc in enumerate(np.linspace(SLOW, LAND - 0.05, 18)): add(drums, clap2() * (0.3 + 0.6 * i / 18), tc, 0.05)
# ruleta: un tic en cada cambio de tarjeta (más fuerte al frenar)
def tick(f0, g):
    t = tt(0.035); s = np.sin(2 * np.pi * f0 * t) * np.exp(-t * 140) + bp(rng.normal(0, 1, len(t)), 2500, 7000) * np.exp(-t * 200) * 0.4
    return s * g
for i, (a, b, k) in enumerate(sched):
    tc = a / FPS
    if k == 'brand': continue
    slow = tc >= SLOW
    add(fx, tick(1900 if i % 2 else 1500, 0.22 if slow else 0.07), tc, 0.15 if i % 2 else -0.15, 1.0)
    if k == 'prize': add(fx, bell(mtof(96), 0.4) * 0.5, tc, 0, 1.0)
# final: fanfarria + acorde
add(fx, ding(88) * 0.9, LAND, 0, 1.0)
for j, n in enumerate((60, 64, 67, 72)): add(mus, stab([n, n + 12], 1.4) * 1.3, LAND + 0.08 + j * 0.09, (j - 1.5) * 0.3, 1.0)
add(mus, slap(mtof(36), 1.6), LAND, 0, 1.0); add(drums, kick(1.0), LAND)
add(mus, pad([mtof(n) for n in (48, 55, 60, 64, 67, 72)], TOTAL - LAND, 2400, 0.05, 0.6), LAND, 0, 1.3)
for k, n in enumerate((84, 88, 91, 96)): add(mus, bell(mtof(n), 1.2), LAND + 0.15 + k * 0.1, (k - 1.5) * 0.3, 0.5)
# mezcla
duck = np.ones(N)
for kt in kick_times:
    i0 = int(kt * SR); s = tt(0.22); g = 1 - 0.3 * np.exp(-s * 14); i1 = min(N, i0 + len(s)); duck[i0:i1] = np.minimum(duck[i0:i1], g[: i1 - i0])
mus *= duck[:, None]
music = reverb(mus, 1.8, 0.22) + reverb(drums, 0.9, 0.1) * 0.95
music = hp(music.T, 45).T
music *= 10 ** ((-17.5 - rms_db(music)) / 20)
mix = music + reverb(fx, 0.8, 0.12) * 0.8
fade = np.ones(N); nf = int(0.25 * SR); fade[-nf:] = np.linspace(1, 0.0, nf); mix *= fade[:, None]
mix = np.tanh(mix * 1.25) / np.tanh(1.25); mix *= 0.89 / np.max(np.abs(mix))
print('RMS', round(rms_db(mix), 1), 'dB · cae en', round(LAND, 2), 's')
wavfile.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
