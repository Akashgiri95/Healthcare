"""
api.py — FastAPI REST server for the LOINC Predictor.

Endpoints:
  GET  /health             — server health + readiness
  GET  /loinc/{code}       — look up a specific LOINC code
  POST /predict/text       — predict from raw text body
  POST /predict/file       — predict from uploaded image/PDF
  GET  /verify/{loinc}     — check if a code is in the filtered df

Run with:
  
"""

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import config
from data_loader import load_loinc, verify_rank_alignment
from predictor import LOINCPredictor
from loinc_lookup import refine_by_axes

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
log = logging.getLogger("api")

# ── App state ─────────────────────────────────────────────────────────────────
predictor: Optional[LOINCPredictor] = None
df         = None
raw_df     = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model and LOINC database on startup."""
    global predictor, df, raw_df
    log.info("Starting LOINC Predictor API…")

    try:
        config.validate()
    except EnvironmentError as e:
        log.error("Config error: %s", e)
        raise

    df, raw_df = load_loinc()
    verify_rank_alignment(df)

    predictor = LOINCPredictor()
    predictor.load(df, raw_df)

    log.info("API ready — %d LOINC codes loaded", len(df))
    yield
    log.info("Shutting down")


app = FastAPI(
    title="LOINC Predictor API",
    version="1.0.0",
    description="Predict LOINC codes from clinical lab report text, images, or PDFs.",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
origins = [o.strip() for o in config.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ───────────────────────────────────────────────────────────

class TextRequest(BaseModel):
    text: str
    top_k: int = 3


class PredictResponse(BaseModel):
    source_type:  str
    ocr_engine:   str
    patient_info: dict
    report_type:  str
    processed_at: str
    results:      list[dict]
    summary:      dict


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Health check. Returns 200 when model is loaded and ready."""
    if predictor is None or not predictor._ready:
        raise HTTPException(503, "Model not loaded yet")
    return {
        "status":      "ok",
        "loinc_codes": len(df) if df is not None else 0,
        "model":       str(config.FINETUNE_DIR),
    }


@app.post("/predict/text", response_model=PredictResponse)
async def predict_text(req: TextRequest):
    """
    Predict LOINC codes from raw text.

    Body: { "text": "Hemoglobin 11.4 gm/dl\\nHbA1c 7.2 %", "top_k": 3 }
    """
    if not predictor:
        raise HTTPException(503, "Service not ready")
    if not req.text.strip():
        raise HTTPException(400, "text field is empty")

    result = predictor.predict_report(req.text, verbose=False)
    return JSONResponse(content=result.to_dict())


@app.post("/predict/file", response_model=PredictResponse)
async def predict_file(file: UploadFile = File(...), top_k: int = 3):
    """
    Predict LOINC codes from an uploaded image or PDF.

    Accepts: .jpg .jpeg .png .pdf
    """
    if not predictor:
        raise HTTPException(503, "Service not ready")

    allowed = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".pdf"}
    suffix  = "." + (file.filename or "").split(".")[-1].lower()
    if suffix not in allowed:
        raise HTTPException(400, f"Unsupported file type '{suffix}'. Allowed: {allowed}")

    data   = await file.read()
    result = predictor.predict_report(data, verbose=False)
    return JSONResponse(content=result.to_dict())


@app.get("/loinc/{code}")
async def get_loinc(code: str):
    """
    Look up a LOINC code and return its 6 axes + long name.

    Returns 404 if not found in the filtered database.
    """
    if df is None:
        raise HTTPException(503, "Database not loaded")

    # Check filtered df first, then raw (for confirmed codes)
    row = df[df["LOINC_NUM"] == code]
    if len(row) == 0:
        row = raw_df[raw_df["LOINC_NUM"] == code]
    if len(row) == 0:
        raise HTTPException(404, f"LOINC code {code!r} not found")

    r = row.iloc[0]
    return {
        "loinc_num":        r["LOINC_NUM"],
        "long_common_name": r.get("LONG_COMMON_NAME", ""),
        "component":        r.get("COMPONENT", ""),
        "property":         r.get("PROPERTY",  ""),
        "time_aspct":       r.get("TIME_ASPCT", ""),
        "system":           r.get("SYSTEM",     ""),
        "scale_typ":        r.get("SCALE_TYP",  ""),
        "method_typ":       r.get("METHOD_TYP", ""),
        "common_test_rank": float(r.get("COMMON_TEST_RANK", 0)),
    }


class RefineRequest(BaseModel):
    component:  Optional[str] = None
    property_:  Optional[str] = None   # LOINC PROPERTY axis (MCnc, NFr, …)
    time_aspct: Optional[str] = None
    system:     Optional[str] = None
    scale_typ:  Optional[str] = None
    method_typ: Optional[str] = None
    top_k:      int = 10

    class Config:
        populate_by_name = True


@app.post("/predict/refine")
async def predict_refine(req: RefineRequest):
    """
    Re-query LOINC using user-supplied axis overrides.

    Pass only the axes you want to filter on — leave others null/omitted.
    Returns up to top_k matching LOINC codes ranked by clinical frequency.

    Example body:
        { "component": "Hemoglobin", "system": "Bld", "property_": "MCnc" }
    """
    if df is None:
        raise HTTPException(503, "Database not loaded")

    results = refine_by_axes(
        df, raw_df,
        component  = req.component,
        property_  = req.property_,
        time_aspct = req.time_aspct,
        system     = req.system,
        scale_typ  = req.scale_typ,
        method_typ = req.method_typ,
        top_k      = req.top_k,
    )

    if results.empty:
        return {"matches": [], "count": 0}

    matches = []
    for _, row in results.iterrows():
        matches.append({
            "loinc_num":        row.get("LOINC_NUM", ""),
            "long_common_name": row.get("LONG_COMMON_NAME", ""),
            "component":        row.get("COMPONENT", ""),
            "property":         row.get("PROPERTY", ""),
            "time_aspct":       row.get("TIME_ASPCT", ""),
            "system":           row.get("SYSTEM", ""),
            "scale_typ":        row.get("SCALE_TYP", ""),
            "method_typ":       row.get("METHOD_TYP", ""),
            "common_test_rank": float(row.get("COMMON_TEST_RANK", 0) or 0),
        })

    return {"matches": matches, "count": len(matches)}


@app.get("/loinc/axes/values")
async def axes_values():
    """
    Return the set of valid values for each of the 6 LOINC axes.
    Use this to populate dropdowns in the UI.
    """
    if df is None:
        raise HTTPException(503, "Database not loaded")

    def sorted_unique(col: str) -> list[str]:
        return sorted(df[col].dropna().astype(str).unique().tolist())

    return {
        "property":   sorted_unique("PROPERTY"),
        "time_aspct": sorted_unique("TIME_ASPCT"),
        "system":     sorted_unique("SYSTEM"),
        "scale_typ":  sorted_unique("SCALE_TYP"),
        "method_typ": sorted_unique("METHOD_TYP"),
    }


@app.get("/verify/{loinc}")
async def verify_loinc(loinc: str):
    """Check if a LOINC code is present in the filtered database."""
    if df is None:
        raise HTTPException(503, "Database not loaded")
    in_filtered = loinc in df["LOINC_NUM"].values
    in_raw      = (raw_df is not None) and (loinc in raw_df["LOINC_NUM"].values)
    return {
        "loinc":       loinc,
        "in_filtered": in_filtered,
        "in_raw":      in_raw,
    }
