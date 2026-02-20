"""
Training pipeline for CSR Denial Knowledge Bot.

Upgrades:
- Hybrid denial retrieval index (code-aware + TF-IDF semantic retrieval)
- Intent classifier (denial/member/plan/general) using LogisticRegression
- Structured training artifact for direct API consumption
"""

from __future__ import annotations

import json
import logging
import pickle
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "datasets"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)


def normalize_code(user_code: str, denial_code: str | int) -> str:
    uc = str(user_code).strip().upper()
    dc = str(denial_code).strip()
    return f"{uc}{dc}"


def build_denial_corpus(denial_df: pd.DataFrame) -> Tuple[List[Dict], List[str]]:
    records = []
    docs = []

    for _, row in denial_df.iterrows():
        code = normalize_code(row["user_code"], row["denial_code"])
        numeric = str(row["denial_code"]).strip()
        description = str(row["description"]).strip()
        action = str(row["suggested_action"]).strip()
        aliases = [code, f"{row['user_code']}-{numeric}", f"{row['user_code']} {numeric}", numeric]

        records.append(
            {
                "code": code,
                "user_code": str(row["user_code"]).strip().upper(),
                "denial_code": numeric,
                "description": description,
                "action": action,
                "aliases": aliases,
            }
        )

        doc = " ".join([code, *aliases, description, action])
        docs.append(doc.lower())

    return records, docs


def get_general_qa_pairs() -> List[Dict[str, str]]:
    return [
        {
            "query": "hi",
            "answer": "Hi. I can help with denial codes, member lookup, and plan coverage checks.",
            "topic": "greeting",
        },
        {
            "query": "hello",
            "answer": "Hello. Ask me a denial code or a member coverage question and I will return structured details.",
            "topic": "greeting",
        },
        {
            "query": "hey",
            "answer": "Hey. You can ask things like Explain CO-45 or Is dental covered for member M12345?",
            "topic": "greeting",
        },
        {
            "query": "what can you do",
            "answer": "I can explain denial codes, check member details, and verify plan coverage for a member ID.",
            "topic": "capabilities",
        },
        {
            "query": "how do i use this bot",
            "answer": "Ask a denial code question, or include a member ID like M12345 for member and coverage lookup.",
            "topic": "usage",
        },
        {
            "query": "what information do you need for coverage",
            "answer": "Please provide a member ID and the service you want to check, for example: Is dental covered for member M12345?",
            "topic": "usage",
        },
        {
            "query": "how do i check denial code",
            "answer": "Ask directly with a code, for example: Explain CO-45 or Why was claim denied with PR-96?",
            "topic": "denial",
        },
        {
            "query": "how do i check member status",
            "answer": "Use a query like: Show member M12345 details or Is member M12345 active?",
            "topic": "member",
        },
        {
            "query": "what is a denial code",
            "answer": "A denial code explains why a claim was denied or adjusted and usually includes a corrective next step.",
            "topic": "denial",
        },
        {
            "query": "what is copay",
            "answer": "Copay is the fixed amount a member pays for a covered service, based on their plan terms.",
            "topic": "coverage",
        },
        {
            "query": "what if member not found",
            "answer": "Verify the member ID format and try again with a valid ID such as M12345.",
            "topic": "troubleshooting",
        },
        {
            "query": "how do i troubleshoot no response",
            "answer": "Check that backend and ML API are running, then retry the query with a clear denial code or member ID.",
            "topic": "troubleshooting",
        },
        {
            "query": "help",
            "answer": "You can ask about denial codes, member details, or plan coverage. I will return structured JSON responses.",
            "topic": "help",
        },
    ]


