from __future__ import annotations

import logging
import pickle
from pathlib import Path
from typing import Any

import numpy as np

from src.preprocess import (
    SUSPICIOUS_KEYWORDS,
    PHISHING_SCORE_KEYWORDS,
    SUSPICIOUS_TLDS,
    brand_similarity_feature,
    BRAND_NAMES,
    brand_in_subdomain_feature,
    clean_url,
    extract_host,
    extract_registered_domain,
    extract_subdomain,
    extract_url_features,
    is_valid_public_url_like,
    normalized_brand_match_feature,
    obvious_typosquat_feature,
)


logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
LOGGER = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = BASE_DIR / "models"
UNCERTAIN_THRESHOLD = 0.55
RULE_OVERRIDE_MAX_LEGIT_CONFIDENCE = 0.80


def load_pickle(file_path: Path) -> Any:
    """Load a pickle file from disk."""
    if not file_path.exists():
        raise FileNotFoundError(
            f"Required model artifact not found: {file_path}. "
            "Please train the model first by running 'python -m src.train'."
        )

    with open(file_path, "rb") as file:
        return pickle.load(file)


def load_artifacts() -> tuple[Any, Any, Any]:
    """Load the vectorizer, URL feature scaler bundle, selector, and best trained model."""
    vectorizer = load_pickle(MODEL_DIR / "vectorizer.pkl")
    scaler_bundle = load_pickle(MODEL_DIR / "scaler.pkl")
    selector = load_pickle(MODEL_DIR / "selector.pkl")
    model = load_pickle(MODEL_DIR / "best_model.pkl")

    if not isinstance(scaler_bundle, dict) or "scaler" not in scaler_bundle or "shift_vector" not in scaler_bundle:
        raise ValueError("Saved scaler artifact is invalid. Please retrain the model.")

    return vectorizer, scaler_bundle, selector, model


def suspicious_keyword_count(url: str) -> int:
    """Count suspicious phishing keywords in a cleaned URL."""
    cleaned = clean_url(url)
    return sum(keyword in cleaned for keyword in SUSPICIOUS_KEYWORDS)


def suspicious_tld_rule(url: str) -> bool:
    """Check whether the host uses a suspicious TLD."""
    host = extract_host(url)
    return any(host.endswith(tld) for tld in SUSPICIOUS_TLDS)


def strong_phishing_rule(url: str) -> bool:
    """High-confidence rule for keyword-heavy suspicious domains."""
    return suspicious_keyword_count(url) >= 2 and suspicious_tld_rule(url)


def typo_rule(url: str) -> bool:
    """High-confidence typo-squatting rule."""
    return any(
        feature(url) == 1.0
        for feature in (obvious_typosquat_feature, normalized_brand_match_feature, brand_similarity_feature)
    )


def subdomain_attack_rule(url: str) -> bool:
    """
    Flag URLs that hide a trusted brand in the subdomain while the actual
    registered domain belongs to something else.
    """
    main_domain = extract_registered_domain(url)
    subdomain = extract_subdomain(url)
    if not main_domain or not subdomain:
        return False

    for brand in BRAND_NAMES:
        if brand in subdomain and brand not in main_domain:
            return True

    return False


def predict_url_details(url: Any) -> dict[str, Any]:
    """
    Predict whether a URL is phishing, legitimate, uncertain, or invalid.

    This helper keeps the inference pipeline explicit and exposes probability
    and triggered safeguards for debugging and API use.
    """
    if not isinstance(url, str):
        return {
            "url": url,
            "cleaned_url": "",
            "prediction": "Invalid Input",
            "probability": None,
            "rule_triggered": "invalid_input",
        }

    vectorizer, scaler_bundle, selector, model = load_artifacts()

    cleaned_url = clean_url(url)
    if not cleaned_url or not is_valid_public_url_like(cleaned_url):
        return {
            "url": url,
            "cleaned_url": cleaned_url,
            "prediction": "Invalid Input",
            "probability": None,
            "rule_triggered": "invalid_input",
        }

    LOGGER.info("Predicting URL: %s", cleaned_url)

    tfidf_features = vectorizer.transform([cleaned_url]).toarray()
    url_features = extract_url_features(cleaned_url).reshape(1, -1)
    scaled_url_features = scaler_bundle["scaler"].transform(url_features)
    non_negative_url_features = scaled_url_features + scaler_bundle["shift_vector"]
    combined_features = np.hstack((tfidf_features, non_negative_url_features))
    selected_features = selector.transform(combined_features)
    phishing_probability = float(model.predict_proba(selected_features)[0][1])
    model_prediction = int(phishing_probability >= 0.5)
    model_confidence = max(phishing_probability, 1.0 - phishing_probability)

    strong_rule_triggered = strong_phishing_rule(cleaned_url)
    typo_rule_triggered = typo_rule(cleaned_url)
    subdomain_rule_triggered = subdomain_attack_rule(cleaned_url) or brand_in_subdomain_feature(cleaned_url) == 1.0
    triggered_rule = "none"

    if subdomain_rule_triggered:
        final_prediction = "Phishing"
        triggered_rule = "subdomain_attack_rule"
    elif keyword_phishing_rule(cleaned_url) and phishing_probability < 0.85:
        final_prediction = "Phishing"
        triggered_rule = "keyword_phishing_rule"
    elif (strong_rule_triggered or typo_rule_triggered) and phishing_probability < RULE_OVERRIDE_MAX_LEGIT_CONFIDENCE:
        final_prediction = "Phishing"
        triggered_rule = "typo_rule" if typo_rule_triggered else "strong_phishing_rule"
    elif model_confidence < UNCERTAIN_THRESHOLD:
        final_prediction = "Uncertain"
        triggered_rule = "low_confidence"
    else:
        final_prediction = "Phishing" if model_prediction == 1 else "Legitimate"

    LOGGER.info(
        "Model probability: %.4f | rule: %s | final prediction: %s",
        phishing_probability,
        triggered_rule,
        final_prediction,
    )

    return {
        "url": url,
        "cleaned_url": cleaned_url,
        "prediction": final_prediction,
        "probability": phishing_probability,
        "rule_triggered": triggered_rule,
    }


def predict_url(url: Any) -> str:
    """Backward-compatible prediction wrapper used by the API."""
    return predict_url_details(url)["prediction"]


def keyword_phishing_rule(url: str) -> bool:
    """
    Flag URLs with multiple strong phishing intent keywords.

    This acts as a safety net for domains like `secure-access-portal.org`
    or `user-auth-portal.net`, where structure matters even without a bad TLD.
    """
    cleaned = clean_url(url)
    keywords = ["login", "secure", "verify", "account", "auth", "portal"]
    count = sum(1 for keyword in keywords if keyword in cleaned)
    return count >= 2


def run_validation_suite() -> None:
    """Run a small inference smoke test over important edge cases."""
    test_urls = [
        "google.com",
        "secure-login-google.com",
        "g00gle.com",
        "paypa1.com",
        "login.google.com.evil.xyz",
        "secure.paypal.com.fake.site",
        "secure-access-portal.org",
        "user-auth-portal.net",
        "update-bank-password.click",
        "",
        "abc",
        "http://127.0.0.1",
    ]

    print("\nValidation Suite")
    print("-" * 50)
    for test_url in test_urls:
        result = predict_url_details(test_url)
        print(
            f"{test_url!r} -> {result['prediction']} "
            f"(probability={result['probability']}, rule={result['rule_triggered']})"
        )


if __name__ == "__main__":
    run_validation_suite()
