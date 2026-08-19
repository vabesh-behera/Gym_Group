"""
Stage 1: reconstruct concurrent occupancy from check-in-only swipe data.

The core idea (a renewal-process / "departure curve" estimator, the same
family of method used to estimate car-park occupancy from entry counters):

  For a member who checked in at time c, the probability they are STILL in
  the building `k` bins later is S(k) — the survival function of the
  session-duration distribution (P(duration > k * bin_length)).

  So the expected occupancy at time t, contributed by everyone who checked in
  at-or-before t, is:

      E[occupancy(t)] = sum over all check-ins c <= t of S(t - c)

  Which is exactly a causal convolution of the "arrivals per bin" time series
  with the discretized survival function. We fit S(.) from the ~12% of
  visits that have a paired checkout (see simulate_data.py's docstring for
  why that subsample exists), then apply it to ALL check-ins, including the
  88% with no checkout.

We validate this against the hidden true occupancy, and compare it to a
naive baseline (assume every visit lasts exactly the average session length)
to show the survival-function approach earns its complexity.
"""

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pathlib import Path
from scipy import stats

OUT = Path(__file__).resolve().parent.parent / "outputs"
BIN_MINUTES = 15
MAX_SESSION_BINS = 20  # 20 * 15min = 5 hours, comfortably beyond any real session


def fit_session_duration(checkouts_sample: pd.DataFrame, club_id: str) -> stats.rv_continuous:
    """Fit a lognormal to observed durations for one club (pooled fallback if thin)."""
    durs = checkouts_sample.loc[checkouts_sample.club_id == club_id, "duration_minutes"]
    if len(durs) < 200:
        durs = checkouts_sample["duration_minutes"]
    shape, loc, scale = stats.lognorm.fit(durs, floc=0)
    return stats.lognorm(shape, loc=loc, scale=scale)


def survival_kernel(dist: stats.rv_continuous) -> np.ndarray:
    """Discretized survival function S[k] = P(duration > k bins), k = 0..MAX_SESSION_BINS.

    Evaluated at bin MIDPOINTS (k + 0.5 bins), not bin starts: an arrival
    counted in bin i actually happened, on average, halfway through it, so
    treating every arrival as if it landed exactly on the bin edge
    systematically over-estimates how long they've "been present" at each
    subsequent bin. This single half-bin correction removes most of the
    positive bias you'd otherwise see versus ground truth.
    """
    offsets_minutes = (np.arange(0, MAX_SESSION_BINS + 1) + 0.5) * BIN_MINUTES
    return dist.sf(offsets_minutes)


