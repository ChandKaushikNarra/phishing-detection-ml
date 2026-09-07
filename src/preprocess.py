from __future__ import annotations

from difflib import SequenceMatcher
import ipaddress
import re
from typing import Iterable

import numpy as np
import tldextract


SUSPICIOUS_KEYWORDS = [
    "login",
    "verify",
    "secure",
    "update",
    "account",
    "bank",
    "paypal",
]

SUSPICIOUS_TLDS = [".xyz", ".click", ".top", ".gq"]
BRAND_NAMES = ["google", "paypal", "amazon", "facebook", "microsoft"]
PHISHING_SCORE_KEYWORDS = [
    "login",
    "secure",
    "verify",
    "update",
    "account",
    "bank",
    "password",
    "auth",
]
SUSPICIOUS_COMBO_PATTERNS = [
    "secure-login",
    "account-login",
    "verify-account",
    "update-password",
    "auth-portal",
]
TYPO_SUBSTITUTIONS = str.maketrans(
    {
        "0": "o",
        "1": "l",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "@": "a",
    }
)


def clean_url(url: str) -> str:
    """
    Clean a URL before feature extraction.

    Steps:
    - convert to lowercase
    - remove protocol prefixes
    - remove leading www.
    - strip extra spaces
    - remove some unnecessary separator symbols while preserving URL structure
    """
    if not isinstance(url, str):
        url = ""

    cleaned = url.strip().lower()
    cleaned = re.sub(r"^https?://", "", cleaned)
    cleaned = re.sub(r"^www\.", "", cleaned)
    cleaned = re.sub(r"\s+", "", cleaned)
    cleaned = re.sub(r"[\"'`<>]", "", cleaned)
    return cleaned


def extract_host(url: str) -> str:
    """Extract the host portion of a URL-like string."""
    cleaned = clean_url(url)
    return cleaned.split("/", 1)[0].split("?", 1)[0].split("#", 1)[0]


def extract_registered_domain(url: str) -> str:
    """
    Extract the registered domain using tldextract.

    Examples:
    - login.google.com.evil.xyz -> evil.xyz
    - secure.paypal.com.fake.site -> fake.site
    """
    host = extract_host(url)
    if not host or host == "localhost" or is_ip_address(host):
        return ""

    ext = tldextract.extract(host)
    if not ext.domain or not ext.suffix:
        return ""

    return f"{ext.domain}.{ext.suffix}"


def extract_subdomain(url: str) -> str:
    """Extract the full subdomain portion using tldextract."""
    host = extract_host(url)
    if not host or host == "localhost" or is_ip_address(host):
        return ""

    ext = tldextract.extract(host)
    return ext.subdomain or ""


def is_ip_address(host: str) -> bool:
    """Return True when the host is an IPv4/IPv6 address."""
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def is_valid_public_url_like(url: str) -> bool:
    """
    Validate that the input looks like a public web URL or domain.

    This keeps obviously invalid or local-only inputs from going through the
    phishing pipeline.
    """
    cleaned = clean_url(url)
    if not cleaned:
        return False

    host = extract_host(cleaned)
    if not host or host == "localhost" or is_ip_address(host):
        return False

    return "." in host


def extract_domain_name(url: str) -> str:
    """
    Extract the main domain token for typo-brand analysis.

    Example:
    - secure-login-google.com -> secure-login-google
    - www.paypa1.com/account -> paypa1
    """
    registered_domain = extract_registered_domain(url)
    if not registered_domain:
        return ""

    return registered_domain.split(".", 1)[0]


def normalize_visual_typos(text: str) -> str:
    """
    Normalize common character substitutions used in typo-squatting.

    Examples:
    - g00gle -> google
    - paypa1 -> paypal
    - amaz0n -> amazon
    """
    return text.translate(TYPO_SUBSTITUTIONS)


def brand_similarity_feature(url: str) -> float:
    """
    Detect suspicious typo-brand domains using string similarity.

    If a domain looks very similar to a known brand but does not contain the
    exact brand token, it is likely a typo-squatting attempt.
    """
    domain = extract_domain_name(url)
    if not domain:
        return 0.0

    for brand in BRAND_NAMES:
        similarity = SequenceMatcher(None, domain, brand).ratio()
        normalized_similarity = SequenceMatcher(None, normalize_visual_typos(domain), brand).ratio()
        if max(similarity, normalized_similarity) > 0.75 and brand not in domain:
            return 1.0

    return 0.0


