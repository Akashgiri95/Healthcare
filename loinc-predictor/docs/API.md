# LOINC Predictor — API Reference

Base URL: `http://localhost:8000`

---

## GET /health

Health check. Returns 200 when the model is loaded.

**Response**
```json
{
  "status": "ok",
  "loinc_codes": 29911,
  "model": "loinc_biobert_models/sbert_finetuned"
}
```

---

## POST /predict/text

Predict LOINC codes from raw text.

**Request body**
```json
{
  "text": "Hemoglobin 11.4 gm/dl\nHbA1c 7.2 %\nGlucose 95 mg/dl",
  "top_k": 3
}
```

**Response** — see Response Schema below.

---

## POST /predict/file

Predict LOINC codes from an uploaded image or PDF.

**Request**: `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| file  | file | `.jpg .jpeg .png .pdf` |
| top_k | int  | Alternatives per test (default 3) |

**Response** — see Response Schema below.

---

## GET /loinc/{code}

Look up a LOINC code by number.

**Example**: `GET /loinc/718-7`

**Response**
```json
{
  "loinc_num": "718-7",
  "long_common_name": "Hemoglobin [Mass/volume] in Blood",
  "component": "Hemoglobin",
  "property": "MCnc",
  "time_aspct": "Pt",
  "system": "Bld",
  "scale_typ": "Qn",
  "method_typ": "",
  "common_test_rank": 17
}
```

---

## GET /verify/{loinc}

Check if a code is present in the filtered database.

**Response**
```json
{
  "loinc": "787-2",
  "in_filtered": true,
  "in_raw": true
}
```

---

## Response Schema

```json
{
  "source_type": "text | image | pdf | text_file",
  "ocr_engine": "tesseract | easyocr | none",
  "raw_text": "...",
  "patient_info": {
    "name": "Kirti Sangal",
    "age": "30",
    "gender": "female",
    "date": "20/12/2025"
  },
  "report_type": "CBC | Lipid Panel | Thyroid | Renal Function | Liver Function | Diabetes Panel | Urine Analysis | Antenatal Panel | General",
  "processed_at": "2026-03-29T10:00:00.000000",
  "results": [
    {
      "test_name": "Hemoglobin",
      "value": "11.4",
      "unit": "gm/dl",
      "ref_range": "11-15",
      "loinc_code": "718-7",
      "loinc_name": "Hemoglobin [Mass/volume] in Blood",
      "axes": {
        "component": "Hemoglobin",
        "property": "MCnc",
        "time": "Pt",
        "system": "Bld",
        "scale": "Qn",
        "method": ""
      },
      "confidence": 0.85,
      "stage": "exact/tier1_strict",
      "top_k": [
        { "loinc": "718-7", "component": "Hemoglobin", "system": "Bld", "rank": 17 },
        { "loinc": "20509-6", "component": "Hemoglobin", "system": "Bld", "rank": 244 }
      ]
    }
  ],
  "summary": {
    "total_tests": 20,
    "mapped": 20,
    "high_confidence": 16,
    "medium_confidence": 3,
    "low_confidence": 1
  }
}
```

---

## Confidence Score Guide

| Score | Label | Stage | Meaning |
|-------|-------|-------|---------|
| 92% | High | T0 Direct | Confirmed direct lookup (CBC codes, stable since 1995) |
| 85–90% | High | T1 Exact | Component + Property + System matched |
| 70% | Medium | T2 Partial | Component + Property matched (no system filter) |
| 50% | Low | T3 Name | Component name only matched |
| 30–80% | Variable | BioBERT | Semantic search — proportional to cosine similarity |

---

## Error Responses

```json
{ "detail": "text field is empty" }           // 400
{ "detail": "Unsupported file type '.txt'" }  // 400
{ "detail": "Service not ready" }             // 503
```

---

## Quick Start with curl

```bash
# Health check
curl http://localhost:8000/health

# Predict from text
curl -X POST http://localhost:8000/predict/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Hemoglobin 11.4 gm/dl\nHbA1c 7.2 %", "top_k": 3}'

# Predict from file
curl -X POST http://localhost:8000/predict/file \
  -F "file=@/path/to/lab_report.pdf"

# Look up a code
curl http://localhost:8000/loinc/718-7
```
