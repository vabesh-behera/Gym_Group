"""
Generates a synthetic-but-realistic stand-in for what a real club access-control
export looks like, so the rest of the pipeline is runnable without real data.

Ground truth is generated at the individual visit level (arrival time +
session duration for every member visit), from which we derive TWO views:

1. `checkins.csv` — every visit, check-in time only. This is what most gyms
   actually have: an entry turnstile / app tap with no reliable exit signal.
2. `checkouts_sample.csv` — a ~12% subsample of visits that ALSO have a
   checkout time (e.g. members who use the app's manual "check out", or a
   club with exit-sensor turnstiles). This is realistic: most gym chains have
   *partial* exit coverage even when most visits are check-in-only, and it's
   exactly what you need to fit a session-duration model.
3. `true_occupancy_15min.csv` — the hidden ground truth (how many people were
   actually in the building at each 15-min mark). You would NOT have this in
   production unless every visit had both check-in and check-out — it exists
   here purely so the reconstruction stage has something to validate against.
   In a real pilot, the equivalent is: instrument one or two clubs with full
   in/out turnstiles for a few months, validate the model there, then trust
   it on the rest of the estate where you only have check-in swipes.
"""

import numpy as np
import pandas as pd
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "outputs"
OUT.mkdir(exist_ok=True)

RNG = np.random.default_rng(42)

# Real Gym Group site names already used in the main app's seed data, so this
# pipeline's outputs slot into the same club identifiers.
CLUBS = [
    {"club_id": "bexleyheath", "name": "Bexleyheath", "peak_capacity": 420},
    {"club_id": "birmingham_broad_street", "name": "Birmingham Broad Street", "peak_capacity": 480},
    {"club_id": "altrincham", "name": "Altrincham", "peak_capacity": 400},
]

BIN_MINUTES = 15
BINS_PER_DAY = 24 * 60 // BIN_MINUTES
N_DAYS = 120
START = pd.Timestamp("2026-01-05")  # a Monday

# Promo windows: (club_id, start_day, end_day, kind). "acquisition" boosts
# overall arrival rate; "offpeak" boosts specifically the midday trough — the
# exact intervention this whole pipeline exists to help target.
PROMO_WINDOWS = [
    ("bexleyheath", 30, 37, "acquisition"),
    ("altrincham", 60, 74, "offpeak"),
    ("birmingham_broad_street", 90, 97, "acquisition"),
]


def weekly_shape(hour: float, is_weekend: bool) -> float:
    """Relative arrival-rate multiplier by hour of day, weekday vs weekend."""
    if not is_weekend:
        morning = np.exp(-0.5 * ((hour - 7.0) / 1.1) ** 2)
        evening = np.exp(-0.5 * ((hour - 18.0) / 1.3) ** 2) * 1.15
        midday = np.exp(-0.5 * ((hour - 12.5) / 2.0) ** 2) * 0.25
        base = 0.05
    else:
        morning = np.exp(-0.5 * ((hour - 10.5) / 2.2) ** 2)
        evening = np.exp(-0.5 * ((hour - 16.0) / 2.5) ** 2) * 0.55
        midday = 0.0
        base = 0.04
    return base + morning + evening + midday


def promo_multiplier(club_id: str, day_idx: int, hour: float) -> float:
    mult = 1.0
    for pclub, start_day, end_day, kind in PROMO_WINDOWS:
        if pclub != club_id or not (start_day <= day_idx <= end_day):
            continue
        if kind == "acquisition":
            mult *= 1.30
        elif kind == "offpeak" and 10 <= hour < 16:
            mult *= 1.55
    return mult


def build_rate_curve(club: dict) -> pd.DataFrame:
    """Expected arrivals per 15-min bin for every bin across the horizon."""
    rows = []
    base_scale = club["peak_capacity"] / 420.0  # bigger club -> more member base
    for day_idx in range(N_DAYS):
        date = START + pd.Timedelta(days=day_idx)
        is_weekend = date.weekday() >= 5
        growth = 1.0 + 0.0015 * day_idx  # slow membership growth over the horizon
        day_noise = RNG.normal(1.0, 0.06)  # day-to-day randomness
        for b in range(BINS_PER_DAY):
            hour = b * BIN_MINUTES / 60.0
            ts = date + pd.Timedelta(minutes=b * BIN_MINUTES)
            shape = weekly_shape(hour, is_weekend)
            rate = shape * 9.0 * base_scale * growth * day_noise * promo_multiplier(club["club_id"], day_idx, hour)
            rows.append((ts, max(rate, 0.0)))
    return pd.DataFrame(rows, columns=["timestamp", "rate"])


