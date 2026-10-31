# Música original para el anuncio 3D (síntesis propia, sin derechos de terceros).
# Intro oscura en La menor -> impacto al encender el móvil -> groove elegante a 120 BPM en Do mayor
# (frases de 3 compases F-G-C que cambian con cada escena) -> acorde final con el logo.
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 44100
TOTAL = 43.5
N = int(round(TOTAL * SR))
BPM = 120.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
G0 = 6.2                      # primer compás del groove
rng = np.random.default_rng(23)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def buf(): return np.zeros((N, 2))
def tt(d): return np.arange(int(max(0.0, d) * SR)) / SR
def add(dst, sig, t0, pan=0.0, gain=1.0):
    i0 = int(round(t0 * SR))
    if i0 < 0: sig = sig[-i0:]; i0 = 0
    if i0 >= N or len(sig) == 0: return
    sig = sig[: N - i0]
    l = np.cos((pan + 1) * np.pi / 4) * gain * 1.414; r = np.sin((pan + 1) * np.pi / 4) * gain * 1.414
    dst[i0:i0 + len(sig), 0] += sig * l; dst[i0:i0 + len(sig), 1] += sig * r
def bp(s, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], btype='band', fs=SR, output='sos'), s)
def hp(s, f, o=2): return sosfilt(butter(o, f, btype='high', fs=SR, output='sos'), s)
def lp(s, f, o=2): return sosfilt(butter(o, f, btype='low', fs=SR, output='sos'), s)

# ---------- instrumentos ----------
def saw(f, t, det=0.0):
    ph = (f * (1 + det) * t) % 1.0
    return 2 * ph - 1
def pad(freqs, dur, bright=1800, att=0.6, rel=0.8):
    t = tt(dur); s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.006, -0.002, 0.003, 0.007):
            s += saw(f, t, det) * 0.25
    env = np.minimum(1, t / att) * np.minimum(1, np.maximum(0, dur - t) / rel)
    return lp(lp(s, bright), bright) * env * 0.05
def pluck(f, dur=0.5, bright=1.0):
    t = tt(dur); s = np.zeros_like(t)
    for k in range(1, 10):
        s += (1 / k ** 1.25) * np.sin(2 * np.pi * k * f * t + k) * np.exp(-t * (6 + k * 3.2 / bright))
    return s * np.minimum(1, t / 0.003) * 0.42
def bell(f, dur=1.6):
    t = tt(dur)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 2.6) + 0.5 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 4.5)
         + 0.25 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 7) + 0.1 * np.sin(2 * np.pi * f * 4.17 * t) * np.exp(-t * 11))
    return s * np.minimum(1, t / 0.002) * 0.3
def sub(f, dur):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t) + 0.25 * lp(saw(f, t), 400)
    env = np.minimum(1, t / 0.008) * np.minimum(1, np.maximum(0, dur - t) / 0.03) * (0.75 + 0.25 * np.exp(-t * 4))
    return s * env * 0.45
def kick(g=1.0):
    t = tt(0.5); f = 44 + 95 * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5.5)
    s[:100] += rng.normal(0, 0.3, 100) * np.linspace(1, 0, 100)
    return s * g
def clap():
    t = tt(0.35); n = rng.normal(0, 1, len(t)); env = np.zeros_like(t)
    for d in (0.0, 0.009, 0.019): env += (t >= d) * np.exp(-(t - d).clip(0) * 70) * 0.55
    env += (t >= 0.026) * np.exp(-(t - 0.026).clip(0) * 12)
    return bp(n, 1100, 6000) * env * 0.34
def hat(open_=False, g=1.0):
    t = tt(0.3 if open_ else 0.05); n = rng.normal(0, 1, len(t))
    return hp(n, 8000) * np.exp(-t * (9 if open_ else 80)) * (0.11 if open_ else 0.09) * g
def rim():
    t = tt(0.07); s = np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 70) + bp(rng.normal(0, 1, len(t)), 2000, 6000) * np.exp(-t * 90) * 0.4
    return s * 0.16
def riser(d, lo=400, hi=7000, g=0.07):
    t = tt(d); n = rng.normal(0, 1, len(t)); k = t / d
    a = bp(n, lo, lo * 3); b = bp(n, hi / 3, hi)
    tone = np.sin(2 * np.pi * np.cumsum(220 + 900 * k ** 2) / SR) * 0.25
    return (a * (1 - k) + b * k + tone * k) * k ** 2.2 * g
def impact():
    t = tt(3.0)
    boom = np.sin(2 * np.pi * np.cumsum(32 + 60 * np.exp(-t * 9)) / SR) * np.exp(-t * 1.5) * 0.9
    n = rng.normal(0, 1, len(t))
    air = lp(n, 3000) * np.exp(-t * 2.2) * 0.12 + hp(n, 6000) * np.exp(-t * 4) * 0.05
    return boom + air
