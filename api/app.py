from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from src.predict import (
    predict_url_details,
    suspicious_keyword_count,
    suspicious_tld_rule,
    typo_rule,
    subdomain_attack_rule,
    load_artifacts,
)
from src.preprocess import (
    clean_url,
    extract_registered_domain,
    extract_subdomain,
    brand_similarity_feature,
    brand_in_subdomain_feature,
    hyphen_density_feature,
    suspicious_combo_feature,
)


app = FastAPI(
    title="Phishing Website Detection API",
    description="Predict whether a URL is phishing or legitimate.",
    version="1.0.0",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
def home() -> str:
    """Simple HTML page for testing predictions from a browser."""
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Phishing URL Detector</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 720px;
                margin: 40px auto;
                padding: 20px;
                background: #f5f7fb;
                color: #1f2937;
            }
            .card {
                background: #ffffff;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
            }
            h1 {
                margin-top: 0;
            }
            input {
                width: 100%;
                padding: 12px;
                margin: 12px 0;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
            }
            button {
                background: #2563eb;
                color: white;
                border: none;
                padding: 12px 18px;
                border-radius: 8px;
                cursor: pointer;
            }
            button:hover {
                background: #1d4ed8;
            }
            #result {
                margin-top: 18px;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Phishing Website Detection</h1>
            <p>Enter a URL below to check whether it is phishing or legitimate.</p>
            <input id="urlInput" type="text" placeholder="Enter website URL" />
            <button onclick="checkUrl()">Predict</button>
            <p id="result"></p>
        </div>

        <script>
            async function checkUrl() {
                const url = document.getElementById("urlInput").value;
                const resultElement = document.getElementById("result");

                if (!url) {
                    resultElement.textContent = "Please enter a URL.";
                    return;
                }

                try {
                    const response = await fetch(`/predict?url=${encodeURIComponent(url)}`);
                    const data = await response.json();

                    if (!response.ok) {
                        resultElement.textContent = data.detail || "Prediction failed.";
                        return;
                    }

                    resultElement.textContent = `Prediction: ${data.prediction}`;
                } catch (error) {
                    resultElement.textContent = "Server error while predicting the URL.";
                }
            }
        </script>
    </body>
    </html>
    """


@app.get("/predict")
def predict(url: str = Query(..., description="URL to classify")) -> dict:
    """Predict whether the provided URL is phishing or legitimate and return XAI explainability metrics."""
    try:
        result = predict_url_details(url)
    except FileNotFoundError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except Exception as error:  # pragma: no cover - defensive API handling
        raise HTTPException(status_code=500, detail=f"Prediction failed: {error}") from error

    prediction = result["prediction"]
    probability = result["probability"]
    rule_triggered = result["rule_triggered"]

    # Calculate model name dynamically
    try:
        _, _, _, best_model = load_artifacts()
        model_cls_name = type(best_model).__name__
        if "RandomForest" in model_cls_name:
            model_name = "Random Forest"
        elif "XGB" in model_cls_name:
            model_name = "XGBoost"
        else:
            model_name = model_cls_name
    except Exception:
        model_name = "Random Forest"

    if prediction == "Invalid Input":
        return {
            "url": url,
            "prediction": "Invalid Input",
            "confidence": 0.0,
            "probability": 0.0,
            "risk_level": "Low",
            "model": model_name,
            "registered_domain": "",
            "subdomain": "",
            "detected_features": ["Invalid URL Format"],
            "features": {},
            "rule_triggered": "invalid_input"
        }

    # Extract URL components
    cleaned = clean_url(url)
    registered_dom = extract_registered_domain(cleaned)
    sub_dom = extract_subdomain(cleaned)

    # Compute URL properties
    url_len = len(cleaned)
    kw_count = suspicious_keyword_count(url)
    tld_susp = suspicious_tld_rule(url)
    typo_detected = typo_rule(cleaned)
    subdomain_attack = subdomain_attack_rule(cleaned)
    brand_subdomain = brand_in_subdomain_feature(cleaned) == 1.0
    brand_impersonation = brand_similarity_feature(cleaned) == 1.0 or brand_subdomain
    hyphen_count = cleaned.count("-")
    susp_combo = suspicious_combo_feature(cleaned) == 1.0

    # Map status indicators
    url_length_status = "warning" if url_len > 50 else "success"
    if url_len > 75:
        url_length_status = "danger"

    keywords_status = "danger" if kw_count >= 2 else ("warning" if kw_count == 1 else "success")
    brand_status = "danger" if brand_impersonation else "success"
    typo_status = "danger" if typo_detected else "success"
    subdomain_status = "danger" if subdomain_attack else "success"
    tld_status = "danger" if tld_susp else "success"
    hyphen_status = "danger" if hyphen_count >= 3 else ("warning" if hyphen_count >= 1 else "success")

    # Structure visual feature outputs
    features_dict = {
        "url_length": {
            "value": url_len,
            "status": url_length_status,
            "label": f"{url_len} characters",
            "description": "Longer URLs are often used to mask the actual destination domain."
        },
        "suspicious_keywords": {
            "value": kw_count,
            "status": keywords_status,
            "label": f"{kw_count} keyword(s) detected" if kw_count > 0 else "No phishing keywords",
            "description": "Presence of high-risk keywords associated with logins, verification, or banking."
        },
        "brand_impersonation": {
            "value": 1.0 if brand_impersonation else 0.0,
            "status": brand_status,
            "label": "Impersonation detected" if brand_impersonation else "No brand mismatch",
            "description": "Brand names placed in subdomains or unauthorized parts of the URL."
        },
        "typosquatting": {
            "value": 1.0 if typo_detected else 0.0,
            "status": typo_status,
            "label": "Potential typo domain" if typo_detected else "Correct brand spelling",
            "description": "Visual character substitutions (like g00gle) mimicking popular sites."
        },
        "subdomain_attack": {
            "value": 1.0 if subdomain_attack else 0.0,
            "status": subdomain_status,
            "label": "Subdomain attack pattern" if subdomain_attack else "Standard subdomain structure",
            "description": "Target brand hidden in subdomain while registered domain is unrelated."
        },
        "suspicious_tld": {
            "value": 1.0 if tld_susp else 0.0,
            "status": tld_status,
            "label": "Suspicious Top-Level Domain" if tld_susp else "Reputable TLD",
            "description": "Uses TLDs frequently abused by malicious actors (e.g., .xyz, .click, .top)."
        },
        "hyphen_density": {
            "value": hyphen_count,
            "status": hyphen_status,
            "label": f"{hyphen_count} hyphen(s) found",
            "description": "Attackers use multiple hyphens to simulate real brand domains (e.g., secure-login-paypal)."
        },
        "registered_domain": {
            "value": registered_dom if registered_dom else "None (IP/Local)",
            "status": "success" if registered_dom else "warning",
            "label": registered_dom if registered_dom else "No public registered domain",
            "description": "The base domain identity registered with a public registrar."
        }
    }

    # Compile explanation list
    detected_features = []
    if tld_susp:
        detected_features.append("Suspicious TLD")
    if brand_impersonation:
        detected_features.append("Brand Impersonation")
    if typo_detected:
        detected_features.append("Typosquatting")
    if subdomain_attack:
        detected_features.append("Subdomain Attack")
    if hyphen_count >= 2:
        detected_features.append("Multiple Hyphens")
    if kw_count >= 1:
        detected_features.append("Suspicious Keywords")
    if susp_combo:
        detected_features.append("Suspicious Keyword Combination")

    # Map threat risk level and calculate confidence percent
    if prediction == "Legitimate":
        risk_level = "Medium" if probability > 0.35 else "Low"
        confidence = (1.0 - probability) * 100.0
    elif prediction == "Uncertain":
        risk_level = "Medium"
        confidence = max(probability, 1.0 - probability) * 100.0
    else:  # Phishing
        risk_level = "Critical" if (probability >= 0.85 or rule_triggered in ("subdomain_attack_rule", "strong_phishing_rule")) else "High"
        if rule_triggered not in ("none", "low_confidence"):
            # Heuristics override: very high certainty
            confidence = 95.0 + (probability * 4.9)
        else:
            confidence = probability * 100.0

    return {
        "url": url,
        "prediction": prediction,
        "confidence": round(confidence, 2),
        "probability": round(probability, 4),
        "risk_level": risk_level,
        "model": model_name,
        "registered_domain": registered_dom,
        "subdomain": sub_dom,
        "detected_features": detected_features,
        "features": features_dict,
        "rule_triggered": rule_triggered
    }
