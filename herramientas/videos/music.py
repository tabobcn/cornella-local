# Música original (hecha aquí con síntesis, sin derechos de terceros) + efectos de sonido sincronizados
# Pop alegre a 112 BPM, C - G - Am - F. Salida: audio.wav (estéreo, 44,1 kHz) con la duración exacta del vídeo.
import json, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
tl = json.load(open(sys.argv[1]))
TOTAL = tl['total']
N = int(round(TOTAL * SR))
BPM = 112.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(11)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def buf(): return np.zeros((N, 2))
def add(dst, sig, t0, pan=0.0, gain=1.0):
    i0 = int(round(t0 * SR))
    if i0 >= N: return
    sig = sig[: N - i0]
    l = np.cos((pan + 1) * np.pi / 4) * gain; r = np.sin((pan + 1) * np.pi / 4) * gain
    dst[i0:i0 + len(sig), 0] += sig * l * 1.414
    dst[i0:i0 + len(sig), 1] += sig * r * 1.414
def tt(dur): return np.arange(int(dur * SR)) / SR
def bp(sig, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], btype='band', fs=SR, output='sos'), sig)
def hp(sig, f, order=2): return sosfilt(butter(order, f, btype='high', fs=SR, output='sos'), sig)
def lp(sig, f, order=2): return sosfilt(butter(order, f, btype='low', fs=SR, output='sos'), sig)

# ---------- instrumentos ----------
def pluck(f, dur=0.7, bright=1.0):
    t = tt(dur); s = np.zeros_like(t)
    for k in range(1, 9):
        s += (1 / k ** 1.3) * np.sin(2 * np.pi * k * f * t) * np.exp(-t * (4.5 + k * 2.6 / bright))
    s *= np.minimum(1, t / 0.004)
    return s * 0.5

def pad(freqs, dur):
    t = tt(dur); s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.004, 0.0, 0.0045):
            for k in range(1, 7):
                s += (1 / k ** 1.6) * np.sin(2 * np.pi * k * f * (1 + det) * t + k * 1.3)
    env = np.minimum(1, t / 0.35) * np.minimum(1, (dur - t) / 0.4)
    return lp(s * env, 2200) * 0.05

def bass(f, dur):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 3.0) * np.minimum(1, (dur - t) / 0.02)
    return s * env * 0.42

def bell(f, dur=1.2):
    t = tt(dur)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2) + 0.45 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 5)
         + 0.22 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 8) + 0.12 * np.sin(2 * np.pi * f * 4.2 * t) * np.exp(-t * 12))
    return s * np.minimum(1, t / 0.003) * 0.32

def kick():
    t = tt(0.45)
    f = 48 + 85 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 6.5)
    s[:120] += rng.normal(0, 0.35, 120) * np.linspace(1, 0, 120)
    return s * 0.95

def clap():
    t = tt(0.32); n = rng.normal(0, 1, len(t))
    env = np.zeros_like(t)
    for d in (0.0, 0.011, 0.022):
        env += (t >= d) * np.exp(-(t - d).clip(0) * 60) * 0.6
    env += (t >= 0.03) * np.exp(-(t - 0.03).clip(0) * 14)
    return bp(n, 900, 5000) * env * 0.42

def hat(open_=False):
    t = tt(0.25 if open_ else 0.06); n = rng.normal(0, 1, len(t))
    return hp(n, 7500) * np.exp(-t * (11 if open_ else 70)) * (0.13 if open_ else 0.11)

def shaker():
    t = tt(0.08); n = rng.normal(0, 1, len(t))
    return bp(n, 4000, 11000) * np.sin(np.pi * t / 0.08) * 0.05

# ---------- canción ----------
drums, bassb, keys, lead, padb = buf(), buf(), buf(), buf(), buf()
prog = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]   # C G Am F
nbars = int(np.ceil(TOTAL / BAR)) + 1
end_groove = TOTAL - 2.6          # el ritmo para antes del final; queda el último acorde
kick_times = []
mel = [(0, 76), (0.75, 79), (1.5, 81), (2.5, 79), (3.0, 76), (4.0, 74), (4.75, 76), (5.5, 79), (6.5, 72)]  # 2 compases (en pulsos)

for b in range(nbars):
    t0 = b * BAR
    if t0 >= TOTAL: break
    root, chord = prog[b % 4]
    intro = b < 2
    brk = b == 16                                  # un compás de respiro a mitad
    if t0 < end_groove:
        # pad
        add(padb, pad([mtof(n) for n in chord], BAR + 0.3), t0, 0.0, 1.0 if not intro else 1.3)
        # acordes "pluck" sincopados
        for beat in (0, 1.5, 2.5, 3.5) if not intro else (0, 2):
            for j, n in enumerate(chord):
                add(keys, pluck(mtof(n + 12), 0.6, 1.2), t0 + beat * BEAT + j * 0.008, pan=(j - 1) * 0.35, gain=0.55)
        if not intro and not brk:
            # bajo en corcheas
            for e in range(8):
                n = root + (12 if e in (3, 7) else 0)
                add(bassb, bass(mtof(n - 12), BEAT / 2 * 0.95), t0 + e * BEAT / 2)
            # batería
            for beat in (0, 1.5, 2, 3) if b % 2 else (0, 2, 2.75, 3):
                kt = t0 + beat * BEAT; add(drums, kick(), kt, 0, 1.0); kick_times.append(kt)
            for beat in (1, 3): add(drums, clap(), t0 + beat * BEAT, 0.05, 1.0)
            for e in range(8):
                add(drums, hat(open_=(e == 7 and b % 2 == 1)), t0 + e * BEAT / 2 + (0.012 if e % 2 else 0), 0.3, 1.0 if e % 2 else 0.7)
            for e in range(16):
                if e % 2: add(drums, shaker(), t0 + e * BEAT / 4, -0.3, 1.0)
        elif intro:
            for e in range(8): add(drums, hat(), t0 + e * BEAT / 2, 0.3, 0.45)
        # melodía (desde el compás 4, cada 2 compases; en el respiro también, más suave)
        if b >= 4 and b % 2 == 0:
            for beat, n in mel:
                add(lead, bell(mtof(n)), t0 + beat * BEAT, pan=0.15, gain=0.8 if not brk else 0.5)
    # subida antes de entrar el ritmo y antes de volver del respiro
    if b in (1, 16):
        d = BAR / 2; t = tt(d); n = rng.normal(0, 1, len(t))
        k = t / d
        sw = (bp(n, 600, 2500) * (1 - k) + bp(n, 2500, 9000) * k) * k ** 2 * 0.05
        add(drums, sw, t0 + BAR / 2, 0, 1.0)