def reconstruct(arrivals: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """Causal convolution: recon[t] = sum_k arrivals[t-k] * kernel[k]."""
    full = np.convolve(arrivals, kernel, mode="full")
    return full[: len(arrivals)]


def naive_boxcar_baseline(arrivals: np.ndarray, avg_duration_minutes: float) -> np.ndarray:
    """What a lot of naive occupancy estimators do: rolling sum of arrivals over
    a fixed window equal to the AVERAGE session length, i.e. everyone assumed to
    stay exactly the mean duration. No distribution, no member-level variance."""
    window_bins = max(1, round(avg_duration_minutes / BIN_MINUTES))
    kernel = np.ones(window_bins)
    return reconstruct(arrivals, kernel)


def metrics(true: np.ndarray, pred: np.ndarray) -> dict:
    err = pred - true
    mask = true > 5  # MAPE undefined/unstable near-empty building
    mape = np.mean(np.abs(err[mask]) / true[mask]) * 100 if mask.any() else float("nan")
    return {
        "MAE": float(np.mean(np.abs(err))),
        "RMSE": float(np.sqrt(np.mean(err**2))),
        "MAPE_%": float(mape),
        "Bias": float(np.mean(err)),  # signed mean error: + = over-estimates, - = under-estimates
    }


def main():
    checkins = pd.read_csv(OUT / "checkins.csv", parse_dates=["checkin_time"])
    checkouts_sample = pd.read_csv(OUT / "checkouts_sample.csv", parse_dates=["checkin_time", "checkout_time"])
    true_occ = pd.read_csv(OUT / "true_occupancy_15min.csv", parse_dates=["timestamp"])
    clubs = pd.read_csv(OUT / "clubs.csv")

    start = true_occ["timestamp"].min()
    n_bins = true_occ["timestamp"].nunique()
    full_index = pd.date_range(start, periods=n_bins, freq=f"{BIN_MINUTES}min")

    all_results = []
    fig, axes = plt.subplots(len(clubs), 1, figsize=(11, 3.2 * len(clubs)), sharex=False)
    if len(clubs) == 1:
        axes = [axes]

    print(
        f"{'Club':24s} {'Session (min)':>13s} | "
        f"{'Recon MAE':>9s} {'RMSE':>6s} {'MAPE%':>6s} {'Bias':>6s} | "
        f"{'Naive MAE':>9s} {'RMSE':>6s} {'MAPE%':>6s} {'Bias':>6s}"
    )

    for ax, (_, club) in zip(axes, clubs.iterrows()):
        club_id = club["club_id"]
        dist = fit_session_duration(checkouts_sample, club_id)
        kernel = survival_kernel(dist)

        club_checkins = checkins.loc[checkins.club_id == club_id, "checkin_time"]
        edges = pd.date_range(start, periods=n_bins + 1, freq=f"{BIN_MINUTES}min")
        arrivals = np.histogram(
            club_checkins.to_numpy().astype("datetime64[ns]").astype("int64"),
            bins=edges.to_numpy().astype("datetime64[ns]").astype("int64"),
        )[0]

        recon = reconstruct(arrivals, kernel)
        avg_duration = dist.mean()
        naive = naive_boxcar_baseline(arrivals, avg_duration)

        club_true = true_occ.loc[true_occ.club_id == club_id].sort_values("timestamp")["true_occupancy"].values

        m_recon = metrics(club_true, recon)
        m_naive = metrics(club_true, naive)
        print(
            f"{club['name']:24s} {avg_duration:13.1f} | "
            f"{m_recon['MAE']:9.2f} {m_recon['RMSE']:6.2f} {m_recon['MAPE_%']:6.1f} {m_recon['Bias']:6.2f} | "
            f"{m_naive['MAE']:9.2f} {m_naive['RMSE']:6.2f} {m_naive['MAPE_%']:6.1f} {m_naive['Bias']:6.2f}"
        )

        util_pct = np.clip(recon / club["peak_capacity"] * 100, 0, None)
        df = pd.DataFrame(
            {
                "club_id": club_id,
                "timestamp": full_index,
                "occupancy_reconstructed": recon,
                "occupancy_true": club_true,
                "utilization_pct": util_pct,
            }
        )
        all_results.append(df)

        # Plot one representative week (day 14-21: no promo running, clean baseline week)
        week = df[(df.timestamp >= start + pd.Timedelta(days=14)) & (df.timestamp < start + pd.Timedelta(days=21))]
        ax.plot(week.timestamp, week.occupancy_true, label="True occupancy (hidden ground truth)", color="#0b1b2e", linewidth=1.6)
        ax.plot(week.timestamp, week.occupancy_reconstructed, label="Reconstructed (survival-function method)", color="#10b981", linewidth=1.6, linestyle="--")
        naive_week = naive[(full_index >= start + pd.Timedelta(days=14)) & (full_index < start + pd.Timedelta(days=21))]
        ax.plot(week.timestamp, naive_week, label="Naive fixed-duration baseline", color="#dc2626", linewidth=1.0, alpha=0.6)
        ax.set_title(f"{club['name']} — one representative week")
        ax.set_ylabel("People in building")
        ax.legend(fontsize=8, loc="upper right")

    fig.tight_layout()
    fig.savefig(OUT / "occupancy_reconstruction_validation.png", dpi=150)
    print(f"\nSaved validation plot to {OUT / 'occupancy_reconstruction_validation.png'}")

    hourly = pd.concat(all_results, ignore_index=True)
    hourly.to_csv(OUT / "reconstructed_occupancy_15min.csv", index=False)

    # Aggregate to (club, day_of_week, hour) average utilisation -- this is
    # literally the shape of the app's ClubUtilization table.
    hourly["day_of_week"] = hourly.timestamp.dt.dayofweek.map(lambda d: (d + 1) % 7)  # 0=Sun to match the app
    hourly["hour"] = hourly.timestamp.dt.hour
    club_util_table = (
        hourly.groupby(["club_id", "day_of_week", "hour"], as_index=False)["utilization_pct"]
        .mean()
        .round(1)
    )
    club_util_table.to_csv(OUT / "club_utilization_table.csv", index=False)
    print(f"Saved {len(club_util_table)}-row ClubUtilization-shaped table to {OUT / 'club_utilization_table.csv'}")


if __name__ == "__main__":
    main()
