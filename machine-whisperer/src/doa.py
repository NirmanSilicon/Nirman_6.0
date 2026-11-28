import numpy as np

SPEED_OF_SOUND = 343.0  # m/s


def gcc_phat(
    sig1: np.ndarray,
    sig2: np.ndarray,
    sr: int,
    max_tau: float,
    low_hz: float = 200.0,
    high_hz: float = 3000.0,
    interp: int = 16,
) -> float:
    """Estimate time delay (seconds) between two mic signals using band-limited GCC-PHAT."""
    n = sig1.shape[0] + sig2.shape[0]
    nfft = 1 << (n - 1).bit_length()

    S1 = np.fft.rfft(sig1, n=nfft)
    S2 = np.fft.rfft(sig2, n=nfft)

    # S2 * conj(S1) puts the peak at +tau when sig2 is delayed by +tau relative to sig1
    R = S2 * np.conj(S1)
    R_phat = R / (np.abs(R) + 1e-12)

    # Zero out frequencies outside 200-3000 Hz AFTER PHAT weighting
    freqs = np.fft.rfftfreq(nfft, d=1.0 / sr)
    mask = (freqs >= low_hz) & (freqs <= high_hz)
    R_phat[~mask] = 0.0

    cc = np.fft.irfft(R_phat, n=interp * nfft)

    max_shift = min(int(interp * sr * max_tau), interp * nfft // 2)
    cc = np.concatenate((cc[-max_shift:], cc[: max_shift + 1]))

    shift = np.argmax(np.abs(cc)) - max_shift
    return float(shift / (interp * sr))


def estimate_doa(
    ch1: np.ndarray,
    ch2: np.ndarray,
    sr: int = 48000,
    mic_spacing: float = 0.05,
    low_hz: float = 200.0,
    high_hz: float = 3000.0,
) -> tuple[float, float]:
    """
    Estimate Direction of Arrival (degrees, -90 to +90) and time delay (seconds).
    0 deg = straight ahead, -90 deg = left (mic 1), +90 deg = right (mic 2).
    """
    max_tau = mic_spacing / SPEED_OF_SOUND
    tau = gcc_phat(ch1, ch2, sr=sr, max_tau=max_tau, low_hz=low_hz, high_hz=high_hz)

    sin_theta = np.clip((tau * SPEED_OF_SOUND) / mic_spacing, -1.0, 1.0)
    angle_deg = float(np.degrees(np.arcsin(sin_theta)))
    return angle_deg, tau


def delay_and_sum(
    ch1: np.ndarray,
    ch2: np.ndarray,
    sr: int,
    angle_deg: float,
    mic_spacing: float = 0.05,
) -> np.ndarray:
    """Simple 2-mic delay-and-sum beamformer steered toward `angle_deg`."""
    tau = (mic_spacing * np.sin(np.radians(angle_deg))) / SPEED_OF_SOUND
    shift_samples = int(round(tau * sr))
    if shift_samples > 0:
        aligned_ch2 = np.pad(ch2, (shift_samples, 0))[: len(ch2)]
    elif shift_samples < 0:
        aligned_ch2 = np.pad(ch2, (0, -shift_samples))[-shift_samples:]
    else:
        aligned_ch2 = ch2
    return 0.5 * (ch1 + aligned_ch2)


def _simulate_test():
    """Verify DOA accuracy using synthetic 48 kHz audio."""
    sr = 48000
    mic_spacing = 0.05  # 5 cm
    rng = np.random.default_rng(42)

    t = np.arange(sr) / sr
    base_sig = (
        0.5 * np.sin(2 * np.pi * 300 * t)
        + 0.3 * np.sin(2 * np.pi * 600 * t)
        + 0.2 * rng.standard_normal(sr)
    )

    print(f"Testing GCC-PHAT (sr={sr} Hz, mic spacing={mic_spacing*100:.1f} cm):")
    for true_angle in (-60.0, -30.0, 0.0, 25.0, 50.0):
        tau = (mic_spacing * np.sin(np.radians(true_angle))) / SPEED_OF_SOUND
        freqs = np.fft.rfftfreq(len(base_sig), d=1.0 / sr)
        ch1 = base_sig + 0.05 * rng.standard_normal(sr)
        ch2 = np.fft.irfft(
            np.fft.rfft(base_sig) * np.exp(-2j * np.pi * freqs * tau),
            n=len(base_sig),
        )
        ch2 += 0.05 * rng.standard_normal(sr)

        est_angle, est_tau = estimate_doa(ch1, ch2, sr=sr, mic_spacing=mic_spacing)
        err = abs(est_angle - true_angle)
        print(
            f"  True: {true_angle:+6.1f} deg | Est: {est_angle:+6.2f} deg | "
            f"Error: {err:4.2f} deg | tau={est_tau*1e6:+6.1f} us"
        )


if __name__ == "__main__":
    _simulate_test()