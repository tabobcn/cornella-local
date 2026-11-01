# Música de fondo original (síntesis propia, sin derechos de terceros) para «Cornellà sale del móvil».
# STYLE=alegre -> ukelele (cuerda pulsada Karplus-Strong), chasquidos, silbido y glockenspiel, 104 BPM, Do mayor.
# STYLE=lofi   -> piano eléctrico (FM), batería suave con swing, bajo redondo y crujido de vinilo, 86 BPM.
# Mismo esqueleto que el vídeo: gancho suave, subida mientras sale la ciudad, entra en 6,6 s, respiro en 20-22 s,
# final en 40,3 s. Efectos de sonido más bajos para que la música quede de fondo.
import os, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

STYLE = os.environ.get('STYLE', 'alegre')
SR = 44100
TOTAL = 44.0
N = int(round(TOTAL * SR))
BPM = 104.0 if STYLE == 'alegre' else 86.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
G0 = 6.6
FIN = 40.3
rng = np.random.default_rng(5)

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
def ks(f, dur=1.2, bright=0.6, decay=0.9965):
    """Cuerda pulsada (Karplus-Strong)."""
    P = max(2, int(round(SR / f))); n = int(dur * SR); out = np.zeros(n + P + 1)
    exc = rng.uniform(-1, 1, P); exc = lp(exc, 1500 + 6000 * bright) if P > 12 else exc
    out[:P] = exc
    for s in range(P, n, P):
        e = min(s + P, n); idx = np.arange(s, e)
        out[idx] = decay * 0.5 * (out[idx - P] + out[np.maximum(idx - P - 1, 0)])
    y = out[:n]
    env = np.minimum(1, np.maximum(0, (dur - tt(dur)) / 0.08))
    return hp(y * env, 80) * 0.5
UKE = {'C': [67, 60, 64, 72], 'G': [67, 62, 71, 74], 'Am': [69, 60, 64, 69], 'F': [69, 60, 65, 69]}
def strum(chord, t0, down=True, g=1.0, dst=None, dur=1.0):
    notes = UKE[chord] if down else UKE[chord][::-1]
    for j, n in enumerate(notes):
        add(dst, ks(mtof(n), dur, 0.55 if down else 0.4), t0 + j * (0.011 if down else 0.008), pan=(j - 1.5) * 0.18, gain=g * (1.0 if down else 0.7))
def whistle(f, dur, f_prev=None):
    t = tt(dur); vib = 1 + 0.006 * np.sin(2 * np.pi * 5.6 * t) * np.minimum(1, t / 0.25)
    glide = 1.0 if f_prev is None else (f_prev / f) ** np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f * vib * glide) / SR
    s = np.sin(ph) + 0.06 * np.sin(2 * ph)
    breath = bp(rng.normal(0, 1, len(t)), f * 0.8, f * 1.4) * 0.05
    env = np.minimum(1, t / 0.045) * np.minimum(1, np.maximum(0, dur - t) / 0.07)
    return (s + breath) * env * 0.16
def bell(f, dur=1.4):
    t = tt(dur)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 3) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 10))
    return s * np.minimum(1, t / 0.002) * 0.22
def epiano(f, dur, vel=1.0):
    """Piano eléctrico por FM (cuerpo 1:1 + púa 1:14)."""
    t = tt(dur); I = (1.4 + 1.2 * vel) * np.exp(-t * 3.2)
    body = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * t))
    tine = 0.25 * vel * np.sin(2 * np.pi * f * t + 2.0 * np.exp(-t * 25) * np.sin(2 * np.pi * f * 14 * t)) * np.exp(-t * 9)
    env = np.exp(-t * 1.1) * np.minimum(1, t / 0.004) * np.minimum(1, np.maximum(0, dur - t) / 0.15)
    return lp((body + tine) * env, 4500) * 0.16 * vel
def pad(freqs, dur, bright=1400, att=0.6, rel=0.8):
    t = tt(dur); s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.004, 0.0, 0.004): s += np.sin(2 * np.pi * f * (1 + det) * t) + 0.3 * np.sin(2 * np.pi * 2 * f * (1 + det) * t)
    env = np.minimum(1, t / att) * np.minimum(1, np.maximum(0, dur - t) / rel)
    return lp(s, bright) * env * 0.035
