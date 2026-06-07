"""
ocr_engine.py — OCR image/PDF → raw text.

Preprocessing pipeline:
  1. Upscale to ≥1800px wide  (phone photos often 800-1200px)
  2. Grayscale
  3. Strong contrast boost (3×)
  4. Double sharpen

OCR engines:
  Primary  : Tesseract (fast, best for clean printed text)
  Fallback : EasyOCR (better for photos, rotated text, low contrast)

EasyOCR key fix:
  With detail=1 we get bounding boxes per detection.
  We group detections by Y coordinate → reconstruct table rows as single lines.
  Without this, "Hemoglobin  11.4  g/dL  11-15" becomes 4 separate lines
  which the row parser cannot handle.

PDF support:
  Primary  : pdf2image (requires poppler system library)
  Fallback : PyMuPDF / fitz (pure Python, no system deps)
"""

import io
import logging
import shutil
from pathlib import Path
from typing import Optional

from PIL import Image, ImageEnhance, ImageFilter

import config

log = logging.getLogger(__name__)


# ── Image preprocessing ───────────────────────────────────────────────────────

def preprocess_image(img: Image.Image, for_easyocr: bool = False) -> Image.Image:
    """
    Preprocess a PIL Image for optimal OCR accuracy.

    Parameters
    ----------
    img         : input image (any mode)
    for_easyocr : if True, return RGB (EasyOCR input format)
                  if False, binarise for Tesseract
    """
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    w, h = img.size
    if w < config.OCR_TARGET_WIDTH:
        scale = config.OCR_TARGET_WIDTH / w
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    img = img.convert("L")
    img = ImageEnhance.Contrast(img).enhance(config.OCR_CONTRAST)
    img = img.filter(ImageFilter.SHARPEN)
    img = img.filter(ImageFilter.SHARPEN)

    if for_easyocr:
        return img.convert("RGB")

    # Tesseract: binarise to pure B/W
    return img.point(lambda p: 255 if p > config.OCR_BINARISE_THRESH else 0, "1").convert("L")


# ── EasyOCR row reconstruction ────────────────────────────────────────────────

def reconstruct_rows_from_easyocr(
    detections: list,
    y_tolerance: int = config.OCR_Y_TOLERANCE,
) -> str:
    """
    Group EasyOCR bounding-box detections into text rows.

    EasyOCR (detail=1) returns one detection per text region.  Table columns
    land as separate detections.  This function groups detections whose
    Y-centres are within y_tolerance pixels, sorts left-to-right, and joins
    with two spaces — producing lines the row parser can split on 2+ spaces.

    Example
    -------
    Input detections (bbox, text, conf):
        ([10,100]…, "Hemoglobin", 0.99)
        ([250,102]…, "11.4", 0.98)
        ([320,101]…, "gm/dL", 0.95)
        ([400,100]…, "11-15", 0.90)
    Output:
        "Hemoglobin  11.4  gm/dL  11-15"
    """
    if not detections:
        return ""

    rows:  list[str] = []
    used:  set[int]  = set()

    sorted_dets = sorted(
        enumerate(detections),
        key=lambda x: (x[1][0][0][1] + x[1][0][2][1]) / 2,
    )

    for orig_i, (bbox, text, _conf) in sorted_dets:
        if orig_i in used:
            continue
        y_center  = (bbox[0][1] + bbox[2][1]) / 2
        row_items = [(bbox[0][0], text)]
        used.add(orig_i)

        for orig_j, (bbox2, text2, _conf2) in sorted_dets:
            if orig_j in used:
                continue
            y2 = (bbox2[0][1] + bbox2[2][1]) / 2
            if abs(y2 - y_center) <= y_tolerance:
                row_items.append((bbox2[0][0], text2))
                used.add(orig_j)

        row_items.sort(key=lambda x: x[0])
        rows.append("  ".join(t for _, t in row_items))

    return "\n".join(rows)


# ── OCR engines ───────────────────────────────────────────────────────────────

def ocr_tesseract(img: Image.Image) -> str:
    """Run Tesseract OCR. Returns raw text or empty string on failure."""
    try:
        import pytesseract
        if config.TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = config.TESSERACT_CMD
        processed = preprocess_image(img, for_easyocr=False)
        return pytesseract.image_to_string(processed, config="--psm 6 --oem 3").strip()
    except Exception as exc:
        log.warning("Tesseract failed: %s", exc)
        return ""


_easyocr_reader = None   # lazy-load singleton


def _get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        import torch
        import easyocr
        gpu = torch.cuda.is_available()
        log.info("Loading EasyOCR model (GPU=%s)…", gpu)
        _easyocr_reader = easyocr.Reader(["en"], gpu=gpu, verbose=False)
        log.info("EasyOCR ready")
    return _easyocr_reader


