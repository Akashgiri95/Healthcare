"""
data_loader.py — Load and filter the LOINC CSV database.

Produces two DataFrames:
  df          — filtered (~28k rows), used for exact and BM25 lookup
  raw_loinc_df — unfiltered copy, used by CONFIRMED_LOINC tier-0 lookup
                 (some CBC index codes get filtered out in certain LOINC
                  release versions — this ensures they are always findable)
"""

import logging
from pathlib import Path

import pandas as pd

import config

log = logging.getLogger(__name__)


def _build_feature_text(row: pd.Series) -> str:
    """
    Convert a LOINC row into a rich feature string for BM25 + semantic retrieval.

    Includes RELATEDNAMES2 (abbreviations/synonyms), SHORTNAME, and EXAMPLE_UNITS
    so that queries like 'SGPT', 'HbA1c', or 'WBC' find the right LOINC even without
    synonym expansion.
    """
    from text_cleaner import clean_text   # local import avoids circular deps
    import re

    parts = [
        "component: " + clean_text(row["COMPONENT"]),
        "property: "  + clean_text(row["PROPERTY"]),
        "time: "      + clean_text(row["TIME_ASPCT"]),
        "system: "    + clean_text(row["SYSTEM"]),
        "scale: "     + clean_text(row["SCALE_TYP"]),
    ]

    method = clean_text(str(row.get("METHOD_TYP", "") or ""))
    name   = clean_text(str(row.get("LONG_COMMON_NAME", "") or ""))
    short  = clean_text(str(row.get("SHORTNAME", "") or ""))
    units  = clean_text(str(row.get("EXAMPLE_UNITS", "") or ""))

    # RELATEDNAMES2: semicolon-separated synonyms. Extract meaningful tokens
    # (abbreviations, clinical names) and skip generic property/methodology terms.
    _GENERIC = re.compile(
        r"^(mass concentration|point in time|quantitative|quant|quan|qnt|"
        r"level|count|volume|fraction|ratio|semiqn|ordqn|ordinal|nominal|"
        r"arbitrary|presence|threshold|seqn|time|random|spot|24h|"
        r"hematology|chemistry|endocrin|nephrol|coagul|immunol|microbiol|"
        r"cell counts|serpl|sp|plsm|plasma|serum)$",
        re.IGNORECASE,
    )
    related_raw = str(row.get("RELATEDNAMES2", "") or "")
    related_terms = [
        t.strip() for t in related_raw.split(";")
        if t.strip() and not _GENERIC.match(t.strip()) and len(t.strip()) >= 2
    ]
    # Keep the first 10 most informative terms (abbreviations first)
    related_terms.sort(key=lambda x: (len(x) > 10, x))
    related = "; ".join(related_terms[:10])

    if method:
        parts.append("method: " + method)
    if name:
        parts.append("name: " + name)
    if short:
        parts.append("short: " + short)
    if related:
        parts.append("synonyms: " + related)
    if units:
        parts.append("units: " + units)

    return " | ".join(parts)


def load_loinc(csv_path: str | None = None) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load, filter, and return (df, raw_loinc_df).

    Parameters
    ----------
    csv_path : path to full LOINC CSV. Falls back to config.LOINC_CSV_PATH.

    Returns
    -------
    df          : filtered DataFrame with feature_text column
    raw_loinc_df: unfiltered DataFrame (for CONFIRMED_LOINC lookups)
    """
    path = csv_path or config.LOINC_CSV_PATH
    log.info("Loading LOINC CSV from %s", path)

    raw = pd.read_csv(path, dtype=str, low_memory=False)
    raw.columns = raw.columns.str.strip()
    log.info("  Raw rows: %d", len(raw))

    # ── Read rank BEFORE fillna — preserve numeric values ─────────────────────
    if "COMMON_TEST_RANK" in raw.columns:
        rank_series = pd.to_numeric(
            raw["COMMON_TEST_RANK"], errors="coerce"
        ).fillna(0)
    else:
        rank_series = pd.Series(0, index=raw.index)
        log.warning("COMMON_TEST_RANK column not found — ranking disabled")

    raw = raw.fillna("")

    keep_cols = [c for c in config.KEEP_COLUMNS if c in raw.columns]
    df = raw[keep_cols].copy()
    df["COMMON_TEST_RANK"] = rank_series

    # ── Save unfiltered copy before any filter ─────────────────────────────────
    raw_loinc_df = df.copy()

    # ── 7-step filter ─────────────────────────────────────────────────────────
    df["CLASSTYPE"] = pd.to_numeric(df["CLASSTYPE"], errors="coerce")
    df = df[df["CLASSTYPE"] == 1]
    log.info("  After CLASSTYPE==1     : %d", len(df))

    df = df[df["SCALE_TYP"].isin(config.KEEP_SCALE_TYP)]
    log.info("  After SCALE_TYP filter : %d", len(df))

    df = df[df["PROPERTY"].isin(config.KEEP_PROPERTY)]
    log.info("  After PROPERTY filter  : %d", len(df))

    df = df[df["TIME_ASPCT"].isin(config.KEEP_TIME_ASPCT)]
    log.info("  After TIME_ASPCT filter: %d", len(df))

    df = df[~df["SYSTEM"].isin(config.DROP_SYSTEMS)]
    log.info("  After SYSTEM drop      : %d", len(df))

    df = df[~df["METHOD_TYP"].isin(config.DROP_METHODS)]
    log.info("  After METHOD drop      : %d", len(df))

    comp_counts = df["COMPONENT"].value_counts()
    df = df[
        df["COMPONENT"].isin(
            comp_counts[comp_counts >= config.MIN_COMPONENT_OCCURRENCES].index
        )
    ]
    df = df.drop(columns=["CLASSTYPE"], errors="ignore").reset_index(drop=True)
    log.info("  Final rows             : %d", len(df))

    # ── Build feature strings for BM25 / BioBERT ──────────────────────────────
    log.info("Building feature strings…")
    df["feature_text"] = df.apply(_build_feature_text, axis=1)

    # ── Save filtered CSV for manual verification ──────────────────────────────
    df[
        ["LOINC_NUM", "COMPONENT", "PROPERTY", "TIME_ASPCT",
         "SYSTEM", "SCALE_TYP", "METHOD_TYP", "LONG_COMMON_NAME", "COMMON_TEST_RANK"]
    ].to_csv(config.CLEANED_CSV, index=False)
    log.info("Saved filtered CSV → %s", config.CLEANED_CSV)

    return df, raw_loinc_df


def verify_rank_alignment(df: pd.DataFrame) -> bool:
    """Sanity check: 718-7 (Hemoglobin) should have rank 17."""
    row = df[df["LOINC_NUM"] == "718-7"]
    if len(row) == 0:
        log.warning("718-7 not found in filtered df")
        return False
    rank = row["COMMON_TEST_RANK"].values[0]
    ok   = (rank == 17)
    log.info("718-7 rank = %s  (expect 17) → %s", rank, "OK" if ok else "FAIL")
    return ok
