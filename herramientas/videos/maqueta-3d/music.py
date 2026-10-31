# Música original para «Cornellà sale del móvil» (síntesis propia, sin derechos de terceros).
# Gancho tranquilo (aviso en el móvil) -> subida mágica mientras sale la ciudad -> «drop» a 124 BPM en el segundo 6,6
# (La m - Fa - Do - Sol, energía en aumento) -> respiro cuando el aviso viaja al móvil -> vuelta -> final en Do mayor.
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 44100
TOTAL = 44.0
N = int(round(TOTAL * SR))
BPM = 124.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
G0 = 6.6
rng = np.random.default_rng(7)

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
def saw(f, t, det=0.0): ph = (f * (1 + det) * t) % 1.0; return 2 * ph - 1

def pad(freqs, dur, bright=1800, att=0.5, rel=0.8):
    t = tt(dur); s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.007, -0.0025, 0.0025, 0.007): s += saw(f, t, det) * 0.25
    env = np.minimum(1, t / att) * np.minimum(1, np.maximum(0, dur - t) / rel)
    return lp(lp(s, bright), bright) * env * 0.05
def supersaw(f, dur, bright=3500):
    t = tt(dur); s = np.zeros_like(t)
    for det in (-0.012, -0.006, 0.0, 0.006, 0.012): s += saw(f, t, det)
    env = np.minimum(1, t / 0.01) * np.exp(-t * 2.2) * np.minimum(1, np.maximum(0, dur - t) / 0.05)
    return lp(s, bright) * env * 0.05
def pluck(f, dur=0.45, bright=1.0):
    t = tt(dur); s = np.zeros_like(t)
    for k in range(1, 10): s += (1 / k ** 1.25) * np.sin(2 * np.pi * k * f * t + k) * np.exp(-t * (6 + k * 3.2 / bright))
    return s * np.minimum(1, t / 0.003) * 0.42
def bell(f, dur=1.6):
    t = tt(dur)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 2.6) + 0.5 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 4.5)
         + 0.25 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 7) + 0.1 * np.sin(2 * np.pi * f * 4.17 * t) * np.exp(-t * 11))
    return s * np.minimum(1, t / 0.002) * 0.3
def sub(f, dur):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * 2 * f * t) + 0.3 * lp(saw(f, t), 500)
    env = np.minimum(1, t / 0.006) * np.minimum(1, np.maximum(0, dur - t) / 0.03) * (0.7 + 0.3 * np.exp(-t * 5))
    return s * env * 0.45
def kick(g=1.0):
    t = tt(0.45); f = 46 + 110 * np.exp(-t * 34)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.0)
    s[:90] += rng.normal(0, 0.3, 90) * np.linspace(1, 0, 90)
    return np.tanh(s * 1.4) * g
def clap():
    t = tt(0.35); n = rng.normal(0, 1, len(t)); env = np.zeros_like(t)
    for d in (0.0, 0.009, 0.019): env += (t >= d) * np.exp(-(t - d).clip(0) * 70) * 0.55
    env += (t >= 0.026) * np.exp(-(t - 0.026).clip(0) * 11)
    return bp(n, 1100, 6500) * env * 0.36
def hat(open_=False, g=1.0):
    t = tt(0.28 if open_ else 0.045); n = rng.normal(0, 1, len(t))
    return hp(n, 8500) * np.exp(-t * (10 if open_ else 85)) * (0.11 if open_ else 0.085) * g
def riser(d, lo=400, hi=8000, g=0.07):
    t = tt(d); n = rng.normal(0, 1, len(t)); k = t / d
    tone = np.sin(2 * np.pi * np.cumsum(200 + 1200 * k ** 2) / SR) * 0.25
    return (bp(n, lo, lo * 3) * (1 - k) + bp(n, hi / 3, hi) * k + tone * k) * k ** 2.2 * g
def impact(g=1.0):
    t = tt(3.0)
    boom = np.sin(2 * np.pi * np.cumsum(30 + 65 * np.exp(-t * 9)) / SR) * np.exp(-t * 1.6) * 0.9
    n = rng.normal(0, 1, len(t))
    return (boom + lp(n, 3000) * np.exp(-t * 2.4) * 0.12 + hp(n, 6000) * np.exp(-t * 4) * 0.05) * g