def bass(f, dur):
    t = tt(dur); s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)
    env = np.minimum(1, t / 0.008) * np.exp(-t * 2.4) * np.minimum(1, np.maximum(0, dur - t) / 0.03)
    return s * env * 0.4
def kick(g=1.0, soft=False):
    t = tt(0.4); f = 50 + (70 if soft else 95) * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (7 if soft else 6))
    return s * g * 0.9
def snap():
    t = tt(0.12); n = rng.normal(0, 1, len(t)); return bp(n, 1800, 5500) * np.exp(-t * 55) * 0.35
def snare_lofi():
    t = tt(0.3); n = rng.normal(0, 1, len(t))
    s = bp(n, 900, 5000) * np.exp(-t * 16) * 0.3 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.25
    return lp(s, 5000)
def shaker(g=1.0):
    t = tt(0.07); n = rng.normal(0, 1, len(t)); return bp(n, 5000, 11000) * np.sin(np.pi * t / 0.07) * 0.05 * g
def hat(g=1.0):
    t = tt(0.05); n = rng.normal(0, 1, len(t)); return hp(n, 7000) * np.exp(-t * 80) * 0.06 * g
def riser(d, g=0.05):
    t = tt(d); n = rng.normal(0, 1, len(t)); k = t / d
    return (bp(n, 500, 1500) * (1 - k) + bp(n, 2500, 8000) * k) * k ** 2.2 * g
def swish(d=0.45, g=0.08):
    t = tt(d); n = rng.normal(0, 1, len(t)); return bp(n, 1500, 7000) * np.sin(np.pi * t / d) ** 2 * g
def pop(f0=420, f1=1300, d=0.13, g=0.12):
    t = tt(d); f = f0 + (f1 - f0) * (t / d); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 1.6 * g
def ding(base=88):
    a = bell(mtof(base), 1.3); b2 = bell(mtof(base + 5), 1.5); out = np.zeros(int(1.8 * SR))
    out[:len(a)] += a; i = int(0.12 * SR); out[i:i + len(b2)] += b2[: len(out) - i]; return out

mus, drums, fx = buf(), buf(), buf()
kick_times = []

