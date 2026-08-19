"""
Stage 2: forecast future utilisation % per club, per hour.

This is the piece that actually powers "which slots will be under-utilised
next week" — i.e. what a real version of this app's Simulation/Planning
screens would call to decide where an off-peak campaign should run.

Model: HistGradientBoostingRegressor (scikit-learn's built-in, LightGBM-like
gradient boosting — no external boosting library needed). Always compared
against a naive "same hour, last week" baseline, because a forecasting model
that can't beat that baseline isn't earning its complexity.
"""

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, mean_squared_error

OUT = Path(__file__).resolve().parent.parent / "outputs"

# Same promo windows as simulate_data.py -- in production this would be a
# join against the Campaign table's active date ranges, not a hardcoded list.
PROMO_WINDOWS = [
    ("bexleyheath", 30, 37),
    ("altrincham", 60, 74),
    ("birmingham_broad_street", 90, 97),
]


def build_hourly_series() -> pd.DataFrame:
    df = pd.read_csv(OUT / "reconstructed_occupancy_15min.csv", parse_dates=["timestamp"])
    df = df.set_index("timestamp").groupby("club_id").resample("1h")["utilization_pct"].mean().reset_index()
    df = df.rename(columns={"level_1": "timestamp"}) if "level_1" in df.columns else df
    return df


def add_promo_flag(df: pd.DataFrame, start: pd.Timestamp) -> pd.Series:
    day_idx = (df["timestamp"] - start).dt.days
    flag = pd.Series(False, index=df.index)
    for club_id, d0, d1 in PROMO_WINDOWS:
        flag |= (df["club_id"] == club_id) & (day_idx >= d0) & (day_idx <= d1)
    return flag.astype(int)


def make_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["club_id", "timestamp"]).reset_index(drop=True)
    start = df["timestamp"].min()

    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["day_index"] = (df["timestamp"] - start).dt.days
    df["promo_active"] = add_promo_flag(df, start)

    g = df.groupby("club_id")["utilization_pct"]
    df["lag_1h"] = g.shift(1)
    df["lag_24h"] = g.shift(24)
    df["lag_168h"] = g.shift(168)  # same hour, 1 week ago -- also the naive baseline
    df["roll_mean_7d_same_hour"] = g.transform(lambda s: s.shift(24).rolling(24 * 7, min_periods=24 * 2).mean())

    df = pd.get_dummies(df, columns=["club_id"], prefix="club")
    return df.dropna().reset_index(drop=True)


def main():
    hourly = build_hourly_series()
    feat = make_features(hourly)

    feature_cols = [c for c in feat.columns if c not in ("timestamp", "utilization_pct")]
    target = "utilization_pct"

    # Time-based split: last 3 weeks held out. Never shuffle time series data.
    cutoff = feat["timestamp"].max() - pd.Timedelta(days=21)
    train = feat[feat["timestamp"] < cutoff]
    test = feat[feat["timestamp"] >= cutoff]
    print(f"Train: {len(train):,} rows ({train.timestamp.min().date()} -> {train.timestamp.max().date()})")
    print(f"Test:  {len(test):,} rows ({test.timestamp.min().date()} -> {test.timestamp.max().date()})")

    model = HistGradientBoostingRegressor(max_depth=6, learning_rate=0.08, max_iter=300, random_state=42)
    model.fit(train[feature_cols], train[target])
    pred = model.predict(test[feature_cols])

    naive_pred = test["lag_168h"]  # "same hour, last week" -- the baseline to beat

    def report(name, y_true, y_pred):
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        print(f"  {name:32s} MAE={mae:5.2f}pp   RMSE={rmse:5.2f}pp")
        return mae

    print("\nTest-set accuracy (percentage points of utilisation):")
    mae_naive = report("Naive (same hour, last week)", test[target], naive_pred)
    mae_model = report("HistGradientBoostingRegressor", test[target], pred)
    improvement = (mae_naive - mae_model) / mae_naive * 100
    print(f"\n  -> Model beats the naive baseline by {improvement:.1f}% on MAE.")

    # Permutation importance -- more trustworthy than impurity-based importance
    # for gradient boosting, and it's computed on held-out data.
    imp = permutation_importance(model, test[feature_cols], test[target], n_repeats=8, random_state=42, n_jobs=-1)
    importance_df = pd.DataFrame({"feature": feature_cols, "importance": imp.importances_mean}).sort_values(
        "importance", ascending=False
    )
    importance_df.to_csv(OUT / "forecast_feature_importance.csv", index=False)
    print("\nTop features:")
    print(importance_df.head(8).to_string(index=False))

    test = test.copy()
    test["predicted_utilization_pct"] = pred
    test.assign(club_id=test.filter(like="club_").idxmax(axis=1).str.replace("club_", "", regex=False)).to_csv(
        OUT / "forecast_test_predictions.csv", index=False
    )

    # Plot: predicted vs actual for one club over the test window, highlighting
    # off-peak troughs -- this is the exact view a planner would use to decide
    # where to target a utilisation campaign.
    club_col = [c for c in feature_cols if c.startswith("club_")][0]
    plot_club = test[test[club_col] == 1]
    fig, ax = plt.subplots(figsize=(11, 4))
    ax.plot(plot_club["timestamp"], plot_club[target], label="Actual", color="#0b1b2e", linewidth=1.4)
    ax.plot(plot_club["timestamp"], plot_club["predicted_utilization_pct"], label="Forecast", color="#10b981", linewidth=1.4, linestyle="--")
    ax.axhline(40, color="#f59e0b", linestyle=":", linewidth=1, label="40% off-peak threshold")
    ax.fill_between(plot_club["timestamp"], 0, 40, color="#f59e0b", alpha=0.06)
    ax.set_title(f"Forecast vs actual utilisation — {club_col.replace('club_', '')} (held-out test weeks)")
    ax.set_ylabel("Utilisation %")
    ax.legend(fontsize=9)
    fig.tight_layout()
    fig.savefig(OUT / "forecast_vs_actual.png", dpi=150)
    print(f"\nSaved forecast plot to {OUT / 'forecast_vs_actual.png'}")

    fig2, ax2 = plt.subplots(figsize=(7, 4.5))
    top = importance_df.head(10).iloc[::-1]
    ax2.barh(top["feature"], top["importance"], color="#0b1b2e")
    ax2.set_title("Permutation feature importance (held-out MAE reduction)")
    fig2.tight_layout()
    fig2.savefig(OUT / "forecast_feature_importance.png", dpi=150)
    print(f"Saved feature importance plot to {OUT / 'forecast_feature_importance.png'}")


if __name__ == "__main__":
    main()