def whoosh(d=0.6, g=0.15, rev=False):
    t = tt(d); n = rng.normal(0, 1, len(t))
    env = np.minimum(1, t / (d * 0.45)) ** 2 * np.exp(-np.maximum(0, t - d * 0.45) * 10)
    m = np.clip(t / (d * 0.5), 0, 1)
    s = (bp(n, 250, 1400) * (1 - m) + bp(n, 1400, 7000) * m) * env * g
    return s[::-1].copy() if rev else s
def pop(f0=420, f1=1500, d=0.13, g=0.17):
    t = tt(d); f = f0 + (f1 - f0) * (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 1.6 * g
def click():
    t = tt(0.05); return (np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 120) + hp(rng.normal(0, 1, len(t)), 3000) * np.exp(-t * 150) * 0.3) * 0.25
def ding(base=88):
    s = bell(mtof(base), 1.4) * 1.2; s2 = bell(mtof(base + 5), 1.6) * 1.2; out = np.zeros(int(1.9 * SR))
    out[:len(s)] += s; i = int(0.12 * SR); out[i:i + len(s2)] += s2[: len(out) - i]; return out
def zip_(d=0.5):
    t = tt(d); f = 500 + 2200 * (t / d) ** 1.5
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * 0.07
def swish():
    t = tt(0.3); n = rng.normal(0, 1, len(t)); return bp(n, 2000, 8000) * np.sin(np.pi * t / 0.3) ** 2 * 0.06

drums, bassb, keys, padb, lead, fx = buf(), buf(), buf(), buf(), buf(), buf()

# ---------- gancho (0 - 3.2) ----------
add(padb, pad([mtof(n) for n in (57, 60, 64)], 3.6, 1200, 0.3, 0.5), 0.0, 0, 1.4)
for i in range(int(3.2 / (BEAT / 2))):
    add(keys, pluck(mtof([76, 72, 69, 72][i % 4]), 0.25, 0.8), i * BEAT / 2, 0.2 * (-1) ** i, 0.34 + 0.06 * (i % 4 == 0))
for i in range(int(3.2 / BEAT)): add(drums, kick(0.35) * (1 if i % 2 == 0 else 0.6), 0.05 + i * BEAT, 0, 1.0)
for k in range(0, 3): add(bassb, sub(mtof(33), 0.5), k * BAR / 2 + 0.2, 0, 0.35)
add(fx, ding(88), 0.6, -0.1, 0.9)              # aviso del móvil
add(fx, swish(), 3.08, 0.2, 1.4)                # desbloquear
# ---------- la ciudad sale del móvil (3.2 - 6.6) ----------
add(padb, pad([mtof(n) for n in (53, 57, 60, 64)], 3.6, 2400, 1.2, 0.2), 3.1, 0, 1.0)
for i in range(int(3.4 / (BEAT / 4))):         # arpegio que sube
    n = [69, 72, 76, 79, 81, 84, 88, 91][i % 8] + (12 if i >= 16 else 0)
    add(keys, pluck(mtof(n), 0.22, 1.5), 3.2 + i * BEAT / 4, 0.4 * np.sin(i), 0.12 + 0.12 * i / 28)
