import json
import logging
from pathlib import Path
from typing import Dict, Any
from app.config import DATA_DIR

logger = logging.getLogger(__name__)

SETTINGS_FILE = DATA_DIR / "settings.json"

DEFAULT_SETTINGS: Dict[str, Any] = {
    "max_concurrency": 50,
    "min_delay": 1.0,
    "max_delay": 2.5,
    "flood_wait_action": "AUTO_WAIT",  # AUTO_WAIT, PAUSE, ABORT
    "max_flood_wait_seconds": 120,
    "protect_creator_dialogs": True,
    "auto_delete_history": True
}

def load_settings() -> Dict[str, Any]:
    """Load settings from JSON file or return defaults if not found or corrupted."""
    if not SETTINGS_FILE.exists():
        save_settings(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS.copy()
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Merge with defaults to ensure all keys exist
            merged = DEFAULT_SETTINGS.copy()
            merged.update(data)
            return merged
    except Exception as e:
        logger.error(f"Error reading settings.json: {e}. Falling back to default settings.")
        return DEFAULT_SETTINGS.copy()

def save_settings(settings: Dict[str, Any]) -> Dict[str, Any]:
    """Save settings dictionary to JSON file."""
    try:
        merged = DEFAULT_SETTINGS.copy()
        merged.update(settings)
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(merged, f, indent=2, ensure_ascii=False)
        return merged
    except Exception as e:
        logger.error(f"Error saving settings.json: {e}")
        return settings

def reset_settings() -> Dict[str, Any]:
    """Reset to default settings and persist."""
    return save_settings(DEFAULT_SETTINGS)
