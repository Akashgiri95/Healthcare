"""
row_parser.py — Extract individual test rows from raw OCR / lab report text.

Auto-detects two formats:

HORIZONTAL (space-padded columns) — standard format:
  "Hemoglobin                    11.4    gm/dl    11-15"
  Used by: Sukrut Pathology, most plain-text lab reports

VERTICAL (stacked Name / Method / Value) — Dr Lal, SRL, Metropolis:
  "Proteins"
  "(Tetra Bromophenol)"
  "Negative  Negative"

  AND single-inline rows mixed in:
  "Specific Gravity 1.010 1.001 - 1.030"
  "(Pre-treated polymeric Ion Exchange resin)"

Detection: if >10% of non-empty lines are parenthetical method descriptions
           → vertical mode; otherwise horizontal mode.
"""

import re
import logging
from dataclasses import dataclass

log = logging.getLogger(__name__)


# ── Qualitative result vocabulary ─────────────────────────────────────────────
QUAL_VALUES: frozenset[str] = frozenset({
    "negative", "positive", "normal", "abnormal", "none seen", "trace",
    "present", "absent", "reactive", "non-reactive", "detected", "not detected",
    "light yellow", "pale yellow", "yellow", "amber", "clear", "turbid", "hazy",
    "nil", "see comment", "not applicable", "na", "nil seen", "not done",
})

# ── Compiled regex patterns ───────────────────────────────────────────────────
_IS_METHOD  = re.compile(r"^\(.+\)$")
_IS_SECTION = re.compile(
    r"^(gross examination|microscopy|differential leucocyte|absolute leucocyte|"
    r"complete blood count|urine examination.*|routine r/e|antenatal.*|"
    r"test\s*name|results|units|bio\.?\s*ref\.?\s*interval|"
    r"comment|note|important\s+instructions)$",
    re.IGNORECASE,
)
_INLINE_ROW = re.compile(
    r"^([A-Za-z][A-Za-z0-9 \.\(\)/\-]{1,50}?)\s{1,5}"
    r"([<>]?[\d\.]+(?:-[\d\.]+)?)\s*"
    r"([A-Za-z%][A-Za-z0-9/%\.\*]{0,15})?\s*"
    r"([\d\.\-\s/]*)$"
)
_SKIP_ADMIN = re.compile(
    r"^(patient|lab\s*no|ref\s*by|collected|processed|a/c\s*status|"
    r"report\s*status|page\s+\d|\*\d+\*|authenticity|if\s+test\s+results|"
    r"tel:|fax:|e-mail:|web:|regd\.|dr\.\s+\w+|md,\s+pathology|"
    r"consultant|barcode|reg\b|mob|authorized|pathologist|stamp|"
    r"as\s+per\s+the|test\s+conducted|note\b|important|"
    r"___rows___)",
    re.IGNORECASE,
)
_SKIP_HORI  = re.compile(
    r"^(patient|name:|age:|gender:|date:|sample|report|lab\b|"
    r"ref(erence)?(\s+range)?|hospital|clinic|doctor|print|page\b|"
    r"remark|method|unit\b|value\b|test\b|barcode|reg\b|id\b|"
    r"mob|tel|fax|authorized|pathologist|signature|stamp)",
    re.IGNORECASE,
)


# ── Result type ───────────────────────────────────────────────────────────────
@dataclass
class LabRow:
    test_name: str
    value:     str
    unit:      str
    ref_range: str
    raw_line:  str

    def query_string(self) -> str:
        """Build the query string passed to predict_loinc."""
        return f"{self.test_name} {self.value} {self.unit}".strip()

    def to_dict(self) -> dict:
        return {
            "test_name": self.test_name,
            "value":     self.value,
            "unit":      self.unit,
            "ref_range": self.ref_range,
            "raw_line":  self.raw_line,
        }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_qual(text: str) -> bool:
    t     = text.lower().strip()
    first = t.split()[0] if t.split() else ""
    return t in QUAL_VALUES or first in QUAL_VALUES


def _parse_value_line(vl: str) -> tuple[str, str, str]:
    """Return (value, unit, ref) from a raw value line."""
    ll    = vl.lower().strip()
    first = ll.split()[0] if ll.split() else ""

    if ll in QUAL_VALUES:
        return vl, "", ""

    two = " ".join(ll.split()[:2])
    if two in QUAL_VALUES:
        rest = vl.split(None, 2)
        return vl.split()[0] + " " + vl.split()[1], "", (rest[2] if len(rest) > 2 else "")

    if first in QUAL_VALUES:
        parts = [p.strip() for p in re.split(r"  +", vl) if p.strip()]
        if len(parts) >= 2:
            return parts[0], "", " ".join(parts[1:])
        words = vl.split(None, 1)
        return words[0], "", (words[1] if len(words) > 1 else "")

    parts = [p.strip() for p in re.split(r"  +", vl) if p.strip()]
    if len(parts) >= 2:
        value = parts[0]
        ref   = " ".join(parts[1:])
        um    = re.search(r"\s+([A-Za-z][A-Za-z0-9/\.]{1,12})$", value)
        unit  = um.group(1) if um else ""
        if unit:
            value = value[: um.start()].strip()
        return value, unit, ref

    if re.match(r"^[<>]?[\d\.]+$", vl):
        return vl, "", ""

    m = re.match(r"^([<>]?[\d\.]+)\s+(.+)$", vl)
    if m:
        return m.group(1), "", m.group(2)

    m2 = re.match(r"^(\d+-\d+)\s+([A-Za-z][A-Za-z0-9/\.]+)\s*(.*)?$", vl)
    if m2:
        return m2.group(1), m2.group(2), m2.group(3).strip()

    return vl, "", ""


