"""
Unified LLM Client for iNoah System.
Supports LM Studio (OpenAI-compatible API).
"""

import base64
import io
import time
from pathlib import Path
from typing import Optional, Union, List

import requests
from PIL import Image

from .config_loader import get_llm_host, get_model, get_nested


class LLMClient:
    """
    Unified client for LLM API interactions.
    Uses LM Studio's OpenAI-compatible API.
    All iNoah services should use this for LLM operations.
    """
    
    def __init__(self, host: Optional[str] = None):
        """
        Initialize LLM client.
        
        Args:
            host: LM Studio API URL (defaults to config value)
        """
        self.host = host or get_llm_host()
        self.timeout = get_nested("llm.timeout", 120)
    
    def _make_request(
        self,
        endpoint: str,
        payload: dict,
        retries: int = 2
    ) -> dict:
        """
        Make request to LM Studio API with retry logic.
        
        Args:
            endpoint: API endpoint (e.g., "/v1/chat/completions")
            payload: Request payload
            retries: Number of retry attempts
            
        Returns:
            Response JSON
            
        Raises:
            ConnectionError: If LM Studio is unreachable after retries
            RuntimeError: If API returns an error
        """
        url = f"{self.host}{endpoint}"
        
        for attempt in range(retries + 1):
            try:
                response = requests.post(
                    url,
                    json=payload,
                    timeout=self.timeout,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    error_msg = response.text[:200]
                    raise RuntimeError(f"LLM error: {error_msg}")
                    
            except requests.exceptions.ConnectionError:
                if attempt < retries:
                    time.sleep(1)
                    continue
                raise ConnectionError(
                    f"Cannot connect to LM Studio at {self.host}. "
                    "Ensure LM Studio is running with a model loaded."
                )
            except requests.exceptions.Timeout:
                if attempt < retries:
                    continue
                raise RuntimeError(
                    f"LLM request timed out after {self.timeout}s"
                )
        
        raise RuntimeError("LLM request failed after retries")
    
    def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> str:
        """
        Generate text completion.
        
        Args:
            prompt: The prompt to send
            model: Model name (defaults to reasoning model from config)
            system_prompt: Optional system prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response
        """
        model = model or get_model("reasoning")
        
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }
        
        result = self._make_request("/v1/chat/completions", payload)
        
        # Extract response from OpenAI format
        choices = result.get("choices", [])
        if choices:
            return choices[0].get("message", {}).get("content", "")
        return ""
    
    def vision(
        self,
        prompt: str,
        image: Union[str, Path, bytes, Image.Image],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> str:
        """
        Analyze image with vision model.
        
        Args:
            prompt: Question/instruction about the image
            image: Image as path, bytes, base64 string, or PIL Image
            model: Vision model name (defaults to config)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
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
        
        # Build message with image in OpenAI vision format
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{img_b64}"
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }
        
        result = self._make_request("/v1/chat/completions", payload)
        
        choices = result.get("choices", [])
        if choices:
            return choices[0].get("message", {}).get("content", "")
        return ""
    
    def chat(
        self,
        messages: List[dict],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> str:
        """
        Multi-turn chat completion.
        
        Args:
            messages: List of {"role": "user/assistant/system", "content": "..."}
            model: Model name
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Returns:
            Assistant response
        """
        model = model or get_model("reasoning")
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }
        
        result = self._make_request("/v1/chat/completions", payload)
        
        choices = result.get("choices", [])
        if choices:
            return choices[0].get("message", {}).get("content", "")
        return ""
    
    def is_available(self) -> bool:
        """Check if LM Studio is running and reachable."""
        try:
            response = requests.get(f"{self.host}/v1/models", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def list_models(self) -> list:
        """Get list of available models."""
        try:
            response = requests.get(f"{self.host}/v1/models", timeout=10)
            if response.status_code == 200:
                data = response.json()
                return [m["id"] for m in data.get("data", [])]
            return []
        except:
            return []


# Backwards compatibility alias
OllamaClient = LLMClient
