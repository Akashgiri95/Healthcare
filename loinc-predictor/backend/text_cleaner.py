"""
text_cleaner.py — Normalise raw clinical text before parsing.

Handles:
  - Mixed case        → lowercase
  - OCR pipe splits   → Hemog|obin → hemogobin
  - OCR zero-as-o     → Gl0cose → glocose
  - Square brackets   → [Mass/vol] removed
  - Round brackets    → (MCV) removed
  - Caret notation    → ^ removed
  - Non-medical chars → stripped, spaces collapsed
"""

import re

# ── Compiled patterns (compiled once at import = fast) ────────────────────────
_LOWER    = str.maketrans(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz",
)
_PIPES    = re.compile(r"\|+")
_ZERO_MID = re.compile(r"(?<=[a-z])0(?=[a-z])")
_BRACKET  = re.compile(r"\s*[\[\(][^\]\)]*[\]\)]\s*")
_CARET    = re.compile(r"\^")
_NONMED   = re.compile(r"[^a-z0-9 .,%()/:\-]")
_SPACE    = re.compile(r"\s+")


def clean_text(text: str) -> str:
    """
    Normalise a raw clinical string for parsing.

    Examples
    --------
    >>> clean_text("Hemog|obin 11.4 gm/dl")
    'hemogobin 11.4 gm/dl'
    >>> clean_text("Mean Cell Volume (MCV) 89.6 fL")
    'mean cell volume 89.6 fl'
    >>> clean_text("Gl0cose 95 mg/dL")
    'glocose 95 mg/dl'
    """
    if not isinstance(text, str) or not text.strip():
        return ""
    text = text.translate(_LOWER)     # lowercase
    text = _PIPES.sub("", text)       # rejoin pipe-split words
    text = _ZERO_MID.sub("o", text)  # Gl0cose → glocose
    text = _BRACKET.sub(" ", text)   # strip [] and ()
    text = _CARET.sub(" ", text)     # strip ^
    text = _NONMED.sub(" ", text)    # remove non-medical chars
    return _SPACE.sub(" ", text).strip()


def clean_unit(unit: str) -> str:
    """
    Normalise a unit string for property mapping.

    Examples
    --------
    >>> clean_unit("gm/dL")
    'g/dl'
    >>> clean_unit("Cells/cumm")
    'cells/cumm'
    """
    u = unit.strip().lower()
    u = u.replace("gm/dl", "g/dl")
    u = u.replace("cells/cumm", "cells/mm3")
    return u