add(fx, riser(3.2, 300, 9000, 0.11), G0 - 3.2, 0, 1.0)
for k, tp in enumerate(np.linspace(4.55, 5.95, 20)):   # edificios que brotan
    add(fx, pluck(mtof([72, 74, 76, 79, 81][k % 5] + 12 * (k // 10)), 0.3, 2.0) * 0.8, tp, (k % 5 - 2) * 0.25, 0.6)
for k, tp in enumerate(np.linspace(5.3, 6.4, 10)): add(fx, pop(500 + k * 60, 1800, 0.1, 0.08), tp, (k % 3 - 1) * 0.4)
add(fx, pop(220, 900, 0.32, 0.22), 6.05, 0, 1.0)  # el pin gigante
add(fx, impact(0.7), G0, 0, 1.0); add(fx, whoosh(0.8, 0.12), G0 - 0.45, 0, 1.0)

# ---------- groove (6.6 - 37.6) ----------
CH = [(45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (36, [55, 60, 64, 67]), (43, [55, 59, 62, 67])]   # Am F C G
kick_times = []
NB = 16
for b in range(NB):
    t0 = G0 + b * BAR
    root, chord = CH[b % 4]
    lvl = 1 if b < 4 else (2 if b < 8 else 3)
    brk = b == 7   # respiro mientras el aviso viaja al móvil (compás 7)
    add(padb, pad([mtof(n) for n in chord], BAR + 0.4, 1600 + 500 * lvl), t0, 0, 0.9)
    # stabs con supersaw en los tiempos sincopados
    if not brk:
        for beat in (0, 1.5, 3) if lvl >= 2 else (0, 2):
            for j, n in enumerate(chord): add(keys, supersaw(mtof(n + 12), 0.32, 3000 + 600 * lvl), t0 + beat * BEAT, (j - 1.5) * 0.3, 0.55)
    # arpegio
    step = BEAT / 4 if lvl >= 2 else BEAT / 2
    seq = [chord[0], chord[2], chord[1] + 12, chord[3], chord[2] + 12, chord[1], chord[3] + 12, chord[2]]
    for k in range(int(BAR / step)):
        add(keys, pluck(mtof(seq[k % 8] + 12), 0.3, 1.3), t0 + k * step, 0.35 * np.sin(k * 1.7), (0.34 if k % 4 == 0 else 0.22) * (0.6 if brk else 1))
    if brk:
        add(fx, riser(BAR, 500, 9000, 0.08), t0, 0, 1.0)
        continue
    # bajo
    for beat, d in ((0, 0.9), (1, 0.45), (1.5, 0.45), (2, 0.9), (3, 0.45), (3.5, 0.45)):
        add(bassb, sub(mtof(root - 12 + (12 if beat in (1.5, 3.5) and lvl >= 3 else 0)), d * BEAT), t0 + beat * BEAT)
    # batería: bombo a negras, palmas en 2 y 4, charles
    for beat in range(4):
        kt = t0 + beat * BEAT; add(drums, kick(0.95), kt); kick_times.append(kt)
    for beat in (1, 3): add(drums, clap() * (0.75 if lvl == 1 else 1.0), t0 + beat * BEAT, 0.05)
    for e in range(16 if lvl >= 2 else 8):
        sub_ = BEAT / 4 if lvl >= 2 else BEAT / 2
        add(drums, hat(g=1.0 if e % 2 == 0 else 0.55), t0 + e * sub_ + (0.012 if e % 2 else 0), 0.3)
    if lvl >= 2:
        for beat in (0.5, 1.5, 2.5, 3.5): add(drums, hat(True, 0.5), t0 + beat * BEAT, -0.25)
    # melodía con campanas (cada 2 compases desde el 4)
    if b >= 4 and b % 2 == 0:
        for beat, n in ((0, 76), (0.75, 79), (1.5, 81), (2.5, 79), (3, 76), (4, 74), (4.75, 76), (5.5, 79), (6.5, 72)):
            add(lead, bell(mtof(n), 1.3), t0 + beat * BEAT, 0.15, 0.6 if lvl == 2 else 0.75)

# ---------- final (37.6 - 44) ----------
G_END = G0 + NB * BAR
add(padb, pad([mtof(n) for n in (53, 57, 60, 64)], 40.3 - G_END + 0.3, 1200, 0.3, 0.2), G_END, 0, 1.0)
add(fx, whoosh(2.2, 0.22, rev=True), 37.6, 0, 1.0)   # la ciudad vuelve al móvil
add(fx, riser(2.6, 300, 9000, 0.15), 40.3 - 2.6, 0, 1.0)
add(fx, impact(0.75), 40.3, 0, 1.0)
add(padb, pad([mtof(n) for n in (48, 55, 60, 64, 67, 74)], TOTAL - 40.3, 2600, 0.15, 2.4), 40.3, 0, 1.3)
for j, n in enumerate((48, 60, 64, 67, 72, 76)): add(keys, pluck(mtof(n), 3.0, 0.7), 40.3 + j * 0.03, (j - 2.5) * 0.18, 0.75)
for j, n in enumerate((84, 88, 91, 96)): add(lead, bell(mtof(n), 2.6), 40.42 + j * 0.12, (j - 1.5) * 0.3, 0.55)
add(bassb, sub(mtof(24), 3.4), 40.3, 0, 1.0)

# ---------- efectos sincronizados ----------
for tc in (14.0, 17.3, 21.0, 25.4, 31.0): add(fx, whoosh(0.6, 0.15), tc - 0.3, 0, 1.0)
for tc in (8.9, 10.2, 11.7): add(fx, click(), tc, 0.1, 1.0); add(fx, pop(), tc + 0.04, 0.1, 0.9)
for tc in (9.0, 10.35, 10.5, 10.65, 11.85): add(fx, pop(900, 300, 0.16, 0.12), tc + 0.35, -0.2, 1.0)
for tc in (10.5, 15.3, 18.2, 28.9, 32.9, 35.2): add(fx, pop(380, 1100, 0.16, 0.14), tc, 0.2, 1.0)
for tc in (14.9, 17.7, 34.5): add(fx, swish(), tc, -0.2, 1.3)
add(fx, ding(91) * 0.8, 18.25, 0, 1.0)                     # sale el código del cupón
add(fx, pop(500, 1600, 0.14, 0.16), 20.0, -0.3, 1.0)        # corazón de favorita
add(fx, zip_(1.5), 20.35, -0.2, 1.4)                        # el aviso viaja
add(fx, ding(88), 22.02, 0, 1.0)                            # llega al móvil
add(fx, pop(), 26.4, 0, 1.0)
for k in range(3): add(fx, zip_(0.9), 27.0 + k * 0.25, (k - 1) * 0.5, 1.0)
for k, tc in enumerate((28.0, 28.35, 28.7)): add(fx, bell(mtof(96 - k * 2), 0.9) * 0.9, tc, (k - 1) * 0.4, 1.0)
for k in range(3): add(fx, zip_(1.1) * 0.8, 32.0 + k * 0.3, (k - 1) * 0.3, 1.0)
for tc in (32.6, 33.0, 33.4): add(fx, pop(), tc, 0.2, 0.9)

# sidechain
duck = np.ones(N)
for kt in kick_times:
    i0 = int(kt * SR); s = tt(0.3); g = 1 - 0.5 * np.exp(-s * 12)
    i1 = min(N, i0 + len(s)); duck[i0:i1] = np.minimum(duck[i0:i1], g[: i1 - i0])
for bb in (bassb, keys, padb): bb *= duck[:, None]

def reverb(x, secs=2.0, mix=0.25):
    t = tt(secs); out = np.zeros_like(x)
    for ch in range(2):
        ir = lp(rng.normal(0, 1, len(t)) * np.exp(-t * 3.0), 6500); ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = fftconvolve(x[:, ch], ir)[: len(x)]
    return x * (1 - mix) + out * mix * 1.6

music = drums * 0.85 + bassb * 0.95 + reverb(keys, 1.6, 0.26) * 0.75 + reverb(padb, 2.8, 0.4) * 1.0 + reverb(lead, 2.4, 0.36) * 0.7
music = hp(music.T, 28).T
fade = np.ones(N); nf = int(2.2 * SR); fade[-nf:] = np.linspace(1, 0, nf) ** 1.4
music *= fade[:, None]
sfx = reverb(fx, 1.3, 0.2)
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
music *= 10 ** ((-19.0 - rms_db(music)) / 20)
mix = music + sfx * 0.8
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix *= 0.89 / np.max(np.abs(mix))
print('RMS música', round(rms_db(music), 1), 'dB · RMS mezcla', round(rms_db(mix), 1), 'dB · duración', round(N / SR, 2), 's')
wavfile.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
