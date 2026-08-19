# Capacity utilisation — ML approach & runnable prototype

How to actually compute `ClubUtilization` (the peak/off-peak % that drives
PromoIQ's heatmap, KPIs, and off-peak campaign targeting) from real club
access data, instead of the seeded random numbers `lib/seed-data.ts` uses
today.

## The two problems

Most gym access-control systems only reliably log **entry** events — a
turnstile tap or app check-in — with no dependable exit signal. That splits
"capacity utilisation" into two genuinely different problems:

1. **Reconstruct occupancy** — how many people were actually in the
   building at each point in time, from check-in-only data. This is a
   statistical estimation problem, not really "ML" in the model-fitting
   sense.
2. **Forecast utilisation** — given a clean occupancy history, predict
   what next week's hourly utilisation will look like per club. This *is*
   a standard ML time-series problem, and it's the piece that actually
   answers "which slots should we target with an off-peak campaign."

This directory implements both, against synthetic data generated to look
like a real access-control export (see `src/simulate_data.py`'s docstring
for exactly what's synthesised and why).

## Stage 1 — occupancy reconstruction

**Method:** for a member who checks in at time `c`, the probability
they're still inside `k` bins later is `S(k)`, the survival function of the
session-duration distribution. Expected occupancy at time `t` is the sum of
`S(t - c)` over every check-in `c ≤ t` — a causal convolution of the
"arrivals per bin" series with the discretised survival function. This is
the same estimator family used for car-park occupancy from entry counters.

`S(.)` is fit as a lognormal to the ~12% of visits that *do* have a paired
checkout (a realistic assumption — most chains have partial exit coverage
via app check-outs or a subset of instrumented turnstiles, even when most
visits are entry-only).

**Validated against hidden ground truth** (`src/occupancy_reconstruction.py`,
run on 120 days × 3 clubs of synthetic data):

| Club | Fitted mean session | Method | MAE | RMSE | MAPE | Bias |
|---|---|---|---|---|---|---|
| Bexleyheath | 56.6 min | Survival-function | **1.30** | **1.84** | **9.8%** | 0.01 |
| | | Naive fixed-duration | 1.77 | 2.67 | 13.3% | 0.88 |
| Birmingham Broad St | 56.5 min | Survival-function | **1.41** | **2.02** | **9.4%** | -0.04 |
| | | Naive fixed-duration | 1.94 | 2.93 | 12.6% | 0.99 |
| Altrincham | 56.2 min | Survival-function | **1.29** | **1.85** | **9.8%** | -0.08 |
| | | Naive fixed-duration | 1.73 | 2.60 | 13.4% | 0.85 |

The naive baseline ("assume everyone stays exactly the average session
length," which is what a lot of simple occupancy estimators actually do)
is a real comparison, not a strawman — it's what you get for free without
fitting a distribution. The survival-function method beats it by ~25-30%
on error and removes essentially all of the systematic over-estimation
bias, at the cost of needing that partial-checkout sample to fit `S(.)`.

One implementation detail worth calling out because it mattered: the first
version evaluated `S(.)` at bin *edges*, which systematically over-counted
occupancy (bias ≈ +2 people) because an arrival logged "in bin i" actually
happened, on average, halfway through it. Evaluating at bin *midpoints*
fixed it — the kind of discretisation bug that's easy to miss without a
validation set, which is the whole argument for piloting this against a
club with real full turnstile coverage before trusting it estate-wide.

`occupancy_reconstruction.py` also aggregates the reconstructed series into
a `(club, day_of_week, hour) → utilisation %` table — that's the exact
shape of the app's `ClubUtilization` Prisma model, written to
`outputs/club_utilization_table.csv`.

## Stage 2 — forecasting

**Method:** `sklearn.ensemble.HistGradientBoostingRegressor` (scikit-learn's
built-in gradient boosting — LightGBM-equivalent, no extra native
dependency) on hourly utilisation %, with lag (1h / 24h / 168h), rolling
same-hour-last-4-weeks mean, hour-of-day, day-of-week, and a promo-active
flag as features. Time-based train/test split (never shuffle time series) —
trained on the first ~13 weeks, tested on the last 3.

**Always compared to a naive "same hour, last week" baseline** — a
forecasting model that can't beat that isn't earning its complexity:

```
Naive (same hour, last week)     MAE=0.76pp   RMSE=1.13pp
HistGradientBoostingRegressor    MAE=0.54pp   RMSE=0.80pp
-> Model beats the naive baseline by 28.8% on MAE
```

Feature importance (permutation, computed on held-out data — more
trustworthy than impurity-based importance for boosted trees) is dominated
by `lag_168h` (last week, same hour) and `lag_1h`, which is expected and
healthy: utilisation is strongly autocorrelated week-over-week, so a model
that ignores that signal would be worse, not better.

**Honest limitation:** `promo_active` showed ~zero importance in this run.
That's not "campaigns don't move utilisation" — it's that the held-out
test window (weeks 15–17) doesn't overlap any of the synthetic promo
windows (weeks 5, 9–11, 13), so the feature never varies in the data
permutation importance is computed on. More fundamentally: next-hour
*forecasting* accuracy and campaign *causal attribution* are different
questions. To actually measure "did this off-peak campaign move
utilisation," you want a treatment/control or pre/post comparison (the
kind of thing the app's own Simulation screen approximates with its
elasticity model), not a feature in a forecasting model.

## Running it

```bash
cd ml/capacity-utilization
pip install -r requirements.txt
python src/run_pipeline.py
```

Fully deterministic (seeded), takes about a minute, writes everything to
`outputs/` (gitignored — it's ~15MB of regeneratable CSVs plus the PNGs
below).

- `outputs/occupancy_reconstruction_validation.png` — one representative
  week per club, true vs. reconstructed vs. naive occupancy overlaid.
- `outputs/forecast_vs_actual.png` — forecast vs. actual utilisation over
  the held-out test weeks, with the 40% off-peak threshold shaded.
- `outputs/forecast_feature_importance.png`
- `outputs/club_utilization_table.csv` — the `ClubUtilization`-shaped
  output.

## Swapping in real data

Replace `src/simulate_data.py`'s output with real exports in the same
shape and the rest of the pipeline runs unchanged:

- `checkins.csv`: `club_id, member_id, checkin_time` — every visit, from
  turnstile/app entry logs.
- `checkouts_sample.csv`: `club_id, member_id, checkin_time, checkout_time,
  duration_minutes` — whatever subset has a real exit signal (app
  check-outs, class end-times as a proxy, or a pilot club with full
  in/out turnstiles). Needs a few hundred samples per club to fit `S(.)`
  reliably; pool across similar clubs if any one club is thin.
- `clubs.csv`: `club_id, name, peak_capacity` — already exists as the
  `Club` table.

If you can instrument even one or two clubs with full in/out tracking for
a few months, that becomes `true_occupancy_15min.csv`'s real-world
equivalent — use it to validate the reconstruction (as done here) before
trusting the check-in-only estimate on the rest of the estate.

## Wiring into the app

`outputs/club_utilization_table.csv` is a drop-in replacement for the
random `ClubUtilization` rows `lib/seed-data.ts` currently generates — a
nightly job would run this pipeline (or an incremental version of Stage 1)
against the previous day's access-control export and upsert into that
table. `forecast.py`'s per-hour predictions are what a "next week's
capacity outlook" feature on the Planning screen would call to decide
which club/hour slots are worth targeting with an off-peak campaign,
instead of the current synthetic `predictedJoins`/`predictedRoi` from
`lib/simulate/elasticity.ts`.
