"""
Training Data Loader - Load and access training data for any agent backend.
Provides utilities to retrieve labeled samples, examples, and statistics.
"""

import os
import sys
import json
import random
from pathlib import Path
from typing import Optional, Generator

from PIL import Image

# Add inoahglobal to path for shared imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from inoahglobal.shared import get_logger
from inoahglobal.shared.config_loader import get_config


class TrainingDataLoader:
    """
    Load and analyze training data for any agent backend.
    Provides access to labeled samples regardless of how they were collected.
    """
    
    def __init__(self, data_dir: Optional[Path] = None):
        """
        Initialize the training data loader.
        
        Args:
            data_dir: Path to training data directory. Defaults to config setting.
        """
        self.logger = get_logger("training_loader")
        
        # Get data directory from config or parameter
        if data_dir is None:
            config = get_config()
            base_dir = config.get("training_data", {}).get("base_dir", "training_data")
            inoahglobal_dir = Path(__file__).parent.parent.parent / "inoahglobal"
            self.data_dir = inoahglobal_dir / base_dir / "dating"
        else:
            self.data_dir = Path(data_dir)
        
        self.manifest_path = self.data_dir / "manifest.jsonl"
        self.config_path = self.data_dir / "dataset_config.json"
        self.analysis_dir = self.data_dir / "analysis"
        
        self.logger.info(f"TrainingDataLoader initialized: {self.data_dir}")
    
    def load_manifest(self) -> list[dict]:
        """
        Load all labeled samples from manifest.
        
        Returns:
            List of sample dicts
        """
        samples = []
        
        if not self.manifest_path.exists():
            return samples
        
        with open(self.manifest_path, 'r') as f:
            for line in f:
                if line.strip():
                    samples.append(json.loads(line))
        
        return samples
    
    def iter_samples(self, label: Optional[str] = None) -> Generator[dict, None, None]:
        """
        Iterate over samples, optionally filtered by label.
        
        Args:
            label: Optional filter ("LIKE" or "PASS")
            
        Yields:
            Sample dicts
        """
        if not self.manifest_path.exists():
            return
        
        with open(self.manifest_path, 'r') as f:
            for line in f:
                if line.strip():
                    sample = json.loads(line)
                    if label is None or sample.get("label") == label.upper():
                        yield sample
    
    def get_sample_image(self, sample: dict) -> Optional[Image.Image]:
        """
        Load the image for a sample.
        
        Args:
            sample: Sample dict with 'image' key
            
        Returns:
            PIL Image or None if not found
        """
        image_path = self.data_dir / sample.get("image", "")
        
        if not image_path.exists():
            self.logger.warning(f"Image not found: {image_path}")
            return None
        
        return Image.open(image_path)
    
    def get_like_examples(self, n: int = 5, random_sample: bool = True) -> list[Image.Image]:
        """
        Get N example screenshots of profiles that were liked.
        
        Args:
            n: Number of examples to return
            random_sample: If True, randomly sample; otherwise return most recent
            
        Returns:
            List of PIL Images
        """
        likes = [s for s in self.iter_samples("LIKE")]
        
        if not likes:
            return []
        
        if random_sample and len(likes) > n:
            likes = random.sample(likes, n)
        else:
            likes = likes[-n:]  # Most recent
        
        images = []
        for sample in likes:
            img = self.get_sample_image(sample)
            if img:
                images.append(img)
        
        return images
    
    def get_pass_examples(self, n: int = 5, random_sample: bool = True) -> list[Image.Image]:
        """
        Get N example screenshots of profiles that were passed.
        
        Args:
            n: Number of examples to return
            random_sample: If True, randomly sample; otherwise return most recent
            
        Returns:
            List of PIL Images
        """
        passes = [s for s in self.iter_samples("PASS")]
        
        if not passes:
            return []
        
        if random_sample and len(passes) > n:
            passes = random.sample(passes, n)
        else:
            passes = passes[-n:]  # Most recent
        
        images = []
        for sample in passes:
            img = self.get_sample_image(sample)
            if img:
                images.append(img)
        
        return images
    
    def get_preference_summary(self) -> Optional[str]:
        """
        Get the latest preference summary from analysis.
        
        Returns:
            Preference summary text or None
        """
        summary_path = self.analysis_dir / "preferences_summary.txt"
        
        if not summary_path.exists():
            return None
        
        with open(summary_path, 'r') as f:
            return f.read().strip()
    
    def get_patterns(self) -> Optional[dict]:
        """
        Get the latest pattern analysis.
        
        Returns:
            Pattern analysis dict or None
        """
        patterns_path = self.analysis_dir / "preferences_latest.json"
        
        if not patterns_path.exists():
            return None
        
        with open(patterns_path, 'r') as f:
            return json.load(f)
    
    def get_stats(self) -> dict:
        """
        Get training data statistics.
        
        Returns:
            Stats dict with counts and rates
        """
        samples = self.load_manifest()
        
        likes = [s for s in samples if s.get("label") == "LIKE"]
        passes = [s for s in samples if s.get("label") == "PASS"]
        
        # Calculate average thinking time
        like_times = [s.get("thinking_time_ms", 0) for s in likes if s.get("thinking_time_ms")]
        pass_times = [s.get("thinking_time_ms", 0) for s in passes if s.get("thinking_time_ms")]
        
        # Get unique sessions and backends
        sessions = set(s.get("session") for s in samples if s.get("session"))
        backends = set(s.get("backend") for s in samples if s.get("backend"))
        
        return {
            "total_samples": len(samples),
            "likes": len(likes),
            "passes": len(passes),
            "like_rate": len(likes) / len(samples) if samples else 0,
            "avg_like_thinking_ms": sum(like_times) / len(like_times) if like_times else 0,
            "avg_pass_thinking_ms": sum(pass_times) / len(pass_times) if pass_times else 0,
            "session_count": len(sessions),
            "backends_used": list(backends),
            "has_analysis": (self.analysis_dir / "preferences_latest.json").exists(),
            "data_dir": str(self.data_dir)
        }
    
    def get_samples_by_session(self, session_id: str) -> list[dict]:
        """
        Get all samples from a specific session.
        
        Args:
            session_id: Session ID string
            
        Returns:
            List of sample dicts
        """
        return [s for s in self.iter_samples() if s.get("session") == session_id]
    
    def get_sessions(self) -> list[dict]:
        """
        Get list of all recording sessions.
        
        Returns:
            List of session metadata dicts
        """
        sessions_dir = self.data_dir / "sessions"
        sessions = []
        
        if not sessions_dir.exists():
            return sessions
        
        for session_file in sessions_dir.glob("sess_*.json"):
            with open(session_file, 'r') as f:
                sessions.append(json.load(f))
        
        # Sort by start time
        sessions.sort(key=lambda s: s.get("started", ""), reverse=True)
        
        return sessions


# Singleton instance
_loader_instance: Optional[TrainingDataLoader] = None


def get_training_loader() -> TrainingDataLoader:
    """Get the singleton TrainingDataLoader instance."""
    global _loader_instance
    if _loader_instance is None:
        _loader_instance = TrainingDataLoader()
    return _loader_instance





