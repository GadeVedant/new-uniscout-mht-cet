from __future__ import annotations
import time
from collections import deque
from threading import Lock
from app.schemas import MetricsResponse


class MetricsCollector:
    def __init__(self) -> None:
        self._lock = Lock()
        self._total_predictions = 0
        self._latencies: deque[float] = deque(maxlen=1000)
        self._fallback_district = 0
        self._fallback_state = 0
        self._fallback_global = 0
        self._cold_starts = 0
        self._model_version = "unknown"

    def record_prediction(
        self,
        latency_ms: float,
        fallback_reason: str | None = None,
        is_cold_start: bool = False,
    ) -> None:
        with self._lock:
            self._total_predictions += 1
            self._latencies.append(latency_ms)
            if fallback_reason == "district_average":
                self._fallback_district += 1
            elif fallback_reason == "state_average":
                self._fallback_state += 1
            elif fallback_reason == "global_median":
                self._fallback_global += 1
            if is_cold_start:
                self._cold_starts += 1

    def set_model_version(self, version: str) -> None:
        with self._lock:
            self._model_version = version

    def get_metrics(self) -> MetricsResponse:
        with self._lock:
            total = self._total_predictions or 1
            sorted_latencies = sorted(self._latencies)
            p95_idx = int(len(sorted_latencies) * 0.95)
            p95 = sorted_latencies[p95_idx] if sorted_latencies else 0.0
            return MetricsResponse(
                p95_latency_ms=round(p95, 2),
                total_predictions=self._total_predictions,
                fallback_pct_district=round(self._fallback_district / total * 100, 2),
                fallback_pct_state=round(self._fallback_state / total * 100, 2),
                fallback_pct_global=round(self._fallback_global / total * 100, 2),
                cold_start_frequency=round(self._cold_starts / total * 100, 2),
                model_version=self._model_version,
            )


metrics_collector = MetricsCollector()