def _detect_format(text: str) -> str:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    paren = sum(1 for l in lines if _IS_METHOD.match(l))
    return "vertical" if lines and paren / len(lines) > 0.10 else "horizontal"


# ── Parsers ───────────────────────────────────────────────────────────────────

def _parse_vertical(text: str) -> list[LabRow]:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    rows: list[LabRow] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        ll   = line.lower().strip()

        if (
            _IS_SECTION.match(line) or _IS_METHOD.match(line)
            or _SKIP_ADMIN.match(line)
            or ll in ("test name", "results", "units")
        ):
            i += 1
            continue

        # Inline row (name + number on same line) — parse immediately
        if not _is_qual(line):
            m = _INLINE_ROW.match(line)
            if m:
                name = m.group(1).strip()
                # Strip trailing OCR numeric artifacts, e.g. "PCV 35.50 7)"
                name = re.sub(r'\s+\d[\d\. ]*[\)%]*$', '', name).strip()
                val  = m.group(2).strip()
                unit = m.group(3).strip() if m.group(3) else ""
                ref  = m.group(4).strip() if m.group(4) else ""
                if len(name) > 1 and not re.match(r"^[\d\.\-]+$", name):
                    rows.append(LabRow(name, val, unit, ref, line))
                    i += 1
                    continue

        # Vertical: capital-letter name line with no digit
        if (
            line[0:1].isupper()
            and not re.search(r"\d", line)
            and not _IS_METHOD.match(line)
            and not _IS_SECTION.match(line)
            and not _is_qual(line)
            and len(line) > 1
        ):
            j = i + 1
            while j < len(lines) and _IS_METHOD.match(lines[j]):
                j += 1

            if j < len(lines):
                candidate = lines[j]
                # Don't consume lines that are themselves inline test rows
                if _INLINE_ROW.match(candidate) and not _is_qual(candidate):
                    i += 1
                    continue
                if _IS_SECTION.match(candidate) or _SKIP_ADMIN.match(candidate):
                    i += 1
                    continue

                val, unit, ref = _parse_value_line(candidate)
                rows.append(LabRow(line, val, unit, ref, f"{line}|{candidate}"))
                i = j + 1
                continue

        i += 1
    return rows


def _parse_horizontal(text: str) -> list[LabRow]:
    rows: list[LabRow] = []
    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if len(line) < 3 or _SKIP_HORI.match(line):
            continue

        # Handle qualitative-only rows (no digit) — e.g. "Proteins  Negative" or "HBsAg Reactive"
        if not re.search(r"\d", line):
            # Try double-space split first (PDF format), then single-space split (text input)
            parts = [p.strip() for p in re.split(r"  +", line) if p.strip()]
            if len(parts) < 2:
                # Single-space split: last token is the qualitative value
                tokens = line.split()
                if len(tokens) >= 2 and _is_qual(tokens[-1]):
                    parts = [" ".join(tokens[:-1]), tokens[-1]]
            if len(parts) >= 2:
                name = parts[0]
                val  = parts[-1]
                if (len(name) > 1
                        and not re.match(r"^[\d\.\-]+$", name)
                        and not _SKIP_HORI.match(name)
                        and _is_qual(val)):
                    rows.append(LabRow(name, val, "", " ".join(parts[1:-1]), line))
            continue

        parts = [p.strip() for p in re.split(r"  +", line) if p.strip()]

        # Fallback: single-space columns (e.g. Dr. Lal PathLabs PDF via Tesseract)
        if len(parts) < 2:
            m = _INLINE_ROW.match(line)
            if m:
                name = m.group(1).strip()
                name = re.sub(r'\s+\d[\d\. ]*[\)%]*$', '', name).strip()
                val  = m.group(2).strip()
                unit = m.group(3).strip() if m.group(3) else ""
                ref  = m.group(4).strip() if m.group(4) else ""
                if len(name) > 1 and not re.match(r"^[\d\.\-]+$", name):
                    rows.append(LabRow(name, val, unit, ref, line))
            continue

        name = parts[0]
        if re.match(r"^[\d\.\-]+$", name) or len(name) < 2:
            continue

        value = ""
        vi    = -1
        for idx, p in enumerate(parts[1:], 1):
            if re.match(r"^[<>]?\d+\.?\d*$", p):
                value = re.sub(r"^[<>]", "", p)
                vi    = idx
                break

        if value and vi >= 0:
            rest = parts[vi + 1 :]
            unit = rest.pop(0) if rest and re.match(r"^[A-Za-z%/]", rest[0]) else ""
            ref  = " ".join(rest)
            rows.append(LabRow(name, value, unit, ref, line))

    return rows


# ── Public API ────────────────────────────────────────────────────────────────

def parse_lab_rows(raw_text: str) -> list[LabRow]:
    """
    Auto-detect report format and extract lab test rows.

    Parameters
    ----------
    raw_text : raw OCR or plain text of the lab report

    Returns
    -------
    List of LabRow objects (test_name, value, unit, ref_range, raw_line)
    """
    fmt  = _detect_format(raw_text)
    rows = _parse_vertical(raw_text) if fmt == "vertical" else _parse_horizontal(raw_text)
    log.debug("parse_lab_rows: format=%s  rows=%d", fmt, len(rows))
    return rows