# acorde final que se queda sonando
fin = int(end_groove / BAR) * BAR
if fin < end_groove: fin = end_groove
add(padb, pad([mtof(n) for n in (60, 64, 67, 72)], TOTAL - fin + 0.5), fin, 0, 1.6)
for j, n in enumerate((48, 60, 64, 67, 72)):
    add(keys, pluck(mtof(n), 2.4, 0.8), fin + j * 0.03, pan=(j - 2) * 0.2, gain=0.8)
add(lead, bell(mtof(84), 2.0), fin + 0.15, 0.1, 0.6)
add(drums, kick(), fin, 0, 0.9)

# compresión "sidechain": lo melódico baja un poco con cada bombo
duck = np.ones(N)
for kt in kick_times:
    i0 = int(kt * SR); seg = tt(0.35); g = 1 - 0.45 * np.exp(-seg * 11)
    i1 = min(N, i0 + len(seg)); duck[i0:i1] = np.minimum(duck[i0:i1], g[: i1 - i0])
for bb in (bassb, keys, padb): bb *= duck[:, None]

# reverberación (respuesta al impulso sintética)
def reverb(x, secs=1.8, mix=0.22):
    t = tt(secs); out = np.zeros_like(x)
    for ch in range(2):
        ir = rng.normal(0, 1, len(t)) * np.exp(-t * 3.4)
        ir = lp(ir, 6000); ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = fftconvolve(x[:, ch], ir)[: len(x)]
    return x * (1 - mix) + out * mix * 1.6

music = drums * 0.9 + bassb * 0.9 + reverb(keys, 1.6, 0.25) * 0.8 + reverb(lead, 2.2, 0.32) * 0.7 + reverb(padb, 2.5, 0.35) * 0.9
music = hp(music.T, 30).T
# fundido del final
fade = np.ones(N); nf = int(1.6 * SR); fade[-nf:] = np.linspace(1, 0, nf) ** 1.5
music *= fade[:, None]

# ---------- efectos ----------
sfx = buf()
def s_tap():
    t = tt(0.09); f = 1500 * np.exp(-t * 18) + 500
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 55)
    s[:60] += rng.normal(0, 0.4, 60) * np.linspace(1, 0, 60)
    return s * 0.55
def s_pop():
    t = tt(0.12); f = 380 + 900 * (t / 0.12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.12) ** 1.5 * 0.22
def s_whoosh():
    t = tt(0.55); n = rng.normal(0, 1, len(t))
    env = np.minimum(1, t / 0.22) ** 2 * np.exp(-np.maximum(0, t - 0.22) * 9)
    lo = bp(n, 300, 1500); hi = bp(n, 1500, 6000)
    mixw = np.clip(t / 0.3, 0, 1)
    return (lo * (1 - mixw) + hi * mixw) * env * 0.16
for ev in tl['events']:
    t0 = ev['t']
    if ev['type'] == 'tap': add(sfx, s_tap(), t0, 0.1, 1.0)
    elif ev['type'] == 'pop': add(sfx, s_pop(), t0, -0.1, 1.0)
    elif ev['type'] == 'whoosh': add(sfx, s_whoosh(), max(0, t0 - 0.12), 0.0, 1.0)
    elif ev['type'] == 'success':
        add(sfx, bell(mtof(88), 1.6) * 1.6, t0, -0.2, 1.0)
        add(sfx, bell(mtof(95), 1.8) * 1.6, t0 + 0.11, 0.2, 1.0)
    elif ev['type'] == 'confetti':
        for k in range(10):
            n = [84, 88, 91, 96, 100][rng.integers(0, 5)]
            add(sfx, bell(mtof(n), 0.8) * 0.7, t0 + 0.05 + k * 0.06 + rng.random() * 0.03, pan=rng.uniform(-0.8, 0.8))
sfx = reverb(sfx, 1.2, 0.18)

# ---------- mezcla y master ----------
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
music *= 10 ** ((-20.5 - rms_db(music)) / 20)       # música por debajo de los efectos
mix = music + sfx * 0.9
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix *= 0.89 / np.max(np.abs(mix))                   # pico a -1 dBFS
print('RMS música', round(rms_db(music), 1), 'dB · RMS mezcla', round(rms_db(mix), 1), 'dB · duración', round(N / SR, 2), 's')
from scipy.io import wavfile
wavfile.write(sys.argv[2], SR, (mix * 32767).astype(np.int16))
