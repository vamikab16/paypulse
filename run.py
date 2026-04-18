"""
PayPulse — AI Early Warning System for SME Financial Stress
===========================================================
Single entry point: generates data, starts the API server, and serves the frontend.

Usage:
    python run.py
"""

import sys
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Ensure the project root is on the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    """Start PayPulse: generate data if needed, then launch the server."""
    print()
    print("=" * 60)
    print("  PayPulse — AI Early Warning System")
    print("  Detecting SME financial stress before it's too late")
    print("=" * 60)
    print()

    # Step 1: Generate synthetic data if not present
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    csv_path = os.path.join(data_dir, "payment_history.csv")

    if not os.path.exists(csv_path):
        print("[1/2] Generating synthetic data...")
        from src.data.generator import save_data
        df, profile = save_data(data_dir)
        print(f"      ✓ Generated {len(df)} payment records for {profile['company_name']}")
        print(f"      ✓ Data saved to {data_dir}/")
    else:
        print("[1/2] Data already exists, skipping generation.")
        print(f"      (Delete {data_dir}/ to regenerate)")

    # Step 2: Start the FastAPI server
    print("[2/2] Starting API server...")
    print()
    print("  ┌─────────────────────────────────────────────┐")
    print("  │                                             │")
    print("  │   PayPulse is running at:                   │")
    print("  │   http://localhost:8000                      │")
    print("  │                                             │")
    print("  │   Press Ctrl+C to stop                      │")
    print("  │                                             │")
    print("  └─────────────────────────────────────────────┘")
    print()

    import uvicorn
    from src.api.server import app

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")


if __name__ == "__main__":
    main()