def generate_intent_examples(
    denial_df: pd.DataFrame, member_df: pd.DataFrame, plan_df: pd.DataFrame
) -> List[Dict[str, str]]:
    examples: List[Dict[str, str]] = []

    denial_templates = [
        "what does denial code {code} mean",
        "why was claim denied with {code}",
        "explain {code}",
        "next step for denial {code}",
        "resolve denial code {code}",
    ]

    for _, row in denial_df.iterrows():
        code = normalize_code(row["user_code"], row["denial_code"])
        dashed = f"{row['user_code']}-{row['denial_code']}"
        numeric = str(row["denial_code"])
        for tpl in denial_templates:
            examples.append({"query": tpl.format(code=code), "type": "denial_lookup"})
            examples.append({"query": tpl.format(code=dashed), "type": "denial_lookup"})
            examples.append({"query": tpl.format(code=numeric), "type": "denial_lookup"})

    member_templates = [
        "show member {member_id}",
        "member details for {member_id}",
        "is member {member_id} active",
        "lookup {member_name}",
    ]
    for _, row in member_df.iterrows():
        for tpl in member_templates:
            examples.append(
                {
                    "query": tpl.format(member_id=row["member_id"], member_name=row["member_name"]),
                    "type": "member_lookup",
                }
            )

    plan_templates = [
        "is {service} covered for member {member_id}",
        "coverage details for member {member_id}",
        "what is copay for member {member_id}",
        "plan coverage for {member_name}",
    ]
    services = sorted(
        {s.strip().lower() for v in plan_df["covered_services"] for s in str(v).split(",") if s.strip()}
    )
    for _, row in member_df.iterrows():
        for service in services[:8]:
            examples.append(
                {
                    "query": plan_templates[0].format(service=service, member_id=row["member_id"]),
                    "type": "plan_lookup",
                }
            )
        examples.append({"query": plan_templates[1].format(member_id=row["member_id"]), "type": "plan_lookup"})
        examples.append({"query": plan_templates[2].format(member_id=row["member_id"]), "type": "plan_lookup"})
        examples.append(
            {"query": plan_templates[3].format(member_name=row["member_name"]), "type": "plan_lookup"}
        )

    general_examples = [
        "hi",
        "hello",
        "hey",
        "help me",
        "thanks",
        "good morning",
        "how does this bot work",
        "how to use this",
        "guide me",
        "what are you",
    ]
    general_examples.extend(pair["query"] for pair in get_general_qa_pairs())
    examples.extend({"query": q, "type": "general"} for q in general_examples)

    return examples


@dataclass
class TrainArtifacts:
    intent_vectorizer: TfidfVectorizer
    intent_model: LogisticRegression
    denial_vectorizer: TfidfVectorizer
    denial_matrix: object
    denial_records: List[Dict]
    general_vectorizer: TfidfVectorizer
    general_matrix: object
    general_pairs: List[Dict]
    metrics: Dict
    training_data: List[Dict]
    service_catalog: List[str]


