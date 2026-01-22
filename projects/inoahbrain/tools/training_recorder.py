"""
Training Recorder - Backend-agnostic training data collection for dating preferences.
Records screenshots and user decisions (LIKE/PASS) for model training.
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from typing import Optional

from PIL import Image

# Add inoahglobal to path for shared imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from inoahglobal.shared import get_logger
from inoahglobal.shared.config_loader import get_config


class TrainingRecorder:
    """
    Backend-agnostic training data recorder.
    Works with any screenshot source (browser, VM, screen capture).
    
    Data is stored in a portable format that can be used by any agent backend.
    """
    
    def __init__(self, data_dir: Optional[Path] = None):
        """
        Initialize the training recorder.
        
        Args:
            data_dir: Path to training data directory. Defaults to config setting.
        """
        self.logger = get_logger("training_recorder")
        
        # Get data directory from config or parameter
        if data_dir is None:
            config = get_config()
            base_dir = config.get("training_data", {}).get("base_dir", "training_data")
            # Resolve relative to inoahglobal directory
            inoahglobal_dir = Path(__file__).parent.parent.parent / "inoahglobal"
            self.data_dir = inoahglobal_dir / base_dir / "dating"
        else:
            self.data_dir = Path(data_dir)
        
        # Ensure directories exist
        self.images_dir = self.data_dir / "images"
        self.sessions_dir = self.data_dir / "sessions"
        self.analysis_dir = self.data_dir / "analysis"
        
        for d in [self.images_dir, self.sessions_dir, self.analysis_dir]:
            d.mkdir(parents=True, exist_ok=True)
        
        # Paths for data files
        self.manifest_path = self.data_dir / "manifest.jsonl"
        self.config_path = self.data_dir / "dataset_config.json"
        
        # Session state
        self._session_id: Optional[str] = None
        self._session_start: Optional[datetime] = None
        self._session_backend: str = "unknown"
        self._session_samples: list = []
        self._last_sample_time: Optional[float] = None
        self._sample_counter: int = 0
        
        # Load or create dataset config
        self._load_or_create_config()
        
        self.logger.info(f"TrainingRecorder initialized: {self.data_dir}")
    
    def _load_or_create_config(self):
        """Load existing dataset config or create new one."""
        if self.config_path.exists():
            with open(self.config_path, 'r') as f:
                self._dataset_config = json.load(f)
        else:
            self._dataset_config = {
                "schema_version": "1.0",
                "created": datetime.now().isoformat() + "Z",
                "platform": "tinder",
                "image_format": "jpeg",
                "image_dimensions": {"width": 1920, "height": 1080},
                "labels": ["LIKE", "PASS"],
                "total_samples": 0,
                "description": "Noah's dating preference training data"
            }
            self._save_config()
    
    def _save_config(self):
        """Save dataset config to disk."""
        with open(self.config_path, 'w') as f:
            json.dump(self._dataset_config, f, indent=2)
    
    @property
    def is_recording(self) -> bool:
        """Check if a recording session is active."""
        return self._session_id is not None
    
    def start_session(self, backend: str = "unknown", platform: str = "tinder") -> str:
        """
        Start a new recording session.
        
        Args:
            backend: The backend being used (e.g., "playwright", "vm", "pyautogui")
            platform: The dating platform (e.g., "tinder", "hinge", "bumble")
            
        Returns:
            Session ID string
        """
        if self.is_recording:
            self.logger.warning("Session already active, ending previous session")
            self.end_session()
        
        # Generate session ID from timestamp
        now = datetime.now()
        self._session_id = f"sess_{now.strftime('%Y%m%d_%H%M%S')}"
        self._session_start = now
        self._session_backend = backend
        self._session_samples = []
        self._last_sample_time = time.time()
        self._sample_counter = 0
        
        self.logger.info(f"Started recording session: {self._session_id} (backend={backend})")
        
        return self._session_id
    
    def record_sample(
        self,
        screenshot: Image.Image,
        label: str,
        thinking_time_ms: Optional[int] = None
    ) -> dict:
        """
        Record a single labeled sample.
        
        Args:
            screenshot: PIL Image of the profile
            label: Decision label ("LIKE" or "PASS")
            thinking_time_ms: Time spent looking at profile (auto-calculated if None)
            
        Returns:
            Sample metadata dict
        """
        if not self.is_recording:
            raise RuntimeError("No active recording session. Call start_session() first.")
        
        # Normalize label
        label = label.upper()
        if label not in ["LIKE", "PASS"]:
            raise ValueError(f"Invalid label: {label}. Must be LIKE or PASS.")
        
        # Calculate thinking time if not provided
        current_time = time.time()
        if thinking_time_ms is None:
            thinking_time_ms = int((current_time - self._last_sample_time) * 1000)
        self._last_sample_time = current_time
        
        # Generate sample ID and filename
        self._sample_counter += 1
        timestamp = datetime.now()
        sample_id = f"{timestamp.strftime('%Y%m%d_%H%M%S')}_{self._sample_counter:03d}"
        image_filename = f"{sample_id}.jpg"
        image_path = self.images_dir / image_filename
        
        # Save screenshot
        config = get_config()
        image_quality = config.get("training_data", {}).get("dating", {}).get("image_quality", 90)
        screenshot.save(image_path, "JPEG", quality=image_quality)
        
        # Create sample record
        sample = {
            "id": sample_id,
            "image": f"images/{image_filename}",
            "label": label,
            "thinking_time_ms": thinking_time_ms,
            "session": self._session_id,
            "timestamp": timestamp.isoformat() + "Z",
            "backend": self._session_backend,
            "platform": self._dataset_config.get("platform", "tinder")
        }
        
        # Append to manifest
        with open(self.manifest_path, 'a') as f:
            f.write(json.dumps(sample) + "\n")
        
        # Track in session
        self._session_samples.append(sample)
        
        # Update dataset config
        self._dataset_config["total_samples"] = self._dataset_config.get("total_samples", 0) + 1
        self._save_config()
        
        self.logger.info(f"Recorded sample: {sample_id} ({label})")
        
        return sample
    
    def end_session(self, auto_analyze: bool = True) -> dict:
        """
        End the current recording session.
        
        Args:
            auto_analyze: If True and enough samples, trigger preference analysis
            
        Returns:
            Session summary dict
        """
        if not self.is_recording:
            return {"status": "no_session", "message": "No active session to end"}
        
        # Calculate session stats
        likes = sum(1 for s in self._session_samples if s["label"] == "LIKE")
        passes = sum(1 for s in self._session_samples if s["label"] == "PASS")
        duration_seconds = (datetime.now() - self._session_start).total_seconds()
        
        session_summary = {
            "session_id": self._session_id,
            "backend": self._session_backend,
            "started": self._session_start.isoformat() + "Z",
            "ended": datetime.now().isoformat() + "Z",
            "duration_seconds": int(duration_seconds),
            "total_samples": len(self._session_samples),
            "likes": likes,
            "passes": passes,
            "like_rate": likes / len(self._session_samples) if self._session_samples else 0
        }
        
        # Save session metadata
        session_file = self.sessions_dir / f"{self._session_id}.json"
        with open(session_file, 'w') as f:
            json.dump(session_summary, f, indent=2)
        
        self.logger.info(f"Session ended: {self._session_id} - {len(self._session_samples)} samples")
        
        # Check for auto-analysis
        config = get_config()
        threshold = config.get("training_data", {}).get("dating", {}).get("auto_analyze_threshold", 30)
        should_sync = config.get("training_data", {}).get("dating", {}).get("auto_sync_to_memory", True)
        
        if auto_analyze and self._dataset_config.get("total_samples", 0) >= threshold:
            self.logger.info(f"Threshold reached ({threshold}+ samples), triggering analysis...")
            try:
                from .preference_analyzer import PreferenceAnalyzer
                analyzer = PreferenceAnalyzer(self.data_dir)
                analyzer.analyze_patterns()
                if should_sync:
                    analyzer.ingest_to_memory()
                session_summary["analysis_triggered"] = True
            except Exception as e:
                self.logger.error(f"Auto-analysis failed: {e}")
                session_summary["analysis_error"] = str(e)
        
        # Reset session state
        self._session_id = None
        self._session_start = None
        self._session_samples = []
        
        return session_summary
    
    def get_stats(self) -> dict:
        """
        Get dataset statistics.
        
        Returns:
            Stats dict with sample counts, session info, etc.
        """
        # Count samples from manifest
        total_samples = 0
        likes = 0
        passes = 0
        
        if self.manifest_path.exists():
            with open(self.manifest_path, 'r') as f:
                for line in f:
                    if line.strip():
                        sample = json.loads(line)
                        total_samples += 1
                        if sample.get("label") == "LIKE":
                            likes += 1
                        elif sample.get("label") == "PASS":
                            passes += 1
        
        # Count sessions
        sessions = list(self.sessions_dir.glob("sess_*.json"))
        
        return {
            "total_samples": total_samples,
            "likes": likes,
            "passes": passes,
            "like_rate": likes / total_samples if total_samples > 0 else 0,
            "session_count": len(sessions),
            "recording_active": self.is_recording,
            "current_session": self._session_id,
            "data_dir": str(self.data_dir)
        }


# Singleton instance
_recorder_instance: Optional[TrainingRecorder] = None


def get_training_recorder() -> TrainingRecorder:
    """Get the singleton TrainingRecorder instance."""
    global _recorder_instance
    if _recorder_instance is None:
        _recorder_instance = TrainingRecorder()
    return _recorder_instance





