"""Runs the full pipeline end to end: simulate -> reconstruct -> forecast."""

import simulate_data
import occupancy_reconstruction
import forecast


def main():
    print("=" * 70)
    print("STAGE 0: simulating a synthetic access-control export")
    print("=" * 70)
    simulate_data.main()

    print("\n" + "=" * 70)
    print("STAGE 1: reconstructing occupancy from check-in-only swipes")
    print("=" * 70)
    occupancy_reconstruction.main()

    print("\n" + "=" * 70)
    print("STAGE 2: forecasting future utilisation")
    print("=" * 70)
    forecast.main()


if __name__ == "__main__":
    main()
