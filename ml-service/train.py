"""
Standalone local training script.
Usage:
    python train.py
    python train.py --dry-run
"""
from __future__ import annotations
import argparse
import logging
import os
import sys

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the MHT-CET cutoff prediction model")
    parser.add_argument("--dry-run", action="store_true", help="Run pipeline without saving artifacts")
    args = parser.parse_args()

    data_dir = os.getenv("ML_DATA_DIR", "./data")
    model_dir = os.getenv("ML_MODEL_DIR", "./models")

    logger.info(f"Data dir : {data_dir}")
    logger.info(f"Model dir: {model_dir}")
    logger.info(f"Dry run  : {args.dry_run}")

    from app.data_loader import DataLoader
    from app.feature_engineer import FeatureEngineer
    from app.trainer import Trainer
    from app.cold_start_handler import ColdStartHandler

    logger.info("Loading data...")
    loader = DataLoader()
    df = loader.load(data_dir)
    logger.info(f"Loaded {len(df)} rows")

    logger.info("Engineering features...")
    fe = FeatureEngineer()
    df_feat = fe.fit_transform(df)
    logger.info(f"Feature matrix shape: {df_feat.shape}")

    logger.info("Training model...")
    trainer = Trainer()
    result = trainer.train(df_feat, model_dir, dry_run=args.dry_run)

    logger.info("=" * 50)
    logger.info("Training complete")
    mae = result.get("validation_mae")
    within1 = result.get("validation_within_1_accuracy")
    dir_acc = result.get("validation_directional_accuracy")
    calib = result.get("calibration_coverage")
    val_year = result.get("validation_year", 2024)

    print(f"\n=== Primary validation (year={val_year}) ===")
    print(f"  MAE              : {mae:.4f}" if mae is not None else "  MAE: N/A")
    print(f"  Within-±1 acc    : {within1:.4f}" if within1 is not None else "  Within-±1 acc: N/A")
    within3 = result.get("validation_within_3_accuracy")
    print(f"  Within-±3 acc    : {within3:.4f}" if within3 is not None else "  Within-±3 acc: N/A")
    print(f"  Directional acc  : {dir_acc:.4f}" if dir_acc is not None else "  Directional acc: N/A")
    print(f"  Calibration cov  : {calib:.4f}" if calib is not None else "  Calibration cov: N/A")

    sec = result.get("secondary_2025_r1")
    if sec:
        print(f"\n=== Secondary check (2025 R1 only — early-season simulation) ===")
        print(f"  MAE              : {sec['mae']:.4f}")
        print(f"  Within-±1 acc    : {sec['within_1_accuracy']:.4f}")
        print(f"  Within-±3 acc    : {sec.get('within_3_accuracy', 'N/A')}")
        print(f"  n                : {sec['n']}")
        print(f"  Note             : {sec['note']}")

    if result.get("metrics_by_category"):
        print("\nMetrics by category:")
        for cat, m in result["metrics_by_category"].items():
            print(f"  {cat}: MAE={m['mae']:.4f}  Within±1={m['within_1_accuracy']:.4f}  n={m['n']}")

    if result.get("metrics_by_cap_round"):
        print("\nMetrics by CAP round:")
        for rnd, m in result["metrics_by_cap_round"].items():
            print(f"  {rnd}: MAE={m['mae']:.4f}  Within±1={m['within_1_accuracy']:.4f}  n={m['n']}")

    if result.get("metrics_by_branch"):
        print("\nMetrics by branch (top-10):")
        for branch, m in result["metrics_by_branch"].items():
            print(f"  {branch}: MAE={m['mae']:.4f}  Within±1={m['within_1_accuracy']:.4f}  n={m['n']}")

    if args.dry_run:
        logger.info("Dry run — artifacts NOT saved.")
    else:
        logger.info(f"Artifacts saved to: {model_dir}")
        logger.info("Next steps: git add ml-service/models/ && git commit && git push")


if __name__ == "__main__":
    main()