def drone(dur):
    t = tt(dur); s = np.zeros_like(t)
    for f, g in ((mtof(33), 0.6), (mtof(40), 0.45), (mtof(45), 0.35), (mtof(52), 0.18)):
        s += g * (np.sin(2 * np.pi * f * t) + 0.3 * lp(saw(f, t, 0.003), 600))
    lfo = 0.75 + 0.25 * np.sin(2 * np.pi * 0.23 * t)
    env = np.minimum(1, t / 1.2) * np.minimum(1, np.maximum(0, dur - t) / 0.5)
    wind = lp(hp(rng.normal(0, 1, len(t)), 300), 1800) * 0.05 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * t + 1))
    return (s * 0.22 * lfo + wind) * env
def whoosh(d=0.6, g=0.15):
    t = tt(d); n = rng.normal(0, 1, len(t))
    env = np.minimum(1, t / (d * 0.45)) ** 2 * np.exp(-np.maximum(0, t - d * 0.45) * 10)
    m = np.clip(t / (d * 0.5), 0, 1)
    return (bp(n, 250, 1400) * (1 - m) + bp(n, 1400, 7000) * m) * env * g
def swipe():
    t = tt(0.22); n = rng.normal(0, 1, len(t))
    return bp(n, 2500, 9000) * np.sin(np.pi * t / 0.22) ** 2 * 0.05
def tap():
    t = tt(0.08); f = 1700 * np.exp(-t * 20) + 600
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 60)
    return s * 0.42
def pop():
    t = tt(0.14); f = 420 + 1100 * (t / 0.14)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.14) ** 1.6 * 0.17

drums, bassb, keys, padb, lead, fx = buf(), buf(), buf(), buf(), buf(), buf()

# ---------- intro oscura (0 - 6.2) ----------
add(padb, drone(6.6), 0.0, 0, 1.0)
for i, (tg, n) in enumerate(((0.9, 81), (2.1, 88), (3.3, 84))):   # destellos cuando la luz recorre el móvil
    add(lead, bell(mtof(n), 2.4) * 0.6, tg, pan=(-0.4, 0.3, 0.1)[i], gain=0.8)
add(fx, riser(1.9, 300, 8000, 0.09), 5.45 - 1.9, 0, 1.0)
add(fx, impact(), 5.45, 0, 0.45)
add(lead, bell(mtof(84), 2.2), 5.5, -0.15, 0.55); add(lead, bell(mtof(91), 2.2), 5.62, 0.15, 0.45)  # se enciende

# ---------- groove (6.2 - 38.2): F G C por escena ----------
CH = {'F': (41, [57, 60, 64, 65]), 'G': (43, [59, 62, 67, 69]), 'C': (36, [55, 60, 64, 67]), 'Am': (45, [57, 60, 64, 69])}
nb = 16
kick_times = []
for b in range(nb):
    t0 = G0 + b * BAR
    name = ['F', 'G', 'C'][(b - 2) % 3]
    root, chord = CH[name]
    lvl = 0 if b < 2 else (1 if b < 5 else (2 if b < 11 else 3))   # la energía va subiendo
    add(padb, pad([mtof(n) for n in chord], BAR + 0.5, 1500 + 400 * lvl), t0, 0, 0.9)
    # arpegio (corcheas al principio, semicorcheas después)
    step = BEAT / 2 if lvl < 2 else BEAT / 4
    seq = [chord[0], chord[2], chord[1] + 12, chord[3], chord[2] + 12, chord[1], chord[3] + 12, chord[2]]
    for k in range(int(BAR / step)):
        n = seq[k % len(seq)] + 12
        acc = 1.0 if k % 4 == 0 else 0.7
        add(keys, pluck(mtof(n), 0.35, 1.3), t0 + k * step, pan=0.35 * np.sin(k * 1.7), gain=0.42 * acc)
    # bajo sincopado
    for beat, d in ((0, 1.4), (1.5, 0.45), (2, 0.9), (3, 0.45), (3.5, 0.45)):
        add(bassb, sub(mtof(root - 12 + (12 if beat == 3.5 and lvl >= 2 else 0)), d * BEAT), t0 + beat * BEAT)
    # batería
    kb = (0, 2) if lvl == 0 else ((0, 1.5, 2) if lvl == 1 else (0, 1.5, 2, 3.5 if b % 2 else 3))
    for beat in kb:
        kt = t0 + beat * BEAT; add(drums, kick(0.95), kt); kick_times.append(kt)
    if lvl >= 1:
        for beat in (1, 3): add(drums, clap() * (0.7 if lvl == 1 else 1.0), t0 + beat * BEAT, 0.05)
    for e in range(16 if lvl >= 2 else 8):
        sub_ = BEAT / 4 if lvl >= 2 else BEAT / 2
        swing = 0.018 if e % 2 else 0.0
        add(drums, hat(g=(1.0 if e % 2 == 0 else 0.6)), t0 + e * sub_ + swing, 0.3)
    if lvl >= 2:
        for beat in (0.5, 1.5, 2.5, 3.5): add(drums, hat(True, 0.55), t0 + beat * BEAT, -0.25)
        add(drums, rim(), t0 + 3.75 * BEAT, -0.3)
    # melodía con campanas en las escenas de más energía
    if lvl >= 2 and (b - 2) % 3 == 0:
        for beat, n in ((0, 76), (0.75, 79), (1.5, 81), (3, 79), (4.5, 76), (5.25, 74), (6, 72), (8, 74), (8.75, 76)):
            add(lead, bell(mtof(n), 1.4), t0 + beat * BEAT, 0.15, 0.55)