def simulate_club_visits(club: dict) -> pd.DataFrame:
    curve = build_rate_curve(club)
    arrivals = RNG.poisson(curve["rate"].values)
    visit_rows = []
    member_counter = 0
    for ts, n in zip(curve["timestamp"], arrivals):
        for _ in range(n):
            member_counter += 1
            # lognormal session length: mean ~55 min, sd ~20 min, clipped
            duration = float(np.clip(RNG.lognormal(mean=np.log(52), sigma=0.42), 15, 150))
            jitter = RNG.uniform(0, BIN_MINUTES)  # spread arrivals within the bin
            checkin = ts + pd.Timedelta(minutes=jitter)
            visit_rows.append(
                {
                    "club_id": club["club_id"],
                    "member_id": f"{club['club_id']}-m{member_counter}",
                    "checkin_time": checkin,
                    "duration_minutes": duration,
                    "checkout_time": checkin + pd.Timedelta(minutes=duration),
                }
            )
    return pd.DataFrame(visit_rows)


def bin_index(ts: pd.Series, start: pd.Timestamp) -> pd.Series:
    return ((ts - start) / pd.Timedelta(minutes=BIN_MINUTES)).astype(int)


def true_occupancy_from_visits(visits: pd.DataFrame, n_bins: int) -> np.ndarray:
    """Difference-array occupancy reconstruction from ground-truth in/out times."""
    delta = np.zeros(n_bins + 1)
    in_bin = bin_index(visits["checkin_time"], START).clip(0, n_bins)
    out_bin = bin_index(visits["checkout_time"], START).clip(0, n_bins)
    np.add.at(delta, in_bin.values, 1)
    np.add.at(delta, out_bin.values, -1)
    return np.cumsum(delta)[:n_bins]


def main():
    n_bins = N_DAYS * BINS_PER_DAY
    all_checkins = []
    all_checkout_sample = []
    all_true_occ = []

    for club in CLUBS:
        visits = simulate_club_visits(club)
        print(f"{club['name']:28s} simulated visits: {len(visits):,}")

        occ = true_occupancy_from_visits(visits, n_bins)
        timestamps = pd.date_range(START, periods=n_bins, freq=f"{BIN_MINUTES}min")
        all_true_occ.append(pd.DataFrame({"club_id": club["club_id"], "timestamp": timestamps, "true_occupancy": occ}))

        all_checkins.append(visits[["club_id", "member_id", "checkin_time"]])

        sample = visits.sample(frac=0.12, random_state=RNG.integers(0, 1_000_000))
        all_checkout_sample.append(sample[["club_id", "member_id", "checkin_time", "checkout_time", "duration_minutes"]])

    checkins = pd.concat(all_checkins, ignore_index=True).sort_values("checkin_time")
    checkouts_sample = pd.concat(all_checkout_sample, ignore_index=True).sort_values("checkin_time")
    true_occupancy = pd.concat(all_true_occ, ignore_index=True)

    checkins.to_csv(OUT / "checkins.csv", index=False)
    checkouts_sample.to_csv(OUT / "checkouts_sample.csv", index=False)
    true_occupancy.to_csv(OUT / "true_occupancy_15min.csv", index=False)
    pd.DataFrame(CLUBS).to_csv(OUT / "clubs.csv", index=False)

    print(f"\nWrote {len(checkins):,} check-ins ({len(checkouts_sample):,} with a paired checkout, "
          f"{len(checkouts_sample)/len(checkins):.1%}) across {len(CLUBS)} clubs over {N_DAYS} days.")
    print(f"Files written to {OUT}/")


if __name__ == "__main__":
    main()
