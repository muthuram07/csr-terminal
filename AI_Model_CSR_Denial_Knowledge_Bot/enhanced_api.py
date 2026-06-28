"""
Enhanced ML API Service for CSR Denial Knowledge Bot.

Features:
- Hybrid intent routing (rules + trained intent classifier)
- Code-aware denial lookup with semantic fallback
- Member and plan coverage resolution from CSV data
- Structured JSON responses tuned for backend/frontend consumption
"""

from __future__ import annotations

import json
import logging
import os
import pickle
import re
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "ml_model.pkl"
TRAINING_DATA_PATH = BASE_DIR / "models" / "training_data.json"
CSV_DATA_DIR = BASE_DIR / "datasets"

ml_model: Optional[Dict] = None
training_data: Optional[List[Dict]] = None
data_cache: Dict[str, pd.DataFrame] = {}
api_health = {"status": "initializing", "last_check": None, "error": None}


def normalize_code(code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", code.upper())


def initialize_api() -> None:
    global ml_model, training_data, data_cache
    try:
        logger.info("Loading CSV datasets")
        data_cache["denial_df"] = pd.read_csv(CSV_DATA_DIR / "denial_reason.csv")
        data_cache["member_df"] = pd.read_csv(CSV_DATA_DIR / "member_subscription.csv")
        data_cache["plan_df"] = pd.read_csv(CSV_DATA_DIR / "plan_coverage.csv")

        if MODEL_PATH.exists():
            with MODEL_PATH.open("rb") as f:
                ml_model = pickle.load(f)
            logger.info("Model loaded: %s", MODEL_PATH)
        else:
            logger.warning("Model not found: %s", MODEL_PATH)

        if TRAINING_DATA_PATH.exists():
            with TRAINING_DATA_PATH.open("r", encoding="utf-8") as f:
                training_data = json.load(f)
        else:
            training_data = []

        api_health["status"] = "healthy"
        api_health["last_check"] = datetime.now().isoformat()
    except Exception as e:
        api_health["status"] = "failed"
        api_health["error"] = str(e)
        logger.error("Initialization failed: %s", e)
        logger.error(traceback.format_exc())


def format_response(success: bool = True, data: Optional[Dict] = None, error: Optional[str] = None, processing_time_ms: float = 0.0) -> Dict:
    return {
        "success": success,
        "response": data,
        "error": error,
        "processing_time_ms": round(processing_time_ms, 2),
        "timestamp": datetime.now().isoformat(),
    }


def extract_denial_code(query: str) -> Optional[str]:
    q = query.upper()
    # CO-45 / CO 45 / CO45
    m = re.search(r"\b([A-Z]{2,3})\s*[- ]?\s*(\d{1,3})\b", q)
    if m:
        return normalize_code(f"{m.group(1)}{m.group(2)}")
    return None


def extract_member_id(query: str) -> Optional[str]:
    m = re.search(r"\bM\d{3,}\b", query.upper())
    return m.group(0) if m else None


def infer_service(query: str, service_catalog: List[str]) -> Optional[str]:
    q = query.lower()
    patterns = [
        r"is\s+(.+?)\s+covered",
        r"coverage for\s+(.+)$",
        r"cover\s+(.+)$",
    ]
    for pattern in patterns:
        m = re.search(pattern, q)
        if m:
            candidate = m.group(1).strip().strip("?")
            break
    else:
        candidate = None

    if candidate:
        for service in service_catalog:
            if service in candidate or candidate in service:
                return service
        return candidate
    return None


def classify_query_type(query: str) -> Tuple[str, float]:
    if not query.strip():
        return "general", 0.0

    if extract_denial_code(query):
        return "denial_lookup", 0.99

    ql = query.lower()
    if extract_member_id(query):
        if any(k in ql for k in ["cover", "coverage", "copay", "benefit", "plan"]):
            return "plan_lookup", 0.95
        return "member_lookup", 0.95

    if any(k in ql for k in ["denial", "claim denied", "rejected", "eob code"]):
        return "denial_lookup", 0.9
    if any(k in ql for k in ["member", "subscriber", "eligibility"]):
        return "member_lookup", 0.85
    if any(k in ql for k in ["coverage", "covered", "copay", "benefit", "plan"]):
        return "plan_lookup", 0.85

    if not ml_model:
        return "general", 0.5

    try:
        vec = ml_model["intent_vectorizer"].transform([query])
        pred = ml_model["intent_model"].predict(vec)[0]
        probs = ml_model["intent_model"].predict_proba(vec)[0]
        return str(pred), float(np.max(probs))
    except Exception:
        return "general", 0.5


def search_denial_codes(query: str, top_k: int = 5, threshold: float = 0.12) -> List[Dict]:
    if not ml_model:
        return []

    records = ml_model.get("denial_records", [])
    if not records:
        return []

    extracted_code = extract_denial_code(query)
    exact_matches = []
    if extracted_code:
        for rec in records:
            if normalize_code(rec["code"]) == extracted_code:
                exact_matches.append(
                    {
                        "code": rec["code"],
                        "description": rec["description"],
                        "action": rec["action"],
                        "similarity": 1.0,
                        "match_type": "exact_code",
                    }
                )
                break

    try:
        q_vec = ml_model["denial_vectorizer"].transform([query])
        sims = (q_vec @ ml_model["denial_matrix"].T).toarray()[0]
        ranked_idx = np.argsort(sims)[::-1]
        semantic = []
        for idx in ranked_idx[: max(top_k * 2, 10)]:
            score = float(sims[idx])
            if score < threshold:
                continue
            rec = records[int(idx)]
            semantic.append(
                {
                    "code": rec["code"],
                    "description": rec["description"],
                    "action": rec["action"],
                    "similarity": round(score, 3),
                    "match_type": "semantic",
                }
            )
    except Exception:
        semantic = []

    dedup = {}
    for item in exact_matches + semantic:
        existing = dedup.get(item["code"])
        if not existing:
            dedup[item["code"]] = item
            continue
        if existing.get("match_type") == "exact_code":
            continue
        if item.get("match_type") == "exact_code" or item.get("similarity", 0) > existing.get("similarity", 0):
            dedup[item["code"]] = item

    ranked = sorted(
        dedup.values(),
        key=lambda x: (
            1 if x.get("match_type") == "exact_code" else 0,
            x.get("similarity", 0),
        ),
        reverse=True,
    )
    return ranked[:top_k]


def lookup_member(member_id: Optional[str] = None, name_query: Optional[str] = None) -> Optional[Dict]:
    member_df = data_cache.get("member_df")
    plan_df = data_cache.get("plan_df")
    if member_df is None or plan_df is None:
        return None

    row = None
    if member_id:
        found = member_df[member_df["member_id"].str.upper() == member_id.upper()]
        if not found.empty:
            row = found.iloc[0]
    elif name_query:
        nq = name_query.lower().strip()
        found = member_df[member_df["member_name"].str.lower().str.contains(re.escape(nq), na=False)]
        if not found.empty:
            row = found.iloc[0]

    if row is None:
        return None

    plan = plan_df[plan_df["plan_id"] == row["plan_id"]]
    plan_row = plan.iloc[0] if not plan.empty else None

    return {
        "member_id": row["member_id"],
        "name": row["member_name"],
        "status": row["status"],
        "plan_id": row["plan_id"],
        "effective_date": str(row["effective_date"]),
        "end_date": str(row["end_date"]),
        "plan_details": {
            "coverage_type": (plan_row["coverage_type"] if plan_row is not None else "N/A"),
            "covered_services": (plan_row["covered_services"] if plan_row is not None else "N/A"),
            "copay": (plan_row["copay"] if plan_row is not None else "N/A"),
            "notes": (plan_row["notes"] if plan_row is not None else None),
        },
    }


def plan_response(query: str) -> Dict:
    member_id = extract_member_id(query)
    member = lookup_member(member_id=member_id)
    if not member:
        return {
            "type": "plan_coverage",
            "message": "Plan coverage information requested",
            "suggestion": "Please include a valid member ID like M12345",
        }

    service_catalog = ml_model.get("service_catalog", []) if ml_model else []
    service = infer_service(query, service_catalog)
    covered_services_raw = str(member["plan_details"].get("covered_services", ""))
    covered_set = {s.strip().lower() for s in covered_services_raw.split(",") if s.strip()}

    if service:
        covered = any(service in s or s in service for s in covered_set)
        coverage_answer = f"Yes, {service} is covered." if covered else f"No, {service} is not covered."
    else:
        coverage_answer = "Coverage details found for this member."

    return {
        "type": "plan_coverage",
        "coverage_answer": coverage_answer,
        "member_id": member["member_id"],
        "member_name": member["name"],
        "status": member["status"],
        "plan_id": member["plan_id"],
        "effective_date": member["effective_date"],
        "end_date": member["end_date"],
        "plan_details": member["plan_details"],
    }


def member_response(query: str) -> Dict:
    member_id = extract_member_id(query)
    member = lookup_member(member_id=member_id)
    if not member:
        return {"type": "member_info", "error": "Member not found. Please provide a valid member ID."}
    return {"type": "member_info", "member": member}


def general_response(query: str) -> Dict:
    normalized = query.strip().lower()
    greeting_answers = {
        "hi": "Hi. I can help with denial codes, member lookup, and plan coverage checks.",
        "hello": "Hello. Ask me a denial code or a member coverage question and I will return structured details.",
        "hey": "Hey. You can ask things like Explain CO-45 or Is dental covered for member M12345?",
        "good morning": "Good morning. Share a denial code or member ID and I will help.",
        "good afternoon": "Good afternoon. Share a denial code or member ID and I will help.",
        "good evening": "Good evening. Share a denial code or member ID and I will help.",
    }
    if normalized in greeting_answers:
        return {
            "type": "general_answer",
            "topic": "greeting",
            "answer": greeting_answers[normalized],
            "confidence": 1.0,
            "suggested_queries": [
                "Explain denial code CO-45",
                "Show member M12345 details",
                "Is dental covered for member M12345?",
            ],
        }

    fallback = {
        "type": "general_answer",
        "topic": "help",
        "answer": "Ask about denial codes, member details, or coverage for a member ID (e.g., M12345).",
        "confidence": 0.4,
        "suggested_queries": [
            "Explain denial code CO-45",
            "Show member M12345 details",
            "Is dental covered for member M12345?",
        ],
    }

    if not ml_model:
        return fallback

    try:
        pairs = ml_model.get("general_pairs", [])
        vectorizer = ml_model.get("general_vectorizer")
        matrix = ml_model.get("general_matrix")
        if not pairs or vectorizer is None or matrix is None:
            return fallback

        qv = vectorizer.transform([query])
        sims = (qv @ matrix.T).toarray()[0]
        best_idx = int(np.argmax(sims))
        best_score = float(sims[best_idx])
        if best_score < 0.12:
            fallback["confidence"] = round(best_score, 3)
            return fallback

        best = pairs[best_idx]
        return {
            "type": "general_answer",
            "topic": best.get("topic", "general"),
            "answer": best.get("answer", fallback["answer"]),
            "confidence": round(best_score, 3),
            "suggested_queries": fallback["suggested_queries"],
        }
    except Exception:
        return fallback


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify(
        {
            "status": api_health["status"],
            "model_loaded": ml_model is not None,
            "data_loaded": bool(data_cache),
            "last_check": api_health["last_check"],
            "error": api_health.get("error"),
        }
    ), 200


@app.route("/query", methods=["POST"])
def process_query():
    start = datetime.now()
    try:
        payload = request.get_json(silent=True) or {}
        query = str(payload.get("query", "")).strip()
        if not query:
            return jsonify(format_response(False, error="Query is required")), 400

        q_type, confidence = classify_query_type(query)

        if q_type == "denial_lookup":
            matches = search_denial_codes(query, top_k=5)
            data = {
                "type": "denial_explanation",
                "query_type": q_type,
                "confidence": round(confidence, 3),
                "query": query,
                "matches": matches,
                "recommendation": f"Found {len(matches)} matching denial codes" if matches else "No denial code match found.",
            }
        elif q_type == "member_lookup":
            data = member_response(query)
            data["query_type"] = q_type
            data["confidence"] = round(confidence, 3)
            data["query"] = query
        elif q_type == "plan_lookup":
            data = plan_response(query)
            data["query_type"] = q_type
            data["confidence"] = round(confidence, 3)
            data["query"] = query
        else:
            data = general_response(query)
            data["query_type"] = q_type
            data["query"] = query

        elapsed_ms = (datetime.now() - start).total_seconds() * 1000
        return jsonify(format_response(True, data=data, processing_time_ms=elapsed_ms)), 200
    except Exception as e:
        logger.error("Query processing failed: %s", e)
        logger.error(traceback.format_exc())
        elapsed_ms = (datetime.now() - start).total_seconds() * 1000
        return jsonify(format_response(False, error=str(e), processing_time_ms=elapsed_ms)), 500


@app.route("/recommendations", methods=["POST"])
def get_recommendations():
    try:
        payload = request.get_json(silent=True) or {}
        partial = str(payload.get("input", "")).strip().lower()
        limit = int(payload.get("limit", 5))
        limit = max(1, min(limit, 10))

        seed = [
            "What does denial code CO-45 mean?",
            "Why was claim denied with PR-96?",
            "Show member M12345 details",
            "Is dental covered for member M12345?",
            "What is the copay for member M12345?",
        ]
        candidates = list(seed)
        if training_data:
            candidates.extend([str(item.get("query", "")) for item in training_data if item.get("query")])

        if not partial:
            picks = []
            seen = set()
            for c in candidates:
                if c not in seen:
                    seen.add(c)
                    picks.append(c)
                if len(picks) >= limit:
                    break
            return jsonify({"success": True, "suggestions": picks, "count": len(picks)}), 200

        def score(text: str) -> int:
            t = text.lower()
            if t.startswith(partial):
                return 5
            if partial in t:
                return 3
            overlap = len(set(partial.split()) & set(t.split()))
            return overlap

        ranked = sorted(candidates, key=score, reverse=True)
        picks = []
        seen = set()
        for c in ranked:
            if c in seen:
                continue
            seen.add(c)
            picks.append(c)
            if len(picks) >= limit:
                break

        return jsonify({"success": True, "suggestions": picks, "count": len(picks)}), 200
    except Exception as e:
        return jsonify(format_response(False, error=str(e))), 500


@app.route("/train-status", methods=["GET"])
def train_status():
    return jsonify(
        {
            "model_loaded": ml_model is not None,
            "training_data_loaded": training_data is not None,
            "model_timestamp": (ml_model.get("timestamp") if ml_model else None),
            "data_sources": {
                "denial_codes": len(data_cache.get("denial_df", [])),
                "members": len(data_cache.get("member_df", [])),
                "plans": len(data_cache.get("plan_df", [])),
            },
        }
    ), 200


@app.route("/available-data", methods=["GET"])
def available_data():
    return jsonify(
        {
            "denial_codes": len(data_cache.get("denial_df", [])),
            "members": len(data_cache.get("member_df", [])),
            "plans": len(data_cache.get("plan_df", [])),
            "training_examples": len(training_data) if training_data else 0,
        }
    ), 200


# Initialize when imported (needed for gunicorn with --preload)
initialize_api()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5004))
    logger.info("Starting Flask API on port %d", port)
    app.run(host="0.0.0.0", port=port, debug=False)