if STYLE == 'alegre':
    PROG = ['C', 'G', 'Am', 'F']; ROOT = {'C': 36, 'G': 43, 'Am': 45, 'F': 41}
    PADN = {'C': [60, 64, 67], 'G': [59, 62, 67], 'Am': [57, 60, 64], 'F': [57, 60, 65]}
    # gancho: ukelele suelto y glockenspiel
    for k in range(3): strum('C', 0.15 + k * BAR * 0.5, True, 0.55, mus, 1.4)
    for k, n in enumerate((76, 79, 84)): add(mus, bell(mtof(n)), 0.4 + k * 0.6, 0.3, 0.5)
    # sale la ciudad: rasgueo que se anima + glock que sube
    t = 3.2; k = 0
    while t < G0 - 0.05:
        ch = ['F', 'G'][int((t - 3.2) / (BAR / 2)) % 2]; strum(ch, t, k % 2 == 0, 0.5 + 0.4 * (t - 3.2) / 3.4, mus, 0.6); t += BEAT / 2; k += 1
    for k, tp in enumerate(np.linspace(4.5, 6.3, 14)): add(mus, bell(mtof([72, 74, 76, 79, 81, 84, 86][k % 7] + (12 if k > 6 else 0)), 0.9), tp, (k % 3 - 1) * 0.4, 0.45)
    add(fx, riser(2.2), G0 - 2.2, 0, 1.0)
    # groove
    NB = int(np.ceil((FIN - G0) / BAR))
    MEL = [(0, 76), (0.5, 79), (1, 81), (2, 79), (2.5, 76), (3, 74), (4, 76), (4.5, 79), (5, 84), (6, 81), (7, 79),
           (8, 76), (8.5, 79), (9, 81), (10, 79), (10.5, 76), (11, 74), (12, 72), (13, 74), (14, 76)]
    for b in range(NB):
        t0 = G0 + b * BAR
        if t0 >= FIN - 0.4: break
        ch = PROG[b % 4]; soft = 20.0 <= t0 < 22.0 or t0 >= 37.4
        add(mus, pad([mtof(n) for n in PADN[ch]], BAR + 0.3), t0, 0, 0.8)
        for beat, down in [(0, True), (1, True), (1.5, False), (2.5, False), (3, True), (3.5, False)]:
            strum(ch, t0 + beat * BEAT, down, 0.42 if soft else 0.62, mus, 0.9)
        if soft: continue
        for beat, d in ((0, 1.2), (1.5, 0.45), (2, 1.0), (3.5, 0.45)): add(mus, bass(mtof(ROOT[ch] - 12 + 12), d * BEAT * 1.6), t0 + beat * BEAT, 0, 0.9)
        for beat in (0, 2): kt = t0 + beat * BEAT; add(drums, kick(0.75, True), kt); kick_times.append(kt)
        for beat in (1, 3): add(drums, snap(), t0 + beat * BEAT, 0.15)
        for e in range(8): add(drums, shaker(1.0 if e % 2 else 0.6), t0 + e * BEAT / 2 + (0.02 if e % 2 else 0), -0.3)
        if b % 4 == 0 and b >= 2:   # silbido cada 4 compases
            prev = None
            for i, (beat, n) in enumerate(MEL):
                nxt = MEL[i + 1][0] if i + 1 < len(MEL) else beat + 1
                add(mus, whistle(mtof(n), (nxt - beat) * BEAT * 0.95, prev), t0 + beat * BEAT, 0.1, 1.0); prev = mtof(n)
        elif b % 4 == 2 and b >= 2:
            for k, n in enumerate((84, 79, 76, 79, 84, 88)): add(mus, bell(mtof(n), 0.8), t0 + k * BEAT * 0.75, 0.3, 0.35)
    # final
    for k in range(2): strum('F', 37.6 + k * BEAT * 2, True, 0.4, mus, 1.6)
    add(fx, riser(2.4, 0.06), FIN - 2.4, 0, 1.0)
    strum('C', FIN, True, 0.9, mus, 3.2); add(mus, bass(mtof(36), 3.0), FIN, 0, 1.0)
    add(mus, pad([mtof(n) for n in (60, 64, 67, 72)], TOTAL - FIN, 1800, 0.1, 2.5), FIN, 0, 1.2)
    for k, n in enumerate((84, 88, 91, 96)): add(mus, bell(mtof(n), 2.0), FIN + 0.1 + k * 0.12, (k - 1.5) * 0.3, 0.45)
    add(drums, kick(0.8, True), FIN)