def ocr_easyocr(img: Image.Image) -> str:
    """
    Run EasyOCR with bounding-box row reconstruction.

    Uses detail=1 (returns bbox per detection) then groups by Y coordinate
    so table rows are preserved as single lines for the row parser.
    """
    try:
        import numpy as np
        reader  = _get_easyocr_reader()
        img_arr = np.array(preprocess_image(img, for_easyocr=True))
        dets    = reader.readtext(img_arr, detail=1, paragraph=False)
        if not dets:
            return ""
        return reconstruct_rows_from_easyocr(dets)
    except Exception as exc:
        log.warning("EasyOCR failed: %s", exc)
        return ""


def extract_text_from_image(
    img:    Image.Image,
    prefer: str = config.OCR_ENGINE,
) -> tuple[str, str]:
    """
    Extract text from a PIL Image using the best available OCR engine.

    Parameters
    ----------
    img    : PIL Image
    prefer : 'auto' | 'tesseract' | 'easyocr'

    Returns
    -------
    (text, engine_name)
    """
    if prefer in ("auto", "tesseract") and shutil.which("tesseract"):
        text = ocr_tesseract(img)
        if text and len(text) > 20:
            return text, "tesseract"

    if prefer in ("auto", "easyocr"):
        text = ocr_easyocr(img)
        if text:
            return text, "easyocr"

    return "", "none"


# ── PDF → images ──────────────────────────────────────────────────────────────

def pdf_to_images(pdf_path: str | Path) -> list[tuple[int, Image.Image]]:
    """
    Convert PDF pages to PIL Images.

    Primary  : pdf2image (requires poppler)
    Fallback : PyMuPDF / fitz (pure Python, auto-installed if missing)

    Returns list of (page_number, PIL.Image) tuples.
    """
    pdf_path = Path(pdf_path)

    # Try pdf2image first
    try:
        from pdf2image import convert_from_path
        pages = convert_from_path(str(pdf_path), dpi=config.PDF_DPI)
        log.info("pdf2image: %d pages from %s", len(pages), pdf_path.name)
        return [(i + 1, p) for i, p in enumerate(pages)]
    except Exception as exc:
        log.warning("pdf2image failed (%s) — trying PyMuPDF", exc)

    # Fallback: PyMuPDF
    try:
        import fitz
    except ImportError:
        import subprocess, sys
        log.info("Installing PyMuPDF…")
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "pymupdf", "--quiet"]
        )
        import fitz

    try:
        doc   = fitz.open(str(pdf_path))
        pages = []
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=config.PDF_DPI)
            pages.append((
                i + 1,
                Image.frombytes("RGB", [pix.width, pix.height], pix.samples),
            ))
        doc.close()
        log.info("PyMuPDF: %d pages from %s", len(pages), pdf_path.name)
        return pages
    except Exception as exc:
        log.error("PyMuPDF also failed: %s", exc)
        return []


