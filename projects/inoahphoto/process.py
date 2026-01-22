#!/usr/bin/env python3
"""
Face swap and enhancement using FaceFusion CLI.
Uses CoreML for acceleration and GPEN-BFR-512 for face enhancement.
Configuration is in facefusion/facefusion.ini
"""

import os
import subprocess
import sys
from pathlib import Path

# --- CONFIG ---
SCRIPT_DIR = Path(__file__).parent.absolute()
REF_FOLDER = SCRIPT_DIR / "reference_faces"
RAW_FOLDER = SCRIPT_DIR / "raw_photos"
OUTPUT_FOLDER = SCRIPT_DIR / "output"

# FaceFusion paths
FACEFUSION_DIR = SCRIPT_DIR / "facefusion"
FACEFUSION_SCRIPT = FACEFUSION_DIR / "facefusion.py"
# ----------------


def get_reference_images() -> list[Path]:
    """Get all reference face images from the reference folder."""
    extensions = {'.png', '.jpg', '.jpeg', '.webp'}
    images = []
    
    for file in REF_FOLDER.iterdir():
        if file.suffix.lower() in extensions and file.is_file():
            images.append(file)
    
    return sorted(images)


def get_raw_photos() -> list[Path]:
    """Get all photos to process from the raw folder."""
    extensions = {'.png', '.jpg', '.jpeg', '.webp'}
    photos = []
    
    for file in RAW_FOLDER.iterdir():
        if file.suffix.lower() in extensions and file.is_file():
            photos.append(file)
    
    return sorted(photos)


def build_facefusion_command(
    source_images: list[Path],
    target_image: Path,
    output_path: Path
) -> list[str]:
    """Build the FaceFusion CLI command."""
    cmd = [
        sys.executable,
        str(FACEFUSION_SCRIPT),
        "headless-run",
    ]
    
    # Add all source/reference images (use -s for source paths)
    cmd.append("-s")
    for source in source_images:
        cmd.append(str(source.absolute()))
    
    # Target and output (absolute paths)
    cmd.extend([
        "-t", str(target_image.absolute()),
        "-o", str(output_path.absolute()),
    ])
    
    return cmd


def process_image(
    source_images: list[Path],
    target_image: Path,
    output_path: Path
) -> bool:
    """Process a single image with FaceFusion."""
    cmd = build_facefusion_command(source_images, target_image, output_path)
    
    print(f"[*] Processing: {target_image.name}")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(FACEFUSION_DIR)  # Run from facefusion dir for config
        )
        
        if result.returncode != 0:
            error_msg = result.stderr.strip() if result.stderr else result.stdout.strip()
            # Extract meaningful error from FaceFusion output
            for line in error_msg.split('\n'):
                if 'FACEFUSION' in line and ('error' in line.lower() or '!' in line):
                    print(f"    [!] {line}")
                    break
            else:
                print(f"    [!] Error: {error_msg[:200] if error_msg else 'Unknown error'}")
            return False
        
        if output_path.exists():
            print(f"    [+] Saved: {output_path.name}")
            return True
        else:
            print(f"    [!] Output not created")
            return False
            
    except Exception as e:
        print(f"    [!] Exception: {e}")
        return False


def main():
    # Ensure output folder exists
    OUTPUT_FOLDER.mkdir(exist_ok=True)
    
    # Get reference images
    print(f"[*] Loading reference faces from {REF_FOLDER}...")
    source_images = get_reference_images()
    
    if not source_images:
        print(f"[!] No reference images found in {REF_FOLDER}")
        print("    Add your reference face photos (PNG, JPG, JPEG, WEBP)")
        sys.exit(1)
    
    print(f"    Found {len(source_images)} reference image(s)")
    for img in source_images:
        print(f"    - {img.name}")
    
    # Get photos to process
    print(f"\n[*] Loading photos from {RAW_FOLDER}...")
    raw_photos = get_raw_photos()
    
    if not raw_photos:
        print(f"[!] No photos found in {RAW_FOLDER}")
        sys.exit(1)
    
    print(f"    Found {len(raw_photos)} photo(s) to process")
    
    # Show settings from config
    print(f"\n[*] Processing with FaceFusion...")
    print(f"    Config: facefusion/facefusion.ini")
    print(f"    (Edit facefusion.ini to change models/settings)")
    print()
    
    success_count = 0
    fail_count = 0
    
    for photo in raw_photos:
        output_path = OUTPUT_FOLDER / f"fixed_{photo.name}"
        
        if process_image(source_images, photo, output_path):
            success_count += 1
        else:
            fail_count += 1
    
    # Summary
    print(f"\n[*] Complete!")
    print(f"    Success: {success_count}")
    print(f"    Failed: {fail_count}")
    print(f"    Output: {OUTPUT_FOLDER}")


if __name__ == "__main__":
    main()
