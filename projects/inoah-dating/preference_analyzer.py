"""
Preference Analyzer - Extracts dating preference patterns from training data.
"""

import sys
import json
import random
from pathlib import Path
from datetime import datetime
from typing import Optional, List

from PIL import Image

# Add inoah-core to path for development
sys.path.insert(0, str(Path(__file__).parent.parent / "inoah-core" / "src"))

from inoah_core import get_logger, get_config, get_identity, LLMClient


class PreferenceAnalyzer:
    """
    Analyzes training data to extract dating preference patterns.
    Uses vision model to identify common traits in LIKE vs PASS profiles.
    """
    
    def __init__(self, data_dir: Optional[Path] = None):
        self.logger = get_logger("preference-analyzer")
        self.llm = LLMClient()
        
        # Get data directory
        if data_dir is None:
            config = get_config()
            base_dir = config.get("training_data", {}).get("base_dir", "training_data")
            self.data_dir = Path(__file__).parent / base_dir / "dating"
        else:
            self.data_dir = Path(data_dir)
        
        self.manifest_path = self.data_dir / "manifest.jsonl"
        self.analysis_dir = self.data_dir / "analysis"
        self.analysis_dir.mkdir(parents=True, exist_ok=True)
        
        # Results
        self._patterns: Optional[dict] = None
        self._summary: Optional[str] = None
        
        self.logger.info(f"PreferenceAnalyzer initialized: {self.data_dir}")
    
    def _load_samples(self) -> tuple[List[dict], List[dict]]:
        """Load samples from manifest, separated by label."""
        likes = []
        passes = []
        
        if not self.manifest_path.exists():
            return likes, passes
        
        with open(self.manifest_path, 'r') as f:
            for line in f:
                if line.strip():
                    sample = json.loads(line)
                    if sample.get("label") == "LIKE":
                        likes.append(sample)
                    elif sample.get("label") == "PASS":
                        passes.append(sample)
        
        return likes, passes
    
    def _analyze_sample_batch(self, samples: List[dict], label: str, max_samples: int = 10) -> str:
        """Analyze a batch of samples to find common patterns."""
        if not samples:
            return f"No {label} samples available for analysis."
        
        if len(samples) > max_samples:
            samples = random.sample(samples, max_samples)
        
        descriptions = []
        
        for sample in samples:
            image_path = self.data_dir / sample["image"]
            if not image_path.exists():
                continue
            
            try:
                prompt = """Describe this dating profile screenshot briefly. Focus on:
- Physical appearance and style
- Photo quality and setting
- Any visible bio text or interests
- Overall vibe and energy

Keep it to 2-3 sentences. Be objective and factual."""
                
                description = self.llm.vision(prompt, str(image_path))
                descriptions.append(description)
            except Exception as e:
                self.logger.warning(f"Failed to analyze {sample['id']}: {e}")
        
        if not descriptions:
            return f"Could not analyze {label} samples."
        
        # Synthesize patterns
        combined_prompt = f"""I have analyzed {len(descriptions)} dating profiles that were marked as {label}.

Here are the descriptions:

{chr(10).join(f"Profile {i+1}: {d}" for i, d in enumerate(descriptions))}

What are the COMMON PATTERNS across these profiles?

List 3-5 key patterns. Be specific and concise."""
        
        try:
            return self.llm.generate(combined_prompt)
        except Exception as e:
            self.logger.error(f"Pattern synthesis failed: {e}")
            return f"Pattern analysis failed: {e}"
    
    def analyze_patterns(self, min_samples: int = 10) -> dict:
        """Analyze LIKE vs PASS patterns using vision model."""
        self.logger.info("Starting preference pattern analysis...")
        
        likes, passes = self._load_samples()
        
        if len(likes) + len(passes) < min_samples:
            self.logger.warning(f"Not enough samples ({len(likes) + len(passes)} < {min_samples})")
            return {
                "status": "insufficient_data",
                "total_samples": len(likes) + len(passes),
                "min_required": min_samples
            }
        
        self.logger.info(f"Analyzing {len(likes)} LIKE samples...")
        like_patterns = self._analyze_sample_batch(likes, "LIKE")
        
        self.logger.info(f"Analyzing {len(passes)} PASS samples...")
        pass_patterns = self._analyze_sample_batch(passes, "PASS")
        
        # Generate comparative analysis
        identity = get_identity()
        name = identity.get("name", "Noah")
        
        compare_prompt = f"""Based on {name}'s dating swipe history:

PROFILES THEY LIKED ({len(likes)} samples):
{like_patterns}

PROFILES THEY PASSED ON ({len(passes)} samples):
{pass_patterns}

Generate a brief preference profile:
1. What they LIKE (3-4 traits)
2. What they PASS on (3-4 traits)
3. Strong positive signals (1-2 attractors)
4. Red flags (1-2 dealbreakers)

Be specific and concise. Use bullet points."""
        
        try:
            comparative_analysis = self.llm.generate(compare_prompt)
        except Exception as e:
            self.logger.error(f"Comparative analysis failed: {e}")
            comparative_analysis = "Analysis unavailable"
        
        self._patterns = {
            "analyzed_at": datetime.now().isoformat() + "Z",
            "sample_count": {
                "likes": len(likes),
                "passes": len(passes),
                "total": len(likes) + len(passes)
            },
            "like_patterns": like_patterns,
            "pass_patterns": pass_patterns,
            "comparative_analysis": comparative_analysis
        }
        
        # Save results
        analysis_file = self.analysis_dir / "preferences_latest.json"
        with open(analysis_file, 'w') as f:
            json.dump(self._patterns, f, indent=2)
        
        self.logger.info("Pattern analysis complete")
        
        return self._patterns
    
    def generate_preference_summary(self) -> str:
        """Generate natural language summary for memory storage."""
        if self._patterns is None:
            self.analyze_patterns()
        
        if self._patterns is None or self._patterns.get("status") == "insufficient_data":
            return "Insufficient dating training data for preference analysis."
        
        identity = get_identity()
        name = identity.get("name", "Noah")
        
        summary_prompt = f"""Convert this preference analysis into a concise paragraph about {name}'s dating preferences.

Analysis data:
{self._patterns.get('comparative_analysis', '')}

Sample count: {self._patterns.get('sample_count', {}).get('total', 0)} profiles analyzed

Write 2-3 sentences in third person:
"{name}'s dating preferences, based on X analyzed profiles: [summary]."

Be factual and concise."""
        
        try:
            self._summary = self.llm.generate(summary_prompt)
        except Exception as e:
            self.logger.error(f"Summary generation failed: {e}")
            self._summary = f"{name}'s dating preferences could not be analyzed."
        
        # Save summary
        summary_file = self.analysis_dir / "preferences_summary.txt"
        with open(summary_file, 'w') as f:
            f.write(self._summary)
        
        return self._summary
    
    def ingest_to_memory(self) -> str:
        """Store preference summary in Exocortex memory."""
        if self._summary is None:
            self.generate_preference_summary()
        
        if not self._summary or "could not be analyzed" in self._summary:
            self.logger.warning("No valid summary to ingest")
            return ""
        
        try:
            from inoah_core.memory import get_memory_store, MemoryStore
            
            store = get_memory_store()
            
            doc_id = store.add_memory(
                text=self._summary,
                collection=MemoryStore.COLLECTION_IDENTITY,
                metadata={
                    "source": "dating_training",
                    "sample_count": self._patterns.get("sample_count", {}).get("total", 0),
                    "analyzed_at": self._patterns.get("analyzed_at", datetime.now().isoformat()),
                    "type": "dating_preferences"
                }
            )
            
            self.logger.info(f"Preferences synced to Exocortex: {doc_id}")
            return doc_id
            
        except Exception as e:
            self.logger.error(f"Memory ingestion failed: {e}")
            return ""
    
    def get_patterns(self) -> Optional[dict]:
        """Get the current pattern analysis results."""
        return self._patterns
    
    def get_summary(self) -> Optional[str]:
        """Get the current preference summary."""
        return self._summary


# Singleton instance
_analyzer_instance: Optional[PreferenceAnalyzer] = None


def get_preference_analyzer() -> PreferenceAnalyzer:
    """Get the singleton PreferenceAnalyzer instance."""
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = PreferenceAnalyzer()
    return _analyzer_instance