def extract_digital_pdf_text(pdf_path: str | Path) -> str:
    """
    Extract text from a digital (non-scanned) PDF using PyMuPDF block parsing.

    Handles lab report PDFs (LPL, Dr Lal, SRL, Metropolis) where each PDF block
    stores one test row with columns in variable order. Reconstructs rows as
    'name  value  unit  ref' for the horizontal row parser.

    Returns empty string if PDF appears scanned (< 30 chars extracted).
    """
    import re
    try:
        import fitz
    except ImportError:
        return ""

    _REF  = re.compile(r'^\s*[<>]?[\d\.]+\s*[-–]\s*[\d\.]+\s*$')
    _NUM  = re.compile(r'^\s*[<>]?[\d\.]+\s*$')
    _METH = re.compile(r'^\(.+\)$')
    _DATE = re.compile(r'^\d{1,2}/\d{1,2}/\d{2,4}')
    _SKIP = re.compile(
        r'^(test\s*(name|report)|results?|units?|bio\.?\s*ref|gross examination|'
        r'complete blood count|urine examination|antenatal|comment|note|'
        r'interpretation|name\b|lab\s*no|ref\s*by|collected|a/c\s*status|'
        r'report\s*status|differential|absolute|microscopy|page\s+\d|\*\d+\*|'
        r'age\b|gender\b|female\b|male\b|self\b|interim\b|reported\b|'
        r'processed\s*at|collected\s*at)',
        re.IGNORECASE,
    )
    _QUAL = frozenset({
        'negative', 'positive', 'normal', 'abnormal', 'none seen', 'trace',
        'present', 'absent', 'nil', 'nil seen', 'not applicable', 'not done',
        'pale yellow', 'light yellow', 'yellow', 'amber', 'clear', 'turbid',
        'none seen/lpf', 'reactive', 'non-reactive', 'detected', 'not detected',
    })

    try:
        doc = fitz.open(str(pdf_path))
    except Exception as exc:
        log.warning("Cannot open PDF for direct extraction: %s", exc)
        return ""

    output_lines = []

    for page in doc:
        blocks = page.get_text("blocks", sort=True)
        for b in blocks:
            raw_lines = [l.strip() for l in b[4].split('\n') if l.strip()]
            if len(raw_lines) < 2:
                continue
            # Skip admin/header blocks and footnote lists (1. 2. 3.)
            if _SKIP.match(raw_lines[0]) or _DATE.match(raw_lines[0]):
                continue
            if re.match(r'^\d+\.$', raw_lines[0]):
                continue

            # Classify each line: ref, numeric, qual, method, skip, or unknown
            # 'unknown' covers both names and units — disambiguated by position
            types = []
            for line in raw_lines:
                ll = line.lower()
                if _METH.match(line):
                    types.append('method')
                elif _DATE.match(line):
                    types.append('skip')
                elif _SKIP.match(line):
                    types.append('skip')
                elif _REF.match(line):
                    types.append('ref')
                elif _NUM.match(line):
                    types.append('numeric')
                elif ll in _QUAL:
                    types.append('qual')
                else:
                    types.append('unknown')  # could be name or unit

            # Units look like 'g/dL', 'thou/mm3', '%', 'fL', 'pg'
            # Test names look like 'Hemoglobin', 'pH', 'Proteins', 'Colour'
            _KNOWN_UNITS = {
                'fL', 'fl', 'pg', 'mL', 'L', 'dL', 'g', 'kg', 'mg', 'ng', 'ug',
                'mol', 'mmol', 'umol', 'nmol', 'pmol', 'mIU', 'IU', 'U', 'kU',
            }
            def _is_unit_like(s):
                return '/' in s or s == '%' or s in _KNOWN_UNITS

            # Detect multi-test blocks: 2+ non-unit unknown lines = multiple tests merged
            name_like_indices = [
                i for i, t in enumerate(types)
                if t == 'unknown' and not _is_unit_like(raw_lines[i]) and len(raw_lines[i]) <= 50
            ]
            if len(name_like_indices) >= 2:
                # Split the block at each test-name boundary
                for split_idx, name_i in enumerate(name_like_indices):
                    name = raw_lines[name_i]
                    if len(name) > 60:
                        continue
                    # The segment for this test: from previous name to just before next name
                    seg_start = (name_like_indices[split_idx - 1] + 1) if split_idx > 0 else 0
                    seg_end   = name_like_indices[split_idx + 1] if split_idx + 1 < len(name_like_indices) else len(raw_lines)
                    seg_types = types[seg_start:seg_end]
                    seg_lines = raw_lines[seg_start:seg_end]
                    val = next((seg_lines[j] for j in reversed(range(len(seg_lines)))
                                if seg_types[j] in ('numeric', 'qual')), "")
                    ref_val = next((seg_lines[j].strip() for j in range(len(seg_lines))
                                   if seg_types[j] == 'ref'), "")
                    if not val:
                        continue
                    parts = [name, val]
                    if ref_val:
                        parts.append(ref_val)
                    output_lines.append("  ".join(parts))
                continue

            # Single-test block
            # Actual result = last numeric or qual in the block
            value_idx = None
            for i in reversed(range(len(raw_lines))):
                if types[i] in ('numeric', 'qual'):
                    value_idx = i
                    break
            if value_idx is None:
                continue

            # Test name = first 'unknown' line (position-based, not pattern-based)
            name_idx = None
            for i in range(len(raw_lines)):
                if i != value_idx and types[i] == 'unknown':
                    name_idx = i
                    break
            if name_idx is None:
                continue

            value = raw_lines[value_idx]
            name  = raw_lines[name_idx]

            # Skip comment/footnote blocks — real test names are < 60 chars
            if len(name) > 60:
                continue

            # If name comes AFTER all value/qual lines, actual result is the FIRST qual
            # (PDF col order: actual | ref | name — e.g. urine Colour block)
            all_val_qual = [i for i, t in enumerate(types) if t in ('numeric', 'qual')]
            if all_val_qual and name_idx > max(all_val_qual):
                value_idx = min(all_val_qual)
                value = raw_lines[value_idx]

            # Unit = any other 'unknown' line (between name and value)
            unit = next(
                (raw_lines[i] for i in range(len(raw_lines))
                 if types[i] == 'unknown' and i not in (value_idx, name_idx)),
                ""
            )
            # Ref = first 'ref' line
            ref = next(
                (raw_lines[i].strip() for i in range(len(raw_lines))
                 if types[i] == 'ref' and i not in (value_idx, name_idx)),
                ""
            )

            parts = [name, value]
            if unit:
                parts.append(unit)
            if ref:
                parts.append(ref)
            output_lines.append("  ".join(parts))

    doc.close()
    text = "\n".join(output_lines)
    return text if len(text.strip()) > 30 else ""


def bytes_to_image(data: bytes) -> Optional[Image.Image]:
    """Convert raw bytes (from file upload) to PIL Image."""
    try:
        return Image.open(io.BytesIO(data))
    except Exception as exc:
        log.error("Cannot open image bytes: %s", exc)
        return None
