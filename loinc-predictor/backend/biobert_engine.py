"""
biobert_engine.py — Fine-tuned BioBERT semantic retrieval via FAISS.

Used as the fallback when exact_lookup returns no match (free-text queries,
unknown abbreviations, unusual lab formats).

Architecture: bi-encoder
  - Query encoded once with fine-tuned BioBERT → 768-dim embedding
  - Compared against 28k pre-computed LOINC embeddings via FAISS dot product
  - Top-20 candidates re-ranked by COMMON_TEST_RANK
"""

import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd
import faiss
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

import config
from text_cleaner import clean_text

log = logging.getLogger(__name__)


class BioBERTEngine:
    """
    Hybrid retrieval engine: dense (SentenceTransformer + FAISS) + sparse (BM25).

    Combines both with Reciprocal Rank Fusion (RRF) for higher accuracy than
    either method alone. Dense search handles semantic similarity; BM25 handles
    exact abbreviation/keyword matches (SGPT, HbA1c, WBC, etc.).

    Usage
    -----
        engine = BioBERTEngine()
        engine.load(df)
        results = engine.retrieve("SGPT 45 U/L")
    """

    def __init__(self) -> None:
        self.model:      SentenceTransformer | None = None
        self.index:      faiss.Index | None         = None
        self.meta:       list[str]                  = []   # LOINC codes by FAISS position
        self._df:        pd.DataFrame | None        = None
        self._bm25:      BM25Okapi | None           = None
        self._bm25_meta: list[str]                  = []   # LOINC codes by BM25 position

    # ── Loading ───────────────────────────────────────────────────────────────

    def load(self, df: pd.DataFrame) -> None:
        """Load model, BM25 index, and FAISS index."""
        self._df = df
        self._load_model()
        self._build_bm25(df)
        self._load_or_build_index(df)

    # ── BM25 ──────────────────────────────────────────────────────────────────

    def _build_bm25(self, df: pd.DataFrame) -> None:
        """Build BM25 index over feature strings (fast, < 5 s for 30k rows)."""
        log.info("Building BM25 index over %d feature strings…", len(df))
        tokenized = [text.lower().split() for text in df["feature_text"].tolist()]
        self._bm25      = BM25Okapi(tokenized)
        self._bm25_meta = df["LOINC_NUM"].tolist()
        log.info("BM25 index ready")

    def _retrieve_bm25(self, query: str, top_k: int) -> list[dict]:
        """BM25 retrieval — exact keyword / abbreviation matching."""
        assert self._bm25 is not None
        tokens = clean_text(query).lower().split()
        scores  = self._bm25.get_scores(tokens)
        top_idx = scores.argsort()[::-1][:top_k]
        results = []
        for idx in top_idx:
            if scores[idx] <= 0:
                break
            loinc_num = self._bm25_meta[idx]
            rows = self._df[self._df["LOINC_NUM"] == loinc_num]
            if len(rows) == 0:
                continue
            row = rows.iloc[0]
            results.append({
                "loinc":      loinc_num,
                "component":  row["COMPONENT"],
                "system":     row["SYSTEM"],
                "method":     row.get("METHOD_TYP", ""),
                "rank":       float(row["COMMON_TEST_RANK"]),
                "bm25_score": float(scores[idx]),
                "bio_score":  float(scores[idx]),
                "long_name":  row.get("LONG_COMMON_NAME", ""),
                "property":   row.get("PROPERTY", ""),
                "time":       row.get("TIME_ASPCT", ""),
                "scale":      row.get("SCALE_TYP", ""),
            })
        return results

    @staticmethod
    def _rrf_merge(
        dense:  list[dict],
        sparse: list[dict],
        top_k:  int,
        k:      int = 60,
    ) -> list[dict]:
        """
        Reciprocal Rank Fusion: score(d) = Σ 1/(k + rank_i + 1).

        k=60 is the standard value from the original RRF paper (Cormack 2009).
        Dense and sparse lists are weighted equally.
        """
        rrf_scores: dict[str, float] = {}
        meta:       dict[str, dict]  = {}

        for rank, r in enumerate(dense):
            loinc = r["loinc"]
            rrf_scores[loinc] = rrf_scores.get(loinc, 0.0) + 1.0 / (k + rank + 1)
            meta[loinc] = r

        for rank, r in enumerate(sparse):
            loinc = r["loinc"]
            rrf_scores[loinc] = rrf_scores.get(loinc, 0.0) + 1.0 / (k + rank + 1)
            if loinc not in meta:
                meta[loinc] = r

        sorted_loincs = sorted(
            rrf_scores.keys(),
            key=lambda x: (
                -rrf_scores[x],
                999999 if meta[x]["rank"] == 0 else meta[x]["rank"],
            ),
        )

        results = []
        for loinc in sorted_loincs[:top_k]:
            r = dict(meta[loinc])
            r["bio_score"] = rrf_scores[loinc]
            results.append(r)
        return results

    def _load_model(self) -> None:
        """Load fine-tuned BioBERT, fall back to base model if not available."""
        if config.FINETUNE_DIR.exists():
            log.info("Loading fine-tuned model from %s", config.FINETUNE_DIR)
            self.model = SentenceTransformer(str(config.FINETUNE_DIR))
        else:
            log.warning(
                "Fine-tuned model not found at %s — loading fallback: %s",
                config.FINETUNE_DIR,
                config.FALLBACK_MODEL,
            )
            self.model = SentenceTransformer(config.FALLBACK_MODEL)

        self.model.max_seq_length = 128
        dim = self.model.get_sentence_embedding_dimension()
        log.info("Model loaded  dim=%d", dim)

    def _load_or_build_index(self, df: pd.DataFrame) -> None:
        """Load cached index or encode all LOINC rows and build FAISS index."""
        if config.EMBED_CACHE.exists() and config.META_CACHE.exists():
            log.info("Loading cached embeddings from %s", config.EMBED_CACHE)
            embeddings = np.load(str(config.EMBED_CACHE)).astype(np.float32)
            with open(config.META_CACHE) as f:
                self.meta = json.load(f)
            log.info("  Loaded %d embeddings", len(self.meta))
        else:
            log.info("Encoding %d LOINC feature strings (this takes 5–15 min)…", len(df))
            assert self.model is not None
            embeddings = self.model.encode(
                df["feature_text"].tolist(),
                batch_size=64,
                show_progress_bar=True,
                normalize_embeddings=True,
                convert_to_numpy=True,
            ).astype(np.float32)
            self.meta = df["LOINC_NUM"].tolist()
            np.save(str(config.EMBED_CACHE), embeddings)
            with open(config.META_CACHE, "w") as f:
                json.dump(self.meta, f)
            log.info("  Embeddings saved → %s", config.EMBED_CACHE)

        if config.FAISS_CACHE.exists():
            log.info("Loading cached FAISS index from %s", config.FAISS_CACHE)
            self.index = faiss.read_index(str(config.FAISS_CACHE))
        else:
            dim = embeddings.shape[1]
            self.index = faiss.IndexFlatIP(dim)   # exact inner product (= cosine for normalised)
            self.index.add(embeddings)
            faiss.write_index(self.index, str(config.FAISS_CACHE))

        log.info("FAISS index ready: %d vectors", self.index.ntotal)

    # ── Retrieval ─────────────────────────────────────────────────────────────

    def _retrieve_dense(
        self,
        query_text: str,
        top_k: int,
    ) -> list[dict]:
        """FAISS dense retrieval — semantic similarity."""
        assert self.model is not None and self.index is not None

        q_emb = self.model.encode(
            [clean_text(query_text)],
            normalize_embeddings=True,
            convert_to_numpy=True,
        ).astype(np.float32)

        scores, indices = self.index.search(q_emb, top_k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if not (0 <= idx < len(self.meta)):
                continue
            loinc_num = self.meta[idx]
            rows = self._df[self._df["LOINC_NUM"] == loinc_num]
            if len(rows) == 0:
                continue
            row = rows.iloc[0]
            results.append({
                "loinc":     loinc_num,
                "component": row["COMPONENT"],
                "system":    row["SYSTEM"],
                "method":    row.get("METHOD_TYP", ""),
                "rank":      float(row["COMMON_TEST_RANK"]),
                "bio_score": float(score),
                "long_name": row.get("LONG_COMMON_NAME", ""),
                "property":  row.get("PROPERTY", ""),
                "time":      row.get("TIME_ASPCT", ""),
                "scale":     row.get("SCALE_TYP", ""),
            })
        return results

    def retrieve(
        self,
        query_text: str,
        top_k: int = config.FAISS_TOP_K,
    ) -> list[dict]:
        """
        Hybrid retrieval: BM25 (sparse) + FAISS (dense) merged via Reciprocal Rank Fusion.

        BM25 catches exact abbreviation/keyword matches (SGPT, HbA1c, WBC).
        Dense retrieval handles paraphrase and semantic variants.
        RRF combines both without requiring score normalisation.
        """
        assert self.model is not None and self.index is not None, "call load() first"

        candidate_k = max(top_k * 2, config.FAISS_TOP_K)
        dense  = self._retrieve_dense(query_text, candidate_k)
        sparse = self._retrieve_bm25(query_text, candidate_k)
        return self._rrf_merge(dense, sparse, top_k)
