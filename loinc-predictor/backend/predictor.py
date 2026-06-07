"""
predictor.py — Master pipeline: any input → structured LOINC JSON.

This module wires all backends together and is the single entry point
for both the API and the test suite.

Input can be:
  - str path to .jpg / .png / .pdf / .txt
  - PIL.Image
  - bytes (from HTTP upload)
  - str (raw text, multiline)

Output (ReportResult dataclass):
  source_type, ocr_engine, patient_info, report_type,
  processed_at, results (list of TestResult), summary
"""

import io
import logging
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
from PIL import Image

import config
from text_cleaner import clean_text
from loinc_lookup import (
    parse_query, exact_lookup, expand_component,
    CONFIRMED_LOINC, DERIVED_INDICES, URINE_DIPSTICK_LOINC,
)
from biobert_engine import BioBERTEngine
from ocr_engine import extract_text_from_image, pdf_to_images, bytes_to_image, extract_digital_pdf_text
from row_parser import parse_lab_rows, LabRow

log = logging.getLogger(__name__)


# ── Result types ──────────────────────────────────────────────────────────────

@dataclass
class AxesDetail:
    component: str = ""
    property:  str = ""
    time:      str = ""
    system:    str = ""
    scale:     str = ""
    method:    str = ""


@dataclass
class TestResult:
    test_name:   str
    value:       str
    unit:        str
    ref_range:   str
    loinc_code:  Optional[str]
    loinc_name:  str
    axes:        AxesDetail
    confidence:  float
    stage:       str
    top_k:       list[dict] = field(default_factory=list)


@dataclass
class PatientInfo:
    name:   str = ""
    age:    str = ""
    gender: str = ""
    date:   str = ""


@dataclass
class ReportSummary:
    total_tests:      int = 0
    mapped:           int = 0
    high_confidence:  int = 0
    medium_confidence:int = 0
    low_confidence:   int = 0


@dataclass
class ReportResult:
    source_type:  str
    ocr_engine:   str
    raw_text:     str
    patient_info: PatientInfo
    report_type:  str
    processed_at: str
    results:      list[TestResult]
    summary:      ReportSummary

    def to_dict(self) -> dict:
        return asdict(self)


# ── Helper extractors ─────────────────────────────────────────────────────────

def _extract_patient_info(text: str) -> PatientInfo:
    info = PatientInfo()
    tl   = text.lower()

    patterns = {
        "name":   r"(?:(?:patient|ms\.|mr\.|mrs\.|dr\.)\s*(?:name)?\s*[:=]?\s*)([A-Za-z][A-Za-z ]{2,40})",
        "age":    r"(?:age\s*[:=]?\s*)(\d{1,3})",
        "gender": r"(?:(?:gender|sex)\s*[:=]?\s*)(male|female|m\b|f\b)",
        "date":   r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})",
    }
    for fld, pat in patterns.items():
        m = re.search(pat, tl)
        if m:
            val = m.group(1).strip()
            if fld == "name":
                orig = re.search(pat, text, re.IGNORECASE)
                val  = orig.group(1).strip() if orig else val
            setattr(info, fld, val)

    # LPL / Dr Lal format: name on its own line as "Ms. NAME" or "Mr. NAME"
    if not info.name:
        m = re.search(r"\b(?:ms\.|mr\.|mrs\.)\s+([A-Z][A-Z ]{2,40})", text)
        if m:
            info.name = m.group(1).strip().title()
    if not info.age:
        m = re.search(r"(\d{1,3})\s*years?", tl)
        if m:
            info.age = m.group(1)
    if not info.gender:
        for g in ("female", "male"):
            if g in tl:
                info.gender = g
                break

    return info


def _detect_report_type(text: str) -> str:
    tl = text.lower()
    # Antenatal/prenatal panel checked first — it contains CBC so CBC must not win
    if any(k in tl for k in ["antenatal", "prenatal", "obstetric", "antenatal advance"]):
        return "Antenatal Panel"
    if any(k in tl for k in ["complete blood count", "cbc", "haemogram", "hemogram"]):
        return "CBC"
    if any(k in tl for k in ["lipid profile", "cholesterol", "triglyceride"]):
        return "Lipid Panel"
    if any(k in tl for k in ["liver function", "lft", "bilirubin", "sgpt", "sgot"]):
        return "Liver Function"
    if any(k in tl for k in ["thyroid", "tsh", "t3", "t4"]):
        return "Thyroid"
    if any(k in tl for k in ["kidney", "renal", "creatinine", "urea"]):
        return "Renal Function"
    if any(k in tl for k in ["diabetes", "glucose", "hba1c", "glycat"]):
        return "Diabetes Panel"
    if any(k in tl for k in ["urine", "urinalysis", "routine r/e", "specific gravity"]):
        return "Urine Analysis"
    if any(k in tl for k in ["antenatal", "prenatal", "obstetric", "antenatal advance"]):
        return "Antenatal Panel"
    if any(k in tl for k in ["urine examination", "routine r/e", "urinalysis", "specific gravity"]):
        return "Urine Analysis"
    return "General"


