"""Compatibility entrypoint for running the backend from the workspace root.

This keeps the existing `uvicorn main:app --reload` command working even when
the server is started from the repository root instead of the backend folder.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


_backend_dir = Path(__file__).resolve().parent / "backend"
_backend_main_path = _backend_dir / "main.py"

if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

_spec = importlib.util.spec_from_file_location("backend_main", _backend_main_path)
if _spec is None or _spec.loader is None:
    raise ImportError(f"Unable to load backend entrypoint from {_backend_main_path}")

_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)

app = _module.app