else:  # lofi
    PROG = [(53, [57, 60, 64, 65 + 12 - 12]), (52, [55, 59, 62, 64]), (50, [53, 57, 60, 64]), (48, [55, 59, 60, 64])]   # Fmaj7 Em7 Dm7 Cmaj7
    def chord_ep(notes, t0, vel, dst, dur=2.2):
        for j, n in enumerate(notes): add(dst, epiano(mtof(n), dur, vel), t0 + j * 0.012, (j - 1.5) * 0.25, 1.0)
    # gancho: acordes sueltos
    chord_ep(PROG[0][1], 0.1, 0.6, mus, 3.0); chord_ep(PROG[1][1], 1.6, 0.55, mus, 3.0)
    # sale la ciudad: arpegio de piano eléctrico que sube
    for k, tp in enumerate(np.arange(3.2, G0 - 0.05, BEAT / 2)):
        n = [65, 69, 72, 76, 77, 81, 84, 88][k % 8]; add(mus, epiano(mtof(n), 1.2, 0.5 + 0.03 * k), tp, 0.3 * np.sin(k), 1.0)
    add(fx, riser(2.4), G0 - 2.4, 0, 1.0)
    NB = int(np.ceil((FIN - G0) / BAR)); SW = 0.6
    for b in range(NB):
        t0 = G0 + b * BAR
        if t0 >= FIN - 0.4: break
        root, notes = PROG[b % 4]; soft = 20.0 <= t0 < 22.0 or t0 >= 37.4
        chord_ep(notes, t0, 0.75, mus, BAR * 0.55); chord_ep(notes, t0 + 2.5 * BEAT, 0.55, mus, BAR * 0.45)
        add(mus, pad([mtof(n) for n in notes], BAR + 0.3, 1000), t0, 0, 0.7)
        if soft: continue
        for beat, d in ((0, 1.4), (1.75, 0.5), (2.5, 1.2)): add(mus, bass(mtof(root - 12), d * BEAT), t0 + beat * BEAT, 0, 1.0)
        for beat in (0, 1.75, 2.5): kt = t0 + beat * BEAT; add(drums, kick(0.8, True), kt); kick_times.append(kt)
        for beat in (1, 3): add(drums, snare_lofi(), t0 + beat * BEAT, 0.1)
        for e in range(8): add(drums, hat(1.0 if e % 2 == 0 else 0.6), t0 + (e // 2) * BEAT + (BEAT * SW if e % 2 else 0), 0.25)
        if b % 2 == 1:
            for k, (beat, n) in enumerate(((0, 81), (0.75, 79), (1.5, 76), (3, 74))): add(mus, epiano(mtof(n), 1.0, 0.45), t0 + beat * BEAT, -0.3, 0.8)
    chord_ep(PROG[0][1], 37.6, 0.5, mus, 2.6)
    add(fx, riser(2.4, 0.05), FIN - 2.4, 0, 1.0)
    chord_ep([48, 55, 60, 64, 67, 71], FIN, 0.85, mus, 3.6); add(mus, bass(mtof(36), 3.0), FIN, 0, 1.0)
    add(mus, pad([mtof(n) for n in (60, 64, 67, 71)], TOTAL - FIN, 1200, 0.1, 2.5), FIN, 0, 1.0)
    add(drums, kick(0.8, True), FIN)
    # crujido de vinilo
    crack = np.zeros(N); pos = rng.integers(0, N, 900); crack[pos] = rng.normal(0, 1, len(pos)) * 0.25
    hiss = lp(rng.normal(0, 1, N), 5000) * 0.004
    v = lp(crack, 6000) + hiss; mus[:, 0] += v; mus[:, 1] += v

# ---------- efectos (más suaves que antes) ----------
add(fx, ding(88) * 0.7, 0.6, -0.1, 1.0); add(fx, swish(), 3.08, 0.2, 1.0)
for tc in (14.0, 17.3, 21.0, 25.4, 31.0): add(fx, swish(0.5, 0.07), tc - 0.25, 0, 1.0)
for tc in (8.9, 10.2, 11.7, 20.0, 26.4): add(fx, pop(), tc, 0.1, 0.8)
add(fx, bell(mtof(91), 1.2) * 0.6, 18.25, 0, 1.0)
add(fx, ding(88) * 0.7, 22.02, 0, 1.0)
for k, tc in enumerate((28.0, 28.35, 28.7)): add(fx, bell(mtof(96 - k * 2), 0.8) * 0.45, tc, (k - 1) * 0.4, 1.0)

# sidechain suave
duck = np.ones(N)
for kt in kick_times:
    i0 = int(kt * SR); s = tt(0.25); g = 1 - 0.25 * np.exp(-s * 14)
    i1 = min(N, i0 + len(s)); duck[i0:i1] = np.minimum(duck[i0:i1], g[: i1 - i0])
mus *= duck[:, None]

def reverb(x, secs=2.0, mix=0.25):
    t = tt(secs); out = np.zeros_like(x)
    for ch in range(2):
        ir = lp(rng.normal(0, 1, len(t)) * np.exp(-t * 3.2), 6000); ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = fftconvolve(x[:, ch], ir)[: len(x)]
    return x * (1 - mix) + out * mix * 1.5

music = reverb(mus, 2.2, 0.28) + reverb(drums, 1.0, 0.12) * 0.9
if STYLE == 'lofi': music = lp(music.T, 7500).T
music = hp(music.T, 35).T
fade = np.ones(N); nf = int(2.4 * SR); fade[-nf:] = np.linspace(1, 0, nf) ** 1.4
fi = int(0.05 * SR); fade[:fi] = np.linspace(0, 1, fi)
music *= fade[:, None]
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
music *= 10 ** ((-19.0 - rms_db(music)) / 20)
mix = music + reverb(fx, 1.2, 0.2) * 0.55
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix *= 0.89 / np.max(np.abs(mix))
print(STYLE, 'RMS mezcla', round(rms_db(mix), 1), 'dB')
wavfile.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