# ── Core Predictor ────────────────────────────────────────────────────────────

class LOINCPredictor:
    """
    Main prediction engine. Instantiate once, call predict_report() many times.

    Usage
    -----
        predictor = LOINCPredictor()
        predictor.load(df, raw_loinc_df)
        result = predictor.predict_report("path/to/report.pdf")
        print(result.to_dict())
    """

    def __init__(self) -> None:
        self._df:          Optional[pd.DataFrame] = None
        self._raw_df:      Optional[pd.DataFrame] = None
        self._biobert:     BioBERTEngine           = BioBERTEngine()
        self._ready:       bool                    = False

    def load(self, df: pd.DataFrame, raw_loinc_df: pd.DataFrame) -> None:
        """Initialise with filtered and unfiltered LOINC DataFrames."""
        self._df     = df
        self._raw_df = raw_loinc_df
        self._biobert.load(df)
        self._ready  = True
        log.info("LOINCPredictor ready (%d LOINC codes)", len(df))

    # ── Row-level prediction ──────────────────────────────────────────────────

    def predict_one(self, row: LabRow, top_k: int = 3) -> TestResult:
        """Predict LOINC code for a single lab row."""
        assert self._ready, "call load() first"

        # Derived indices (Mentzer, eAG, etc.) have no standard LOINC code.
        _name_lower = clean_text(row.test_name).lower()
        if _name_lower in DERIVED_INDICES:
            return TestResult(
                test_name=row.test_name, value=row.value, unit=row.unit,
                ref_range=row.ref_range, loinc_code=None, loinc_name="",
                axes=AxesDetail(), confidence=0.0, stage="derived_index",
            )

        # Urine dipstick: qualitative value + known test name → direct urine LOINC
        _val_lower = row.value.lower().strip()
        _qual_terms = {
            "negative", "positive", "trace", "normal", "abnormal", "nil",
            "present", "absent", "pale yellow", "light yellow", "yellow",
            "amber", "clear", "turbid", "not detected", "detected",
        }
        if _val_lower in _qual_terms:
            _name_key = clean_text(row.test_name).lower()
            if _name_key in URINE_DIPSTICK_LOINC:
                code = URINE_DIPSTICK_LOINC[_name_key]
                _cols = ["LOINC_NUM", "COMPONENT", "PROPERTY", "TIME_ASPCT",
                         "SYSTEM", "SCALE_TYP", "METHOD_TYP", "LONG_COMMON_NAME", "COMMON_TEST_RANK"]
                valid_raw = [c for c in _cols if c in self._raw_df.columns]
                r = self._raw_df[self._raw_df["LOINC_NUM"] == code][valid_raw]
                if len(r):
                    rr = r.iloc[0]
                    return TestResult(
                        test_name=row.test_name, value=row.value, unit=row.unit,
                        ref_range=row.ref_range, loinc_code=code,
                        loinc_name=rr.get("LONG_COMMON_NAME", ""),
                        axes=AxesDetail(
                            component=rr.get("COMPONENT", ""), property=rr.get("PROPERTY", ""),
                            time=rr.get("TIME_ASPCT", ""),     system=rr.get("SYSTEM", ""),
                            scale=rr.get("SCALE_TYP", ""),     method=rr.get("METHOD_TYP", ""),
                        ),
                        confidence=config.CONF_TIER0, stage="exact/tier0_urine_dipstick",
                        top_k=[{"loinc": code, "component": rr.get("COMPONENT", ""),
                                "system": rr.get("SYSTEM", ""), "rank": float(rr.get("COMMON_TEST_RANK", 0) or 0)}],
                    )

        # Pre-check: CONFIRMED_LOINC on the test name alone.
        # Catches MCH/PCV/etc. that arrive without a parseable unit or with a
        # garbled OCR value — parse_query would return None for those rows.
        _name_clean = expand_component(clean_text(row.test_name)).lower()
        if _name_clean in CONFIRMED_LOINC:
            code = CONFIRMED_LOINC[_name_clean]
            _cols = ["LOINC_NUM", "COMPONENT", "PROPERTY", "TIME_ASPCT",
                     "SYSTEM", "SCALE_TYP", "METHOD_TYP", "LONG_COMMON_NAME",
                     "COMMON_TEST_RANK"]
            valid_raw = [c for c in _cols if c in self._raw_df.columns]
            r = self._raw_df[self._raw_df["LOINC_NUM"] == code][valid_raw]
            if len(r):
                rr = r.iloc[0]
                return TestResult(
                    test_name  = row.test_name,
                    value      = row.value,
                    unit       = row.unit,
                    ref_range  = row.ref_range,
                    loinc_code = code,
                    loinc_name = rr.get("LONG_COMMON_NAME", ""),
                    axes       = AxesDetail(
                        component = rr.get("COMPONENT", ""),
                        property  = rr.get("PROPERTY",  ""),
                        time      = rr.get("TIME_ASPCT", ""),
                        system    = rr.get("SYSTEM",     ""),
                        scale     = rr.get("SCALE_TYP",  ""),
                        method    = rr.get("METHOD_TYP", ""),
                    ),
                    confidence = config.CONF_TIER0,
                    stage      = "exact/tier0_confirmed",
                    top_k      = [{"loinc": code,
                                   "component": rr.get("COMPONENT", ""),
                                   "system":    rr.get("SYSTEM", ""),
                                   "rank":      float(rr.get("COMMON_TEST_RANK", 0) or 0)}],
                )

        query  = row.query_string()
        parsed = parse_query(query)
        exact_df, tier = exact_lookup(parsed, self._df, self._raw_df)

        if len(exact_df) > 0:
            r     = exact_df.iloc[0]
            conf  = (config.CONF_TIER0 if "tier0" in tier else
                     config.CONF_TIER1 if "tier1" in tier else
                     config.CONF_TIER2)
            axes  = AxesDetail(
                component = r.get("COMPONENT", ""),
                property  = r.get("PROPERTY",  ""),
                time      = r.get("TIME_ASPCT", ""),
                system    = r.get("SYSTEM",     ""),
                scale     = r.get("SCALE_TYP",  ""),
                method    = r.get("METHOD_TYP", ""),
            )
            # Resolve long name (may be in raw_loinc_df if filtered out of df)
            long_name = r.get("LONG_COMMON_NAME", "")
            if not long_name:
                m2 = self._raw_df[self._raw_df["LOINC_NUM"] == r["LOINC_NUM"]]
                if len(m2):
                    long_name = m2.iloc[0].get("LONG_COMMON_NAME", "")

            return TestResult(
                test_name  = row.test_name,
                value      = row.value,
                unit       = row.unit,
                ref_range  = row.ref_range,
                loinc_code = r["LOINC_NUM"],
                loinc_name = long_name,
                axes       = axes,
                confidence = conf,
                stage      = "exact/" + tier,
                top_k      = [
                    {"loinc": x["LOINC_NUM"], "component": x["COMPONENT"],
                     "system": x["SYSTEM"], "rank": float(x["COMMON_TEST_RANK"])}
                    for _, x in exact_df.head(top_k).iterrows()
                ],
            )

        # ── Hybrid BM25 + FAISS fallback ─────────────────────────────────────
        cands = self._biobert.retrieve(query, top_k=config.FAISS_TOP_K)
        if not cands:
            return TestResult(
                test_name=row.test_name, value=row.value, unit=row.unit,
                ref_range=row.ref_range, loinc_code=None, loinc_name="",
                axes=AxesDetail(), confidence=0.0, stage="no_match",
            )

        # Unit-property validation: if unit known, filter candidates to
        # those whose LOINC PROPERTY matches the expected property.
        # Keeps all candidates if none match (avoids over-filtering rare tests).
        if row.unit:
            from loinc_lookup import detect_property
            expected_prop = detect_property(row.unit, cands[0].get("component", ""))
            if expected_prop:
                valid = [c for c in cands if c.get("property") == expected_prop]
                if valid:
                    cands = valid

        top   = cands[0]
        conf  = round(float(min(0.95, top["bio_score"])), 3)
        axes  = AxesDetail(
            component = top.get("component", ""),
            property  = top.get("property",  ""),
            time      = top.get("time",       ""),
            system    = top.get("system",     ""),
            scale     = top.get("scale",      ""),
            method    = top.get("method",     ""),
        )
        return TestResult(
            test_name  = row.test_name,
            value      = row.value,
            unit       = row.unit,
            ref_range  = row.ref_range,
            loinc_code = top["loinc"],
            loinc_name = top["long_name"],
            axes       = axes,
            confidence = conf,
            stage      = "biobert",
            top_k      = [
                {"loinc": c["loinc"], "component": c["component"],
                 "system": c["system"], "rank": c["rank"]}
                for c in cands[:top_k]
            ],
        )

    # ── Report-level prediction ───────────────────────────────────────────────

    def predict_report(
        self,
        input_data,
        source_type: str = "auto",
        verbose:     bool = True,
    ) -> ReportResult:
        """
        Full pipeline: any input → structured ReportResult.

        Accepts: file path str, PIL.Image, bytes, or raw text str.
        """
        assert self._ready, "call load() first"

        raw_text   = ""
        ocr_engine = "none"

        # ── Step 1: extract raw text ──────────────────────────────────────────
        if isinstance(input_data, bytes):
            if input_data[:4] == b"%PDF":
                import tempfile, os
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    tmp.write(input_data)
                    tmp_path = tmp.name
                try:
                    # Try direct text extraction first (digital PDFs — no OCR needed)
                    _structured = extract_digital_pdf_text(tmp_path)
                    if _structured:
                        ocr_engine = "pymupdf_direct"
                        try:
                            import fitz as _fitz
                            _doc = _fitz.open(tmp_path)
                            _plain = "\n".join(p.get_text(sort=True) for p in _doc)
                            _doc.close()
                        except Exception:
                            _plain = _structured
                        # raw_text = plain text (for patient info / report type)
                        #          + structured rows (for row parser, marked by separator)
                        raw_text = _plain + "\n\n___ROWS___\n" + _structured
                        log.info("Digital PDF: extracted %d chars directly", len(_structured))
                    else:
                        pages = pdf_to_images(tmp_path)
                        texts = []
                        for pg, img in pages:
                            t, eng = extract_text_from_image(img)
                            texts.append(t)
                            ocr_engine = eng
                        raw_text = "\n".join(texts)
                    source_type = "pdf"
                finally:
                    os.unlink(tmp_path)
            else:
                img = bytes_to_image(input_data)
                if img:
                    raw_text, ocr_engine = extract_text_from_image(img)
                    source_type = "image"
                else:
                    return ReportResult("error", "none", "", PatientInfo(),
                                        "Unknown", datetime.now().isoformat(),
                                        [], ReportSummary())

        elif isinstance(input_data, Image.Image):
            raw_text, ocr_engine = extract_text_from_image(input_data)
            source_type = "image"

        elif isinstance(input_data, str) and "\n" not in input_data and len(input_data) < 512:
            path = Path(input_data)
            if path.exists():
                if path.suffix.lower() == ".pdf":
                    _structured = extract_digital_pdf_text(path)
                    if _structured:
                        ocr_engine  = "pymupdf_direct"
                        source_type = "pdf"
                        try:
                            import fitz as _fitz
                            _doc = _fitz.open(str(path))
                            _plain = "\n".join(p.get_text(sort=True) for p in _doc)
                            _doc.close()
                        except Exception:
                            _plain = _structured
                        raw_text = _plain + "\n\n___ROWS___\n" + _structured
                        log.info("Digital PDF: extracted %d chars directly", len(_structured))
                    else:
                        pages = pdf_to_images(path)
                        texts = []
                        for pg, img in pages:
                            if verbose:
                                log.info("  OCR page %d/%d", pg, len(pages))
                            t, eng = extract_text_from_image(img)
                            texts.append(t)
                            ocr_engine = eng
                        raw_text    = "\n".join(texts)
                        source_type = "pdf"
                elif path.suffix.lower() in (".jpg",".jpeg",".png",".bmp",".tiff",".tif"):
                    raw_text, ocr_engine = extract_text_from_image(Image.open(path))
                    source_type = "image"
                else:
                    raw_text    = path.read_text(encoding="utf-8", errors="ignore")
                    source_type = "text_file"
            else:
                # Treat as raw text
                raw_text    = input_data
                source_type = "text"
        else:
            raw_text    = input_data
            source_type = "text"

        if not raw_text.strip():
            log.warning("No text extracted from input")

        if verbose and ocr_engine != "none":
            log.info("OCR preview (600 chars):\n%s", raw_text[:600])

        # ── Step 2: parse rows ────────────────────────────────────────────────
        # For digital PDFs, only parse the structured-extraction portion (after marker)
        _row_text = raw_text.split("___ROWS___\n", 1)[-1] if "___ROWS___" in raw_text else raw_text
        lab_rows = parse_lab_rows(_row_text)
        if verbose:
            log.info("  Rows parsed: %d", len(lab_rows))

        # ── Step 3: predict LOINC per row ─────────────────────────────────────
        results = [self.predict_one(row) for row in lab_rows]

        # ── Step 4: build summary ─────────────────────────────────────────────
        mapped = sum(1 for r in results if r.loinc_code)
        high   = sum(1 for r in results if r.confidence >= config.CONF_HIGH)
        med    = sum(1 for r in results if config.CONF_MEDIUM <= r.confidence < config.CONF_HIGH)
        low    = sum(1 for r in results if r.confidence < config.CONF_MEDIUM)

        return ReportResult(
            source_type  = source_type,
            ocr_engine   = ocr_engine,
            raw_text     = raw_text,
            patient_info = _extract_patient_info(raw_text),
            report_type  = _detect_report_type(raw_text),
            processed_at = datetime.now().isoformat(),
            results      = results,
            summary      = ReportSummary(len(results), mapped, high, med, low),
        )