# subida y corte antes del final
add(fx, riser(1.4, 400, 9000, 0.06), 38.2 - 1.4, 0, 1.0)
# ---------- final (38.2 - 43.5): acorde de Do con el logo ----------
fin = 39.3
add(padb, pad([mtof(n) for n in (48, 55, 60, 64, 67, 72)], TOTAL - 38.2 + 0.3, 2400, 0.25, 2.2), 38.2, 0, 1.25)
add(fx, impact() * 0.6, fin, 0, 0.6)
for j, n in enumerate((48, 60, 64, 67, 72, 76)):
    add(keys, pluck(mtof(n), 3.0, 0.7), fin + j * 0.035, pan=(j - 2.5) * 0.18, gain=0.75)
for j, n in enumerate((84, 88, 91, 96)):
    add(lead, bell(mtof(n), 2.6), fin + 0.12 + j * 0.12, pan=(j - 1.5) * 0.3, gain=0.5)
add(bassb, sub(mtof(24), 3.5), fin, 0, 1.0)

# ---------- efectos sincronizados con la imagen ----------
for t in (10.2, 16.2, 22.2, 28.2, 33.8): add(fx, whoosh(0.7, 0.13), t - 0.3, 0, 1.0)
for t in (10.3, 16.3, 17.85, 22.3, 28.3, 29.85): add(fx, swipe(), t, 0.2, 1.0)
for t in (17.42, 18.98, 29.42): add(fx, tap(), t, 0.15, 1.0)
for t in (11.0, 11.45, 12.4, 14.4, 16.95, 19.75, 23.2, 23.75, 24.5, 29.0, 30.35, 31.2): add(fx, pop(), t + 0.05, -0.15, 1.0)
add(fx, bell(mtof(88), 1.5) * 0.9, 19.42, -0.2, 1.0); add(fx, bell(mtof(95), 1.6) * 0.9, 19.53, 0.2, 1.0)   # sale el código

# sidechain
duck = np.ones(N)
for kt in kick_times:
    i0 = int(kt * SR); s = tt(0.32); g = 1 - 0.5 * np.exp(-s * 12)
    i1 = min(N, i0 + len(s)); duck[i0:i1] = np.minimum(duck[i0:i1], g[: i1 - i0])
for bb in (bassb, keys, padb): bb *= duck[:, None]

def reverb(x, secs=2.0, mix=0.25):
    t = tt(secs); out = np.zeros_like(x)
    for ch in range(2):
        ir = lp(rng.normal(0, 1, len(t)) * np.exp(-t * 3.0), 6500); ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = fftconvolve(x[:, ch], ir)[: len(x)]
    return x * (1 - mix) + out * mix * 1.6

music = drums * 0.85 + bassb * 0.95 + reverb(keys, 1.8, 0.3) * 0.75 + reverb(padb, 2.8, 0.4) * 1.0 + reverb(lead, 2.6, 0.38) * 0.75
music = hp(music.T, 28).T
fade = np.ones(N); nf = int(2.0 * SR); fade[-nf:] = np.linspace(1, 0, nf) ** 1.4
music *= fade[:, None]
sfx = reverb(fx, 1.4, 0.2)

def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
music *= 10 ** ((-19.5 - rms_db(music)) / 20)
mix = music + sfx * 0.85
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix *= 0.89 / np.max(np.abs(mix))
print('RMS música', round(rms_db(music), 1), 'dB · RMS mezcla', round(rms_db(mix), 1), 'dB · duración', round(N / SR, 2), 's')
wavfile.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
