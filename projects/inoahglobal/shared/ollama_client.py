"""
Unified Ollama API Client for iNoah System.
Provides consistent interface with retry logic and error handling.
"""

import base64
import io
import time
from pathlib import Path
from typing import Optional, Union

import requests
from PIL import Image

from .config_loader import get_ollama_host, get_model, get_nested


class OllamaClient:
    """
    Unified client for Ollama API interactions.
    All iNoah services should use this instead of direct requests.
    """
    
    def __init__(self, host: Optional[str] = None):
        """
        Initialize Ollama client.
        
        Args:
            host: Ollama API URL (defaults to config value)
        """
        self.host = host or get_ollama_host()
        self.timeout = get_nested("ollama.timeout", 120)
    
    def _make_request(
        self,
        endpoint: str,
        payload: dict,
        retries: int = 2
    ) -> dict:
        """
        Make request to Ollama API with retry logic.
        
        Args:
            endpoint: API endpoint (e.g., "/api/generate")
            payload: Request payload
            retries: Number of retry attempts
            
        Returns:
            Response JSON
            
        Raises:
            ConnectionError: If Ollama is unreachable after retries
            RuntimeError: If API returns an error
        """
        url = f"{self.host}{endpoint}"
        
        for attempt in range(retries + 1):
            try:
                response = requests.post(
                    url,
                    json=payload,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    error_msg = response.text[:200]
                    raise RuntimeError(f"Ollama error: {error_msg}")
                    
            except requests.exceptions.ConnectionError:
                if attempt < retries:
                    time.sleep(1)
                    continue
                raise ConnectionError(
                    f"Cannot connect to Ollama at {self.host}. "
                    "Ensure Ollama is running."
                )
            except requests.exceptions.Timeout:
                if attempt < retries:
                    continue
                raise RuntimeError(
                    f"Ollama request timed out after {self.timeout}s"
                )
        
        raise RuntimeError("Ollama request failed after retries")
    
    def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        stream: bool = False
    ) -> str:
        """
        Generate text completion.
        
        Args:
            prompt: The prompt to send
            model: Model name (defaults to reasoning model from config)
            stream: Whether to stream response (not implemented)
            
        Returns:
            Generated text response
        """
        model = model or get_model("reasoning")
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream
        }
        
        result = self._make_request("/api/generate", payload)
        return result.get("response", "")
    
    def vision(
        self,
        prompt: str,
        image: Union[str, Path, bytes, Image.Image],
        model: Optional[str] = None
    ) -> str:
        """
        Analyze image with vision model.
        
        Args:
            prompt: Question/instruction about the image
            image: Image as path, bytes, base64 string, or PIL Image
            model: Vision model name (defaults to config)
            
        Returns:
            Vision model response
        """
        model = model or get_model("vision")
        
        # Convert image to base64
        if isinstance(image, (str, Path)):
            image_path = Path(image)
            if image_path.exists():
                with open(image_path, "rb") as f:
                    img_bytes = f.read()
                img_b64 = base64.b64encode(img_bytes).decode("utf-8")
            else:
                # Assume it's already base64
                img_b64 = str(image)
        elif isinstance(image, bytes):
            img_b64 = base64.b64encode(image).decode("utf-8")
        elif isinstance(image, Image.Image):
            buffer = io.BytesIO()
            image.save(buffer, format="JPEG")
            img_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        else:
            raise ValueError(f"Unsupported image type: {type(image)}")
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "images": [img_b64]
        }
        
        result = self._make_request("/api/generate", payload)
        return result.get("response", "")
    
    def chat(
        self,
        messages: list,
        model: Optional[str] = None,
        images: Optional[list] = None
    ) -> str:
        """
        Multi-turn chat completion.
        
        Args:
            messages: List of {"role": "user/assistant", "content": "..."}
            model: Model name
            images: Optional list of image paths for vision
            
        Returns:
            Assistant response
        """
        model = model or get_model("reasoning")
        
        # Handle images in the last message if provided
        if images:
            model = get_model("vision")
            if messages:
                messages[-1]["images"] = images
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": False
        }
        
        result = self._make_request("/api/chat", payload)
        return result.get("message", {}).get("content", "")
    
    def is_available(self) -> bool:
        """Check if Ollama is running and reachable."""
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def list_models(self) -> list:
        """Get list of available models."""
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=10)
            if response.status_code == 200:
                data = response.json()
                return [m["name"] for m in data.get("models", [])]
            return []
        except:
            return []



