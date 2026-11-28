import numpy as np
import soundfile as sf
from scipy.signal import butter, hilbert, sosfiltfilt
from scipy.stats import kurtosis

EPS = 1e-12


def load_wav(path: str):
    """Load a WAV file as mono float32 audio and return (y, sr)."""
    y, sr = sf.read(path, dtype="float32")
    if y.ndim > 1:
        y = y[:, 0]
    return y, sr


def highpass(y: np.ndarray, sr: int, cutoff: float = 50.0, order: int = 4) -> np.ndarray:
    """Remove low-frequency noise below cutoff Hz."""
    nyq = 0.5 * sr
    sos = butter(order, cutoff / nyq, btype="highpass", output="sos")
    return sosfiltfilt(sos, y).astype(np.float32)


def windows(y: np.ndarray, sr: int, win_sec: float = 1.0, hop_sec: float = 0.5):
    """Yield overlapping windows of length win_sec with step hop_sec."""
    win_len = int(round(win_sec * sr))
    hop_len = int(round(hop_sec * sr))
    if len(y) < win_len:
        return
    for start in range(0, len(y) - win_len + 1, hop_len):
        yield y[start : start + win_len]


def _band(power: np.ndarray, freqs: np.ndarray, low: float, high: float) -> float:
    """Calculate total spectral energy in [low, high] Hz (auto-capped at Nyquist)."""
    mask = (freqs >= low) & (freqs <= high)
    if not np.any(mask):
        return 0.0
    return float(np.sum(power[mask]))


def estimate_f0(mag: np.ndarray, freqs: np.ndarray, fmin: float = 50.0, fmax: float = 1000.0) -> float:
    """Estimate fundamental frequency f0 from the dominant spectral peak."""
    mask = (freqs >= fmin) & (freqs <= fmax)
    if not np.any(mask):
        return fmin
    sub_mag = mag[mask]
    sub_freqs = freqs[mask]
    return float(sub_freqs[np.argmax(sub_mag)])


def _harmonic_amp(mag: np.ndarray, freqs: np.ndarray, target_hz: float, tol_hz: float = 5.0) -> float:
    """Return peak magnitude around a target harmonic frequency."""
    mask = (freqs >= target_hz - tol_hz) & (freqs <= target_hz + tol_hz)
    if not np.any(mask):
        return 0.0
    return float(np.max(mag[mask]))


def is_speech_like(
    w: np.ndarray,
    sr: int,
    modulation_thresh: float = 1.75,
    speech_ratio_thresh: float = 0.45,
) -> bool:
    """Return True if a window shows human-speech syllable modulation and vocal-band energy."""
    if len(w) < int(0.25 * sr):
        return False

    # 1. Syllable-scale amplitude modulation (50 ms frames)
    frame_len = max(1, int(0.05 * sr))
    n_frames = len(w) // frame_len
    if n_frames < 5:
        return False

    frames = w[: n_frames * frame_len].reshape(n_frames, frame_len)
    f_rms = np.sqrt(np.mean(frames**2, axis=1)) + EPS
    modulation_cv = float(np.std(f_rms) / np.mean(f_rms))

    # 2. Spectral energy in human speech band (300 - 3400 Hz) and vocal pitch (85 - 350 Hz)
    windowed = w * np.hanning(len(w))
    mag = np.abs(np.fft.rfft(windowed)) + EPS
    freqs = np.fft.rfftfreq(len(w), d=1.0 / sr)
    power = mag**2
    total_power = float(np.sum(power)) + EPS

    speech_power = float(np.sum(power[(freqs >= 300.0) & (freqs <= 3400.0)]))
    speech_ratio = speech_power / total_power

    vocal_mask = (freqs >= 85.0) & (freqs <= 350.0)
    vocal_peak_hz = float(freqs[vocal_mask][np.argmax(mag[vocal_mask])]) if np.any(vocal_mask) else 0.0
    in_vocal_pitch = 85.0 <= vocal_peak_hz <= 350.0

    return bool(
        (modulation_cv > modulation_thresh and speech_ratio > speech_ratio_thresh)
        or (modulation_cv > (modulation_thresh + 0.5) and in_vocal_pitch)
    )


def extract_features(w: np.ndarray, sr: int) -> np.ndarray:
    """Extract 15 acoustic features from a single 1D audio window."""
    # Time-domain features
    rms = float(np.sqrt(np.mean(w**2)) + EPS)
    crest_factor = float(np.max(np.abs(w)) / rms)
    kurt = float(kurtosis(w, fisher=True, bias=False))

    # Frequency-domain spectrum (Hann-windowed rFFT)
    windowed = w * np.hanning(len(w))
    mag = np.abs(np.fft.rfft(windowed)) + EPS
    power = mag**2
    freqs = np.fft.rfftfreq(len(w), d=1.0 / sr)

    # Spectral shape
    spectral_flatness = float(np.exp(np.mean(np.log(power))) / (np.mean(power) + EPS))
    spectral_centroid = float(np.sum(freqs * mag) / np.sum(mag))

    # 4 frequency-band energies (4th band naturally caps at Nyquist = sr/2)
    b1 = _band(power, freqs, 50.0, 500.0)
    b2 = _band(power, freqs, 500.0, 2000.0)
    b3 = _band(power, freqs, 2000.0, 4000.0)
    b4 = _band(power, freqs, 4000.0, min(12000.0, 0.5 * sr))

    # Harmonics & ratios
    f0 = estimate_f0(mag, freqs)
    h1 = _harmonic_amp(mag, freqs, f0)
    h2 = _harmonic_amp(mag, freqs, 2.0 * f0)
    h3 = _harmonic_amp(mag, freqs, 3.0 * f0)
    h2_h1 = float(h2 / (h1 + EPS))
    h3_h1 = float(h3 / (h1 + EPS))

    # Analytic envelope peak
    envelope_peak = float(np.max(np.abs(hilbert(w))))

    return np.array(
        [
            rms,
            crest_factor,
            kurt,
            spectral_flatness,
            spectral_centroid,
            b1,
            b2,
            b3,
            b4,
            h1,
            h2,
            h3,
            h2_h1,
            h3_h1,
            envelope_peak,
        ],
        dtype=np.float32,
    )


def array_to_features(
    y: np.ndarray,
    sr: int = 16000,
    ignore_speech: bool = True,
    modulation_thresh: float = 1.75,
    speech_ratio_thresh: float = 0.45,
) -> np.ndarray:
    """Extract feature matrix (n_windows, 15) from an in-memory 1D audio array."""
    y = highpass(y, sr)
    feats = []
    for w in windows(y, sr):
        if ignore_speech and is_speech_like(
            w,
            sr=sr,
            modulation_thresh=modulation_thresh,
            speech_ratio_thresh=speech_ratio_thresh,
        ):
            continue
        feats.append(extract_features(w, sr))
    if not feats:
        return np.empty((0, 15), dtype=np.float32)
    return np.vstack(feats)


def file_to_features(
    path: str,
    ignore_speech: bool = True,
    modulation_thresh: float = 1.75,
    speech_ratio_thresh: float = 0.45,
) -> np.ndarray:
    """Load a WAV file from disk and return its (n_windows, 15) feature matrix."""
    y, sr = load_wav(path)
    return array_to_features(
        y,
        sr=sr,
        ignore_speech=ignore_speech,
        modulation_thresh=modulation_thresh,
        speech_ratio_thresh=speech_ratio_thresh,
    )