def levenshtein_distance(source: str, target: str) -> int:
    """Compute a small edit distance without adding external dependencies."""
    if source == target:
        return 0
    if not source:
        return len(target)
    if not target:
        return len(source)

    previous_row = list(range(len(target) + 1))
    for i, source_char in enumerate(source, start=1):
        current_row = [i]
        for j, target_char in enumerate(target, start=1):
            insert_cost = current_row[j - 1] + 1
            delete_cost = previous_row[j] + 1
            replace_cost = previous_row[j - 1] + (source_char != target_char)
            current_row.append(min(insert_cost, delete_cost, replace_cost))
        previous_row = current_row

    return previous_row[-1]


def edit_distance_feature(url: str) -> float:
    """
    Mark domains that are only a few edits away from known brands.

    This is especially useful for `g00gle`, `paypa1`, or `amaz0n` style URLs.
    """
    domain = extract_domain_name(url)
    if not domain:
        return 0.0

    for brand in BRAND_NAMES:
        if domain == brand:
            continue
        normalized_domain = normalize_visual_typos(domain)
        if levenshtein_distance(domain, brand) <= 2 or levenshtein_distance(normalized_domain, brand) <= 2:
            return 1.0

    return 0.0


def normalized_brand_match_feature(url: str) -> float:
    """
    Detect visual typo domains that become a known brand after normalization.

    This specifically boosts cases like `paypa1` and `amaz0n`, where the raw
    domain differs from the brand but the visual intent is obvious.
    """
    domain = extract_domain_name(url)
    if not domain:
        return 0.0

    normalized_domain = normalize_visual_typos(domain)
    for brand in BRAND_NAMES:
        if domain != brand and normalized_domain == brand:
            return 1.0

    return 0.0


def obvious_typosquat_feature(url: str) -> float:
    """
    Flag high-confidence visual typo-squatting domains.

    This catches cases where the normalized domain maps directly to a known
    brand while the raw domain still differs, such as `paypa1` -> `paypal`.
    """
    domain = extract_domain_name(url)
    if not domain:
        return 0.0

    normalized_domain = normalize_visual_typos(domain)
    contains_number = any(char.isdigit() for char in domain)

    for brand in BRAND_NAMES:
        if domain != brand and normalized_domain == brand and contains_number:
            return 1.0

    return 0.0


def brand_in_subdomain_feature(url: str) -> float:
    """
    Detect brand names hidden inside subdomains.

    Example:
    - login.google.com.evil.xyz -> subdomain contains google
    - secure.paypal.com.fake.site -> subdomain contains paypal
    """
    subdomain = extract_subdomain(url)
    if not subdomain:
        return 0.0

    for brand in BRAND_NAMES:
        if brand in subdomain:
            return 1.0

    return 0.0


def phishing_keyword_score(url: str) -> float:
    """Count high-risk phishing keywords in the cleaned URL."""
    cleaned = clean_url(url)
    score = 0
    for word in PHISHING_SCORE_KEYWORDS:
        if word in cleaned:
            score += 1
    return float(score)


def hyphen_density_feature(url: str) -> float:
    """Count hyphens, which often appear heavily in phishing domains."""
    cleaned = clean_url(url)
    return float(cleaned.count("-"))


def suspicious_combo_feature(url: str) -> float:
    """Flag especially suspicious keyword combinations often seen in phishing links."""
    cleaned = clean_url(url)
    for pattern in SUSPICIOUS_COMBO_PATTERNS:
        if pattern in cleaned:
            return 1.0
    return 0.0


def extract_url_features(url: str) -> np.ndarray:
    """
    Extract simple handcrafted URL features to help detect real-world phishing.

    These features complement TF-IDF by capturing URL structure and suspicious
    patterns such as hyphens, subdomains, risky TLDs, and brand impersonation.
    """
    cleaned = clean_url(url)
    parts = [part for part in cleaned.split(".") if part]

    feature_vector = [
        len(cleaned),
        cleaned.count("."),
        cleaned.count("-"),
        sum(keyword in cleaned for keyword in SUSPICIOUS_KEYWORDS),
        int(any(char.isdigit() for char in cleaned)),
        max(len(parts) - 2, 0),
        int(any(cleaned.endswith(tld) or tld + "/" in cleaned for tld in SUSPICIOUS_TLDS)),
        sum(brand in cleaned for brand in BRAND_NAMES),
        brand_similarity_feature(cleaned),
        edit_distance_feature(cleaned),
        normalized_brand_match_feature(cleaned),
        obvious_typosquat_feature(cleaned),
        brand_in_subdomain_feature(cleaned),
        phishing_keyword_score(cleaned),
        hyphen_density_feature(cleaned),
        suspicious_combo_feature(cleaned),
    ]

    return np.array(feature_vector, dtype=float)


def extract_url_features_batch(urls: Iterable[str]) -> np.ndarray:
    """Extract handcrafted features for a list of URLs."""
    return np.vstack([extract_url_features(url) for url in urls])