def train_pipeline() -> TrainArtifacts:
    denial_df = pd.read_csv(DATA_DIR / "denial_reason.csv")
    member_df = pd.read_csv(DATA_DIR / "member_subscription.csv")
    plan_df = pd.read_csv(DATA_DIR / "plan_coverage.csv")

    denial_records, denial_docs = build_denial_corpus(denial_df)

    denial_vectorizer = TfidfVectorizer(
        max_features=5000, ngram_range=(1, 3), lowercase=True, analyzer="word"
    )
    denial_matrix = denial_vectorizer.fit_transform(denial_docs)

    training_data = generate_intent_examples(denial_df, member_df, plan_df)
    general_pairs = get_general_qa_pairs()
    x = [item["query"] for item in training_data]
    y = [item["type"] for item in training_data]

    intent_vectorizer = TfidfVectorizer(
        max_features=4000, ngram_range=(1, 2), lowercase=True, analyzer="word"
    )
    x_vec = intent_vectorizer.fit_transform(x)

    x_train, x_test, y_train, y_test = train_test_split(
        x_vec, y, test_size=0.2, random_state=42, stratify=y
    )
    intent_model = LogisticRegression(max_iter=2000, class_weight="balanced")
    intent_model.fit(x_train, y_train)

    general_vectorizer = TfidfVectorizer(max_features=1500, ngram_range=(1, 2), lowercase=True)
    general_matrix = general_vectorizer.fit_transform([item["query"] for item in general_pairs])

    preds = intent_model.predict(x_test)
    metrics = {
        "test_accuracy": float(accuracy_score(y_test, preds)),
        "class_report": classification_report(y_test, preds, output_dict=True),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "num_training_examples": len(training_data),
        "num_denial_codes": int(len(denial_records)),
        "num_members": int(len(member_df)),
        "num_plans": int(len(plan_df)),
    }

    services = sorted(
        {s.strip().lower() for v in plan_df["covered_services"] for s in str(v).split(",") if s.strip()}
    )

    return TrainArtifacts(
        intent_vectorizer=intent_vectorizer,
        intent_model=intent_model,
        denial_vectorizer=denial_vectorizer,
        denial_matrix=denial_matrix,
        denial_records=denial_records,
        general_vectorizer=general_vectorizer,
        general_matrix=general_matrix,
        general_pairs=general_pairs,
        metrics=metrics,
        training_data=training_data,
        service_catalog=services,
    )


def save_artifacts(artifacts: TrainArtifacts) -> None:
    model_path = MODEL_DIR / "ml_model.pkl"
    payload = {
        "intent_vectorizer": artifacts.intent_vectorizer,
        "intent_model": artifacts.intent_model,
        "denial_vectorizer": artifacts.denial_vectorizer,
        "denial_matrix": artifacts.denial_matrix,
        "denial_records": artifacts.denial_records,
        "general_vectorizer": artifacts.general_vectorizer,
        "general_matrix": artifacts.general_matrix,
        "general_pairs": artifacts.general_pairs,
        "service_catalog": artifacts.service_catalog,
        "timestamp": artifacts.metrics["trained_at"],
    }

    with model_path.open("wb") as f:
        pickle.dump(payload, f)
    logger.info("Saved model: %s", model_path)

    training_json = MODEL_DIR / "training_data.json"
    with training_json.open("w", encoding="utf-8") as f:
        json.dump(artifacts.training_data, f, indent=2)
    logger.info("Saved training examples: %s", training_json)

    metrics_json = MODEL_DIR / "metrics.json"
    with metrics_json.open("w", encoding="utf-8") as f:
        json.dump(artifacts.metrics, f, indent=2)
    logger.info("Saved metrics: %s", metrics_json)


def quick_smoke_test(model_path: Path) -> None:
    with model_path.open("rb") as f:
        model = pickle.load(f)

    intent_vectorizer: TfidfVectorizer = model["intent_vectorizer"]
    intent_model: LogisticRegression = model["intent_model"]
    denial_vectorizer: TfidfVectorizer = model["denial_vectorizer"]
    denial_matrix = model["denial_matrix"]
    denial_records = model["denial_records"]

    tests = [
        "what does CO-45 mean",
        "show member M12345",
        "is dental covered for member M12345",
        "hello",
    ]
    for query in tests:
        xq = intent_vectorizer.transform([query])
        label = intent_model.predict(xq)[0]
        probs = intent_model.predict_proba(xq)[0]
        conf = float(np.max(probs))

        dq = denial_vectorizer.transform([query])
        sims = (dq @ denial_matrix.T).toarray()[0]
        best_idx = int(np.argmax(sims))
        best_code = denial_records[best_idx]["code"]
        best_score = float(sims[best_idx])

        logger.info("Query=%s | intent=%s (%.3f) | best_denial=%s (%.3f)", query, label, conf, best_code, best_score)


if __name__ == "__main__":
    logger.info("Starting model training")
    artifacts = train_pipeline()
    save_artifacts(artifacts)
    quick_smoke_test(MODEL_DIR / "ml_model.pkl")
    logger.info("Training complete")
